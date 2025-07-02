import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Unicode-safe Base64 encode/decode helpers (btoa/atob compatible) */
function encodeBase64Unicode(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

function decodeBase64Unicode(str: string): string {
  return decodeURIComponent(
    Array.prototype.map
      .call(atob(str), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

// Send a message
export const sendMessage = mutation({
  args: {
    matchId: v.id("matches"),
    content: v.string(),
    messageType: v.union(v.literal("text"), v.literal("image"), v.literal("emoji")),
    attachmentId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const senderId = await getAuthUserId(ctx);
    if (!senderId) throw new Error("Not authenticated");

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");

    if (match.user1Id !== senderId && match.user2Id !== senderId) {
      throw new Error("Not authorized to send message in this match");
    }

    const receiverId = match.user1Id === senderId ? match.user2Id : match.user1Id;

    const encryptedContent = encodeBase64Unicode(args.content);

    await ctx.db.insert("messages", {
      matchId: args.matchId,
      senderId,
      receiverId,
      content: encryptedContent,
      timestamp: Date.now(),
      isRead: false,
      messageType: args.messageType,
      attachmentId: args.attachmentId,
    });

    return { success: true };
  },
});

// Get messages for a match
export const getMessages = query({
  args: {
    matchId: v.id("matches"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const match = await ctx.db.get(args.matchId);
    if (!match) return [];

    if (match.user1Id !== userId && match.user2Id !== userId) return [];

    const limit = args.limit || 50;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_match_timestamp", (q) => q.eq("matchId", args.matchId))
      .order("desc")
      .take(limit);

    const decryptedMessages = await Promise.all(
      messages.map(async (message) => {
        const decryptedContent = decodeBase64Unicode(message.content);

        let attachmentUrl = null;
        if (message.attachmentId) {
          attachmentUrl = await ctx.storage.getUrl(message.attachmentId);
        }

        return {
          ...message,
          content: decryptedContent,
          attachmentUrl,
        };
      })
    );

    return decryptedMessages.reverse();
  },
});

// Mark messages as read
export const markMessagesAsRead = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .filter((q) =>
        q.and(q.eq(q.field("receiverId"), userId), q.eq(q.field("isRead"), false))
      )
      .collect();

    await Promise.all(
      unreadMessages.map((message) =>
        ctx.db.patch(message._id, { isRead: true })
      )
    );

    return { success: true };
  },
});

// Get conversation list (matches with last message)
export const getConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { withMessages: [], withoutMessages: [] };

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

    const conversationsData = await Promise.all(
      allMatches.map(async (match) => {
        const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;

        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", otherUserId))
          .unique();

        if (!profile) return null;

        const firstPhotoUrl =
          profile.photos.length > 0
            ? await ctx.storage.getUrl(profile.photos[0])
            : null;

        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .order("desc")
          .first();

        const unreadCount = await ctx.db
          .query("messages")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("receiverId"), userId),
              q.eq(q.field("isRead"), false)
            )
          )
          .collect();

        let decryptedLastMessage = null;
        if (lastMessage) {
          const decryptedContent = decodeBase64Unicode(lastMessage.content);
          decryptedLastMessage = {
            ...lastMessage,
            content: decryptedContent,
          };
        }

        return {
          match,
          otherUser: {
            ...profile,
            firstPhoto: firstPhotoUrl,
          },
          lastMessage: decryptedLastMessage,
          unreadCount: unreadCount.length,
          hasMessages: !!lastMessage,
        };
      })
    );

    const validConversations = conversationsData.filter(
      (conv): conv is NonNullable<typeof conv> => conv !== null
    );

    const withMessages = validConversations
      .filter((conv) => conv.hasMessages)
      .sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));

    const withoutMessages = validConversations
      .filter((conv) => !conv.hasMessages)
      .sort((a, b) => b.match.matchedAt - a.match.matchedAt);

    return { withMessages, withoutMessages };
  },
});
