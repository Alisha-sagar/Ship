import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // User profiles with all necessary information
  profiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    surname: v.optional(v.string()),
    age: v.number(),
    bio: v.string(),
    intent: v.string(), // "dating", "friendship", "networking", etc.
    phone: v.optional(v.string()),
    photos: v.array(v.id("_storage")), // Array of photo storage IDs
    location: v.optional(v.object({
      city: v.string(),
      state: v.string(),
      country: v.string(),
    })),
    interests: v.array(v.string()),
    isActive: v.boolean(),
    isBlocked: v.boolean(),
    lastSeen: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_active", ["isActive"])
    .index("by_blocked", ["isBlocked"]),

  // Swipe actions (like/dislike)
  swipes: defineTable({
    swiperId: v.id("users"),
    swipedUserId: v.id("users"),
    action: v.union(v.literal("like"), v.literal("dislike")),
    timestamp: v.number(),
  })
    .index("by_swiper", ["swiperId"])
    .index("by_swiped", ["swipedUserId"])
    .index("by_swiper_and_swiped", ["swiperId", "swipedUserId"]),

  // Matches when both users like each other
  matches: defineTable({
    user1Id: v.id("users"),
    user2Id: v.id("users"),
    matchedAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_user1", ["user1Id"])
    .index("by_user2", ["user2Id"])
    .index("by_users", ["user1Id", "user2Id"]),

  // Real-time messages
  messages: defineTable({
    matchId: v.id("matches"),
    senderId: v.id("users"),
    receiverId: v.id("users"),
    content: v.string(), // Encrypted content
    timestamp: v.number(),
    isRead: v.boolean(),
    messageType: v.union(v.literal("text"), v.literal("image"), v.literal("emoji")),
    attachmentId: v.optional(v.id("_storage")),
  })
    .index("by_match", ["matchId"])
    .index("by_sender", ["senderId"])
    .index("by_receiver", ["receiverId"])
    .index("by_match_timestamp", ["matchId", "timestamp"]),

  // User reports for moderation
  reports: defineTable({
    reporterId: v.id("users"),
    reportedUserId: v.id("users"),
    reason: v.string(),
    description: v.string(),
    timestamp: v.number(),
    status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("resolved")),
    adminId: v.optional(v.id("users")),
    adminAction: v.optional(v.string()),
  })
    .index("by_reporter", ["reporterId"])
    .index("by_reported", ["reportedUserId"])
    .index("by_status", ["status"]),

  // Admin actions that need superadmin approval
  adminActions: defineTable({
    adminId: v.id("users"),
    targetUserId: v.id("users"),
    action: v.union(v.literal("block"), v.literal("unblock"), v.literal("delete")),
    reason: v.string(),
    timestamp: v.number(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    superAdminId: v.optional(v.id("users")),
    superAdminNotes: v.optional(v.string()),
  })
    .index("by_admin", ["adminId"])
    .index("by_target", ["targetUserId"])
    .index("by_status", ["status"]),

  // User roles
  userRoles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("superadmin")),
    assignedBy: v.optional(v.id("users")),
    assignedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_role", ["role"]),

  // Email verification
  emailVerifications: defineTable({
    email: v.string(),
    otp: v.string(),
    expiresAt: v.number(),
    isVerified: v.boolean(),
    attempts: v.number(),
  })
    .index("by_email", ["email"]),

  // Status updates (24hr stories)
  statusUpdates: defineTable({
    userId: v.id("users"),
    mediaId: v.id("_storage"),
    mediaType: v.union(v.literal("photo"), v.literal("video")),
    caption: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_active", ["isActive"])
    .index("by_expires", ["expiresAt"]),

  // Status views tracking
  statusViews: defineTable({
    statusId: v.id("statusUpdates"),
    viewerId: v.id("users"),
    viewedAt: v.number(),
  })
    .index("by_status", ["statusId"])
    .index("by_viewer", ["viewerId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
