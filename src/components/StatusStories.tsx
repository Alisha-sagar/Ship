import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function StatusStories() {
  const [selectedStatus, setSelectedStatus] = useState<any>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statuses = useQuery(api.status.getMatchesStatuses);
  const myStatuses = useQuery(api.status.getMyStatuses);
  const user = useQuery(api.auth.loggedInUser);
  const myUserId = user?._id;

  const viewStatus = useMutation(api.status.viewStatus);
  const createStatus = useMutation(api.status.createStatus);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const deleteStatus = useMutation(api.status.deleteStatus);

  useEffect(() => {
    const interval = setInterval(() => {
      // Auto-refresh placeholder
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusClick = async (status: any) => {
    setSelectedStatus(status);
    if (!status.hasViewed) {
      try {
        await viewStatus({ statusId: status._id });
        toast.success("Status viewed");
      } catch (error) {
        console.error("Failed to mark status as viewed:", error);
        toast.error("Failed to mark as viewed");
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
      const maxSize = 50 * 1024 * 1024;
      if (!validTypes.includes(file.type)) {
        toast.error("Please select a valid image or video file");
        return;
      }
      if (file.size > maxSize) {
        toast.error("File size must be less than 50MB");
        return;
      }
      setUploadFile(file);
      setShowUpload(true);
    }
  };

  const handleUploadStatus = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": uploadFile.type },
        body: uploadFile,
      });
      const { storageId } = await result.json();
      const mediaType = uploadFile.type.startsWith('image/') ? 'photo' : 'video';
      await createStatus({
        mediaId: storageId,
        mediaType,
        caption: caption.trim() || undefined,
      });
      toast.success("Status uploaded successfully!");
      setShowUpload(false);
      setUploadFile(null);
      setCaption("");
    } catch (error) {
      console.error("Failed to upload status:", error);
      toast.error("Failed to upload status");
    } finally {
      setUploading(false);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours === 1) return "1h ago";
    if (hours < 24) return `${hours}h ago`;
    return "1d ago";
  };

  if (showUpload && uploadFile) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Share Status</h3>
            <button
              onClick={() => {
                setShowUpload(false);
                setUploadFile(null);
                setCaption("");
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="mb-4 rounded-lg overflow-hidden bg-gray-100">
            {uploadFile.type.startsWith('image/') ? (
              <img
                src={URL.createObjectURL(uploadFile)}
                alt="Preview"
                className="w-full h-40 object-cover"
              />
            ) : (
              <video
                src={URL.createObjectURL(uploadFile)}
                className="w-full h-40 object-cover"
                controls
              />
            )}
          </div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption... (optional)"
            className="w-full p-3 border rounded-lg resize-none"
            rows={3}
            maxLength={200}
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                setShowUpload(false);
                setUploadFile(null);
                setCaption("");
              }}
              className="flex-1 py-2 px-4 border rounded-lg hover:bg-gray-50"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUploadStatus}
              disabled={uploading}
              className="flex-1 py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Share"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedStatus) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <button
          onClick={() => setSelectedStatus(null)}
          className="absolute top-4 right-4 text-white text-2xl z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/30"
        >
          ✕
        </button>
        <div className="relative w-full h-full max-w-md mx-auto">
          <div className="absolute top-4 left-4 right-4 h-1 bg-gray-600 rounded-full z-10">
            <div className="h-full bg-white rounded-full w-full"></div>
          </div>
          <div className="absolute top-8 left-4 right-4 flex items-center gap-3 z-10">
            <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden">
              {selectedStatus.userPhoto && (
                <img
                  src={selectedStatus.userPhoto}
                  alt={selectedStatus.userName}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <span className="text-white font-medium">{selectedStatus.userName}</span>
            <span className="text-gray-300 text-sm">{formatTimeAgo(selectedStatus.createdAt)}</span>
          </div>
          <div className="w-full h-full flex items-center justify-center">
            {selectedStatus.mediaType === "photo" ? (
              <img
                src={selectedStatus.mediaUrl}
                alt="Status"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <video
                src={selectedStatus.mediaUrl}
                controls
                className="max-w-full max-h-full"
                autoPlay
                muted
              />
            )}
          </div>
          {selectedStatus.caption && (
            <div className="absolute bottom-4 left-4 right-4 text-white text-center">
              <div className="bg-black/50 rounded-lg p-3">
                <p>{selectedStatus.caption}</p>
              </div>
            </div>
          )}
          {selectedStatus.userId === myUserId && (
            <div className="absolute bottom-16 left-4 right-4 text-center">
              <button
                onClick={async () => {
                  try {
                    await deleteStatus({ statusId: selectedStatus._id });
                    toast.success("Story deleted");
                    setSelectedStatus(null);
                  } catch (err) {
                    toast.error("Failed to delete story");
                  }
                }}
                className="text-sm text-red-500 underline hover:text-red-600"
              >
                Delete Story
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Stories</h3>
        {/* Removed "+ Add Story" button */}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <div className="flex gap-3 overflow-x-auto pb-2">
        <div className="flex-shrink-0 text-center">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 border-2 border-white shadow-lg flex items-center justify-center mb-2 cursor-pointer hover:scale-105 transition-transform"
          >
            <span className="text-2xl text-white">+</span>
          </div>
          <p className="text-xs text-gray-600">Your Story</p>
          {myStatuses && myStatuses.length > 0 && (
            <p className="text-xs text-primary font-medium">{myStatuses.length} active</p>
          )}
        </div>
        {statuses?.map((status) => (
          <div
            key={status._id}
            onClick={() => handleStatusClick(status)}
            className="flex-shrink-0 text-center cursor-pointer group"
          >
            <div className={`w-16 h-16 rounded-full overflow-hidden border-3 mb-2 transition-all group-hover:scale-105 ${
              status.hasViewed 
                ? 'border-gray-300' 
                : 'border-gradient-to-r from-pink-500 to-purple-500 border-primary shadow-lg'
            }`}>
              {status.userPhoto ? (
                <img
                  src={status.userPhoto}
                  alt={status.userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xl">👤</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-600 truncate w-16">{status.userName}</p>
            <p className="text-xs text-gray-400">{formatTimeAgo(status.createdAt)}</p>
          </div>
        ))}
      </div>
      {/* Removed the "No stories yet" fallback */}
      {statuses === undefined && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}
