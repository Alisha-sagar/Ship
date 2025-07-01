import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Record a swipe action
export const swipe = mutation({
  args: {
    swipedUserId: v.id("users"),
    action: v.union(v.literal("like"), v.literal("dislike")),
  },
  handler: async (ctx, args) => {
    const swiperId = await getAuthUserId(ctx);
    if (!swiperId) throw new Error("Not authenticated");

    if (swiperId === args.swipedUserId) {
      throw new Error("Cannot swipe on yourself");
    }

    // Check if already swiped
    const existingSwipe = await ctx.db
      .query("swipes")
      .withIndex("by_swiper_and_swiped", (q) => 
        q.eq("swiperId", swiperId).eq("swipedUserId", args.swipedUserId)
      )
      .unique();

    if (existingSwipe) {
      throw new Error("Already swiped on this user");
    }

    // Record the swipe
    await ctx.db.insert("swipes", {
      swiperId,
      swipedUserId: args.swipedUserId,
      action: args.action,
      timestamp: Date.now(),
    });

    // If it's a like, check if the other user also liked (create match)
    if (args.action === "like") {
      const reciprocalSwipe = await ctx.db
        .query("swipes")
        .withIndex("by_swiper_and_swiped", (q) => 
          q.eq("swiperId", args.swipedUserId).eq("swipedUserId", swiperId)
        )
        .unique();

      if (reciprocalSwipe && reciprocalSwipe.action === "like") {
        // Create a match
        const [user1Id, user2Id] = swiperId < args.swipedUserId 
          ? [swiperId, args.swipedUserId] 
          : [args.swipedUserId, swiperId];
        
        const existingMatch = await ctx.db
          .query("matches")
          .withIndex("by_users", (q) => 
            q.eq("user1Id", user1Id).eq("user2Id", user2Id)
          )
          .unique();

        if (!existingMatch) {
          await ctx.db.insert("matches", {
            user1Id,
            user2Id,
            matchedAt: Date.now(),
            isActive: true,
          });
        }
      }
    }

    return { success: true };
  },
});

// Get user's matches
export const getMatches = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get matches where user is either user1 or user2
    const matches1 = await ctx.db
      .query("matches")
      .withIndex("by_user1", (q) => q.eq("user1Id", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const matches2 = await ctx.db
      .query("matches")
      .withIndex("by_user2", (q) => q.eq("user2Id", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const allMatches = [...matches1, ...matches2];

    // Get profile information for each match
    const matchesWithProfiles = await Promise.all(
      allMatches.map(async (match) => {
        const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
        
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", otherUserId))
          .unique();

        if (!profile) return null;

        // Get the first photo URL
        const firstPhotoUrl = profile.photos.length > 0 
          ? await ctx.storage.getUrl(profile.photos[0])
          : null;

        // Get last message in this match
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .order("desc")
          .first();

        return {
          ...match,
          otherUser: {
            ...profile,
            firstPhoto: firstPhotoUrl,
          },
          lastMessage,
          hasMessages: !!lastMessage,
        };
      })
    );

    return matchesWithProfiles.filter((match): match is NonNullable<typeof match> => match !== null)
      .sort((a, b) => b.matchedAt - a.matchedAt);
  },
});
