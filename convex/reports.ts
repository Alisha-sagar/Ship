import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Report a user
export const reportUser = mutation({
  args: {
    reportedUserId: v.id("users"),
    reason: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const reporterId = await getAuthUserId(ctx);
    if (!reporterId) throw new Error("Not authenticated");

    if (reporterId === args.reportedUserId) {
      throw new Error("Cannot report yourself");
    }

    // Check if already reported
    const existingReport = await ctx.db
      .query("reports")
      .withIndex("by_reporter", (q: any) => q.eq("reporterId", reporterId))
      .filter((q: any) => q.eq(q.field("reportedUserId"), args.reportedUserId))
      .unique();

    if (existingReport) {
      throw new Error("You have already reported this user");
    }

    await ctx.db.insert("reports", {
      reporterId,
      reportedUserId: args.reportedUserId,
      reason: args.reason,
      description: args.description,
      timestamp: Date.now(),
      status: "pending",
    });

    return { success: true };
  },
});


export const getPendingReports = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const user = await ctx.db.get(userId);
    if (user?.email !== "admin@ship.com") {
      throw new Error("Unauthorized");
    }

    const reports = await ctx.db
      .query("reports")
      .withIndex("by_status", (q: any) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    const reportsWithDetails = await Promise.all(
      reports.map(async (report) => {
        const reporterProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q: any) => q.eq("userId", report.reporterId))
          .unique();

        const reportedProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q: any) => q.eq("userId", report.reportedUserId))
          .unique();

        return {
          ...report,
          reporterName: reporterProfile?.name || "Unknown",
          reportedUserName: reportedProfile?.name || "Unknown",
        };
      })
    );

    return reportsWithDetails;
  },
});

// Resolve report (admin only)
export const resolveReport = mutation({
  args: {
    reportId: v.id("reports"),
    action: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const user = await ctx.db.get(userId);
    if (user?.email !== "admin@ship.com") {
      throw new Error("Unauthorized");
    }

    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    await ctx.db.patch(args.reportId, {
      status: "resolved",
      adminId: userId,
      adminAction: args.action,
    });

    // Take action based on admin decision
    if (args.action === "block_user") {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q: any) => q.eq("userId", report.reportedUserId))
        .unique();

      if (profile) {
        await ctx.db.patch(profile._id, {
          isBlocked: true,
          isActive: false,
        });
      }
    }

    return { success: true };
  },
});

// Get all reports with details (admin only)
export const getAllReports = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const user = await ctx.db.get(userId);
    if (user?.email !== "admin@ship.com") {
      throw new Error("Unauthorized");
    }

    const reports = await ctx.db.query("reports").order("desc").collect();

    const reportsWithDetails = await Promise.all(
      reports.map(async (report) => {
        const reporterProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q: any) => q.eq("userId", report.reporterId))
          .unique();

        const reportedProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q: any) => q.eq("userId", report.reportedUserId))
          .unique();

        let adminProfile = null;
        if (report.adminId) {
          adminProfile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q: any) => q.eq("userId", report.adminId))
            .unique();
        }

        return {
          ...report,
          reporterName: reporterProfile?.name || "Unknown",
          reportedUserName: reportedProfile?.name || "Unknown",
          adminName: adminProfile?.name || null,
        };
      })
    );

    return reportsWithDetails;
  },
});



// Get report reasons
export const getReportReasons = query({
  args: {},
  handler: async () => {
    return [
      "Inappropriate photos",
      "Fake profile",
      "Harassment",
      "Spam",
      "Underage",
      "Inappropriate behavior",
      "Scam/Fraud",
      "Other",
    ];
  },
});
