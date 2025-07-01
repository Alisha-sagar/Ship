import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Generate upload URL for photos
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    return await ctx.storage.generateUploadUrl();
  },
});

// Upload and process photo
export const uploadPhoto = mutation({
  args: {
    storageId: v.id("_storage"),
    type: v.union(v.literal("profile"), v.literal("status")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get file metadata
    const file = await ctx.db.system.get(args.storageId);
    if (!file) throw new Error("File not found");

    // Validate file type
    if (!file.contentType?.startsWith("image/")) {
      throw new Error("Only image files are allowed");
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File size must be less than 5MB");
    }

    if (args.type === "profile") {
      // Add to user's profile photos
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();

      if (!profile) throw new Error("Profile not found");

      // Limit to 6 photos
      if (profile.photos.length >= 6) {
        throw new Error("Maximum 6 photos allowed");
      }

      const updatedPhotos = [...profile.photos, args.storageId];
      await ctx.db.patch(profile._id, { photos: updatedPhotos });
    }

    return { success: true, storageId: args.storageId };
  },
});

// Delete photo
export const deletePhoto = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Remove from profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (profile) {
      const updatedPhotos = profile.photos.filter(id => id !== args.storageId);
      await ctx.db.patch(profile._id, { photos: updatedPhotos });
    }

    // Delete from storage
    await ctx.storage.delete(args.storageId);

    return { success: true };
  },
});

// Get photo URL
export const getPhotoUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
