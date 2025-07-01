import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get current user's profile
export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) return null;

    // Get photo URLs
    const photos = await Promise.all(
      profile.photos.map(async (photoId) => {
        const url = await ctx.storage.getUrl(photoId);
        return { id: photoId, url };
      })
    );

    return { ...profile, photos };
  },
});

// Get all profiles (admin only)
export const getAllProfiles = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (user?.email !== "admin@ship.com") {
      throw new Error("Unauthorized");
    }

    const profiles = await ctx.db.query("profiles").order("desc").collect();

    const profilesWithPhotos = await Promise.all(
      profiles.map(async (profile) => {
        const photoUrls = await Promise.all(
          profile.photos.map(photoId => ctx.storage.getUrl(photoId))
        );

        return {
          ...profile,
          photoUrls,
        };
      })
    );

    return profilesWithPhotos;
  },
});

// Create or update profile
export const createOrUpdateProfile = mutation({
  args: {
    name: v.string(),
    surname: v.string(), // <-- NEW
    age: v.number(),
    bio: v.string(),
    intent: v.string(),
    phone: v.optional(v.string()),
    location: v.optional(v.object({
      city: v.string(),
      state: v.string(),
      country: v.string(),
    })),
    interests: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const profileData = {
      userId,
      name: args.name,
      surname: args.surname, // <-- NEW
      age: args.age,
      bio: args.bio,
      intent: args.intent,
      phone: args.phone,
      location: args.location,
      interests: args.interests,
      isActive: true,
      isBlocked: false,
      lastSeen: Date.now(),
    };

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        ...profileData,
        photos: existingProfile.photos, // Keep existing photos
      });
      return existingProfile._id;
    } else {
      return await ctx.db.insert("profiles", {
        ...profileData,
        photos: [], // Start with empty photos array
      });
    }
  },
});

// Add photo to profile
export const addPhoto = mutation({
  args: {
    photoId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");

    const updatedPhotos = [...profile.photos, args.photoId];
    await ctx.db.patch(profile._id, { photos: updatedPhotos });
  },
});

// Remove photo from profile
export const removePhoto = mutation({
  args: {
    photoId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");

    const updatedPhotos = profile.photos.filter(id => id !== args.photoId);
    await ctx.db.patch(profile._id, { photos: updatedPhotos });
  },
});

// Get profiles for discovery (excluding current user and already swiped)
export const getDiscoveryProfiles = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit || 10;

    // Get all swiped user IDs
    const swipes = await ctx.db
      .query("swipes")
      .withIndex("by_swiper", (q) => q.eq("swiperId", userId))
      .collect();

    const swipedUserIds = new Set(swipes.map(s => s.swipedUserId));

    // Get active profiles excluding current user and swiped users
    const allProfiles = await ctx.db
      .query("profiles")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const filteredProfiles = allProfiles
      .filter(profile =>
        profile.userId !== userId &&
        !swipedUserIds.has(profile.userId) &&
        !profile.isBlocked
      )
      .slice(0, limit);

    // Get photo URLs for each profile
    const profilesWithPhotos = await Promise.all(
      filteredProfiles.map(async (profile) => {
        const photos = await Promise.all(
          profile.photos.map(async (photoId) => {
            const url = await ctx.storage.getUrl(photoId);
            return { id: photoId, url };
          })
        );
        return { ...profile, photos };
      })
    );

    return profilesWithPhotos;
  },
});

// Get profile by user ID
export const getProfileByUserId = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!profile) return null;

    // Get photo URLs
    const photos = await Promise.all(
      profile.photos.map(async (photoId) => {
        const url = await ctx.storage.getUrl(photoId);
        return { id: photoId, url };
      })
    );

    return { ...profile, photos };
  },
});

// Generate upload URL for photos
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

// Search profiles by name
export const searchProfilesByName = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const allProfiles = await ctx.db
      .query("profiles")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const matchingProfiles = allProfiles.filter((profile) =>
      profile.name.toLowerCase().includes(args.name.toLowerCase()) &&
      profile.userId !== userId &&
      !profile.isBlocked
    );

    const profilesWithPhotos = await Promise.all(
      matchingProfiles.map(async (profile) => {
        const photos = await Promise.all(
          profile.photos.map(async (photoId) => {
            const url = await ctx.storage.getUrl(photoId);
            return { id: photoId, url };
          })
        );
        return { ...profile, photos };
      })
    );

    return profilesWithPhotos;
  },
});
