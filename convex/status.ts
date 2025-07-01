import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create a status update
export const createStatus = mutation({
  args: {
    mediaId: v.id("_storage"),
    mediaType: v.union(v.literal("photo"), v.literal("video")),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

    await ctx.db.insert("statusUpdates", {
      userId,
      mediaId: args.mediaId,
      mediaType: args.mediaType,
      caption: args.caption,
      createdAt: now,
      expiresAt,
      isActive: true,
    });

    return { success: true };
  },
});

// Get active status updates from matches
export const getMatchesStatuses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get user's matches
    const matches1 = await ctx.db
      .query("matches")
      .withIndex("by_user1", (q: any) => q.eq("user1Id", userId))
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .collect();

    const matches2 = await ctx.db
      .query("matches")
      .withIndex("by_user2", (q: any) => q.eq("user2Id", userId))
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .collect();

    const allMatches = [...matches1, ...matches2];
    const matchedUserIds = allMatches.map(match => 
      match.user1Id === userId ? match.user2Id : match.user1Id
    );

    // Get active statuses from matched users
    const now = Date.now();
    const activeStatuses = await ctx.db
      .query("statusUpdates")
      .withIndex("by_active", (q: any) => q.eq("isActive", true))
      .filter((q: any) => q.gt(q.field("expiresAt"), now))
      .collect();

    const matchedStatuses = activeStatuses.filter(status => 
      matchedUserIds.includes(status.userId)
    );

    // Get user profiles and media URLs
    const statusesWithData = await Promise.all(
      matchedStatuses.map(async (status) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q: any) => q.eq("userId", status.userId))
          .unique();

        const mediaUrl = await ctx.storage.getUrl(status.mediaId);

        // Check if current user has viewed this status
        const hasViewed = await ctx.db
          .query("statusViews")
          .withIndex("by_status", (q: any) => q.eq("statusId", status._id))
          .filter((q: any) => q.eq(q.field("viewerId"), userId))
          .unique();

        return {
          ...status,
          userName: profile?.name || "Unknown",
          userPhoto: profile?.photos.length ? await ctx.storage.getUrl(profile.photos[0]) : null,
          mediaUrl,
          hasViewed: !!hasViewed,
        };
      })
    );

    return statusesWithData.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// View a status
export const viewStatus = mutation({
  args: {
    statusId: v.id("statusUpdates"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already viewed
    const existingView = await ctx.db
      .query("statusViews")
      .withIndex("by_status", (q: any) => q.eq("statusId", args.statusId))
      .filter((q: any) => q.eq(q.field("viewerId"), userId))
      .unique();

    if (!existingView) {
      await ctx.db.insert("statusViews", {
        statusId: args.statusId,
        viewerId: userId,
        viewedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Get current user's statuses
export const getMyStatuses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const now = Date.now();
    const statuses = await ctx.db
      .query("statusUpdates")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gt(q.field("expiresAt"), now))
      .order("desc")
      .collect();

    const statusesWithData = await Promise.all(
      statuses.map(async (status) => {
        const mediaUrl = await ctx.storage.getUrl(status.mediaId);
        
        // Get view count
        const views = await ctx.db
          .query("statusViews")
          .withIndex("by_status", (q: any) => q.eq("statusId", status._id))
          .collect();

        return {
          ...status,
          mediaUrl,
          viewCount: views.length,
        };
      })
    );

    return statusesWithData;
  },
});

// Delete status
export const deleteStatus = mutation({
  args: {
    statusId: v.id("statusUpdates"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const status = await ctx.db.get(args.statusId);
    if (!status || status.userId !== userId) {
      throw new Error("Status not found or not authorized");
    }

    await ctx.db.patch(args.statusId, { isActive: false });
    return { success: true };
  },
});
