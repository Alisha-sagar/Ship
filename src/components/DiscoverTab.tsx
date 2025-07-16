import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { StatusStories } from "./StatusStories";
import { AdvancedFilters } from "./AdvancedFilters";
import { ReportModal } from "./ReportModal";
import { Id } from "../../convex/_generated/dataModel";

export function DiscoverTab() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const [useFilters, setUseFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const profiles = useQuery(
    useFilters ? api.filtering.getFilteredProfiles : api.profiles.getDiscoveryProfiles,
    useFilters ? { ...filters, limit: 10 } : { limit: 10 }
  );

  const searchedProfiles = useQuery(
    api.profiles.searchProfilesByName,
    searchTerm ? { name: searchTerm } : "skip"
  );

  const myStatuses = useQuery(api.status.getMyStatuses);
  const deleteStatus = useMutation(api.status.deleteStatus);
  const swipe = useMutation(api.swipes.swipe);

  const profileList = searchTerm ? searchedProfiles : profiles;

  const handleDeleteStatus = async (statusId: Id<"statusUpdates">) => {
    try {
      await deleteStatus({ statusId });
      toast.success("Story deleted");
    } catch {
      toast.error("Failed to delete story");
    }
  };

  const handleSwipe = async (action: "like" | "dislike") => {
    if (!profileList || profileList.length === 0) return;
    const currentProfile = profileList[currentIndex];

    try {
      await swipe({ swipedUserId: currentProfile.userId, action });
      if (action === "like") toast.success("Liked! 💖");

      setCurrentIndex((prev) => (prev < profileList.length - 1 ? prev + 1 : 0));
    } catch (error) {
      toast.error("Something went wrong");
      console.error(error);
    }
  };

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
    setUseFilters(Object.keys(newFilters).length > 0);
    setCurrentIndex(0);
  };

  if (!profileList || profileList.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 via-white to-blue-100 p-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <StatusStories />
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentIndex(0);
              }}
              placeholder="Search users..."
              className="w-full sm:w-72 px-4 py-2 border border-gray-300 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
            />
            <button
              onClick={() => setShowFilters(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition"
            >
              Filters
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center h-[60vh] text-center rounded-xl bg-white shadow-lg p-8">
          <div className="text-[72px] mb-2">🔍</div>
          <h3 className="text-xl font-semibold text-gray-800">No profiles found</h3>
          <p className="text-gray-500 mt-1">
            {searchTerm
              ? "No profiles match your search."
              : useFilters
              ? "Try adjusting your filters."
              : "Check back later for more users!"}
          </p>

          {(useFilters || searchTerm) && (
            <button
              onClick={() => {
                setUseFilters(false);
                setFilters({});
                setSearchTerm("");
              }}
              className="mt-6 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
            >
              Clear Search/Filters
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentProfile = profileList[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 via-white to-blue-100 p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <StatusStories />
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentIndex(0);
            }}
            placeholder="Search users..."
            className="w-full sm:w-72 px-4 py-2 border border-gray-300 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <button
            onClick={() => setShowFilters(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition"
          >
            Filters
          </button>
        </div>
      </div>

      {/* Your Stories */}
      {myStatuses && myStatuses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Your Active Stories</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myStatuses.map((story) => (
              <div key={story._id} className="rounded-xl p-4 bg-white shadow-md flex gap-4">
                {story.mediaType === "photo" ? (
                  <img
                    src={story.mediaUrl ?? ""}
                    alt="Story"
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                ) : (
                  <video
                    src={story.mediaUrl ?? ""}
                    className="w-20 h-20 rounded-lg object-cover"
                    muted
                    loop
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm text-gray-700 line-clamp-2">{story.caption}</p>
                  <p className="text-xs text-gray-400 mt-1">Views: {story.viewCount}</p>
                  <button
                    onClick={() => handleDeleteStatus(story._id as Id<"statusUpdates">)}
                    className="text-xs text-red-500 hover:underline mt-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 transition-all">
        <div className="relative h-96 bg-gray-200">
          {currentProfile.photos.length > 0 ? (
            <img
              src={currentProfile.photos[0].url ?? ""}
              alt={currentProfile.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-6xl">
              👤
            </div>
          )}
          <button
            onClick={() => setShowReportModal(true)}
            className="absolute top-3 right-3 w-8 h-8 bg-white/80 text-black rounded-full flex items-center justify-center hover:bg-white transition"
          >
            ⚠️
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white p-4">
            <h3 className="text-2xl font-bold">{currentProfile.name}, {currentProfile.age}</h3>
            <p className="text-sm">{currentProfile.intent}</p>
            {Array.isArray((currentProfile as any).intentHistory) && (currentProfile as any).intentHistory.length > 1 && (
              <div className="text-xs text-gray-200 mt-1">
                Intent history:{" "}
                {(currentProfile as any).intentHistory
                  .map((i: any) => `${i.value} (${new Date(i.changedAt).toLocaleDateString()})`)
                  .join(" → ")}
              </div>
            )}
            {currentProfile.location && (
              <p className="text-xs opacity-80 mt-1">
                {currentProfile.location.city}, {currentProfile.location.state}
              </p>
            )}
          </div>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-700 mb-3">{currentProfile.bio}</p>
          {currentProfile.interests.length > 0 && (
            <div className="mb-2">
              <h4 className="text-sm font-semibold text-gray-600 mb-2">Interests</h4>
              <div className="flex flex-wrap gap-2">
                {currentProfile.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-pink-100 text-pink-800 text-xs rounded-full shadow-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-around items-center gap-6 p-4 border-t bg-gray-50">
          <button
            onClick={() => handleSwipe("dislike")}
            className="w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md text-2xl transition"
          >
            ❌
          </button>
          <button
            onClick={() => handleSwipe("like")}
            className="w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-md text-2xl transition"
          >
            💖
          </button>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500 mt-2">
        {currentIndex + 1} of {profileList.length}
        {useFilters && <span className="ml-2 text-primary">• Filtered</span>}
      </div>

      {/* Modals */}
      <AdvancedFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onFiltersChange={handleFiltersChange}
      />
      <ReportModal
        userId={currentProfile.userId}
        userName={currentProfile.name}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </div>
  );
}
