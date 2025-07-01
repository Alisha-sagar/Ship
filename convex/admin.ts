import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { MutationCtx, QueryCtx } from "./_generated/server";

// 🔒 Shared utility to enforce admin access
async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  if (!userRole || (userRole.role !== "admin" && userRole.role !== "superadmin")) {
    throw new Error("Admin access required");
  }

  return { userId, role: userRole.role };
}

// 👥 Get all users for AdminPanel
export const getAllUsers = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const profiles = await ctx.db.query("profiles").order("desc").take(limit + offset);
    const users = profiles.slice(offset);

    const usersWithData = await Promise.all(
      users.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);

        const userRole = await ctx.db
          .query("userRoles")
          .withIndex("by_user", (q) => q.eq("userId", profile.userId))
          .unique();

        const matches1 = await ctx.db
          .query("matches")
          .withIndex("by_user1", (q) => q.eq("user1Id", profile.userId))
          .collect();

        const matches2 = await ctx.db
          .query("matches")
          .withIndex("by_user2", (q) => q.eq("user2Id", profile.userId))
          .collect();

        const reports = await ctx.db
          .query("reports")
          .withIndex("by_reported", (q) => q.eq("reportedUserId", profile.userId))
          .collect();

        return {
          _id: profile._id,
          name: profile.name,
          age: profile.age,
          email: user?.email ?? "",
          isBlocked: profile.isBlocked ?? false,
          isActive: profile.isActive ?? true,
          matchCount: matches1.length + matches2.length,
          reportCount: reports.length,
          role: userRole?.role ?? "user",
          joinedAt: user?._creationTime,
        };
      })
    );

    return usersWithData;
  },
});

// 🚫 Block/unblock user
export const toggleUserBlock = mutation({
  args: {
    userId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!profile) throw new Error("User not found");

    const newBlockStatus = !profile.isBlocked;

    await ctx.db.patch(profile._id, {
      isBlocked: newBlockStatus,
    });

    await ctx.db.insert("adminActions", {
      adminId: admin.userId,
      targetUserId: args.userId,
      action: newBlockStatus ? "block" : "unblock",
      reason: args.reason,
      timestamp: Date.now(),
      status: admin.role === "superadmin" ? "approved" : "pending",
    });

    return { success: true, blocked: newBlockStatus };
  },
});

// 📄 Get reports (with optional status filter)
export const getReports = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("reviewed"), v.literal("resolved"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const reports = args.status !== undefined
      ? await ctx.db
          .query("reports")
          .withIndex("by_status", (q) => q.eq("status", args.status as "pending" | "reviewed" | "resolved"))
          .order("desc")
          .collect()
      : await ctx.db.query("reports").order("desc").collect();

    const reportsWithData = await Promise.all(
      reports.map(async (report) => {
        const reporter = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", report.reporterId))
          .unique();

        const reported = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", report.reportedUserId))
          .unique();

        return {
          ...report,
          reporterName: reporter?.name ?? "Unknown",
          reportedName: reported?.name ?? "Unknown",
        };
      })
    );

    return reportsWithData;
  },
});

// 🛠 Update report status
export const updateReportStatus = mutation({
  args: {
    reportId: v.id("reports"),
    status: v.union(v.literal("reviewed"), v.literal("resolved")),
    adminAction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    await ctx.db.patch(args.reportId, {
      status: args.status,
      adminId: admin.userId,
      adminAction: args.adminAction,
    });

    return { success: true };
  },
});

// 📬 Get pending admin actions (only for superadmins)
export const getPendingActions = query({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    if (admin.role !== "superadmin") {
      throw new Error("Superadmin access required");
    }

    const actions = await ctx.db
      .query("adminActions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    const actionsWithData = await Promise.all(
      actions.map(async (action) => {
        const adminProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", action.adminId))
          .unique();

        const targetProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", action.targetUserId))
          .unique();

        return {
          ...action,
          adminName: adminProfile?.name ?? "Unknown",
          targetName: targetProfile?.name ?? "Unknown",
        };
      })
    );

    return actionsWithData;
  },
});

// ✅ Approve or reject admin actions (superadmins only)
export const reviewAdminAction = mutation({
  args: {
    actionId: v.id("adminActions"),
    approved: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (admin.role !== "superadmin") {
      throw new Error("Superadmin access required");
    }

    await ctx.db.patch(args.actionId, {
      status: args.approved ? "approved" : "rejected",
      superAdminId: admin.userId,
      superAdminNotes: args.notes,
    });

    return { success: true };
  },
});
