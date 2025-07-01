import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Advanced filtering for discovery
export const getFilteredProfiles = query({
  args: {
    minAge: v.optional(v.number()),
    maxAge: v.optional(v.number()),
    intent: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    limit: v.optional(v.number()),
    surname: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit || 10;

    const swipes = await ctx.db
      .query("swipes")
      .withIndex("by_swiper", (q) => q.eq("swiperId", userId))
      .collect();

    const swipedUserIds = new Set(swipes.map((s) => s.swipedUserId));

    const allProfiles = await ctx.db
      .query("profiles")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    let filteredProfiles = allProfiles.filter((profile) => {
      if (profile.userId === userId || swipedUserIds.has(profile.userId) || profile.isBlocked) {
        return false;
      }

      if (args.minAge && profile.age < args.minAge) return false;
      if (args.maxAge && profile.age > args.maxAge) return false;

      if (args.intent && profile.intent !== args.intent) return false;

      if (args.surname && profile.surname?.toLowerCase() !== args.surname.toLowerCase()) {
        return false;
      }

      if (args.city && profile.location?.city !== args.city) return false;
      if (args.state && profile.location?.state !== args.state) return false;

      if (args.interests && args.interests.length > 0) {
        const hasCommonInterest = args.interests.some((interest) =>
          profile.interests.includes(interest)
        );
        if (!hasCommonInterest) return false;
      }

      return true;
    });

    filteredProfiles = filteredProfiles.slice(0, limit);

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

// Static intent list + dynamic interests and locations
export const getFilterOptions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { intents: [], interests: [], locations: [] };

    const allProfiles = await ctx.db
      .query("profiles")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const intents = [
      "dating", "friendship", "marriage", "hookup", "long-term",
      "situationship", "entanglement", "FWB", "chat only", "open relationship",
      "polyamory", "poly curious", "monogamy", "bi curious", "exploring",
      "serious relationship", "nothing serious", "relationship anarchist",
      "emotional connection", "mental stimulation", "travel buddy", "co-parenting",
      "queerplatonic", "dom/sub", "sapiosexual", "short-term", "kinky", "playful",
      "adventurous", "vibing"
    ];

    const interests = [...new Set(allProfiles.flatMap(p => p.interests))];
    const locations = [...new Set(
      allProfiles
        .filter(p => p.location)
        .map(p => `${p.location!.city}, ${p.location!.state}`)
    )];

    return {
      intents: intents.sort(),
      interests: interests.sort(),
      locations: locations.sort(),
    };
  },
});

// Age stats for UI sliders
export const getAgeStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { minAge: 18, maxAge: 65 };

    const allProfiles = await ctx.db
      .query("profiles")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const ages = allProfiles.map((p) => p.age);

    return {
      minAge: Math.min(...ages),
      maxAge: Math.max(...ages),
    };
  },
});
