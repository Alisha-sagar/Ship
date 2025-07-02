import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "../SignOutButton";
import { PhotoUpload } from "./PhotoUpload";
import { toast } from "sonner";

export function ProfileTab() {
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [editing, setEditing] = useState(false);
  const profile = useQuery(api.profiles.getCurrentProfile);
  const updateProfile = useMutation(api.profiles.createOrUpdateProfile);
  const deletePhoto = useMutation(api.storage.deletePhoto);

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    age: 18,
    bio: "",
    intent: "",
    phone: "",
    occupation: "",
    education: "",
    location: {
      city: "",
      state: "",
      country: "",
    },
    interests: "",
  });

  const handleEdit = () => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        surname: profile.surname || "",
        age: profile.age || 18,
        bio: profile.bio || "",
        intent: profile.intent || "",
        phone: profile.phone || "",
        occupation: profile.occupation || "",
        education: profile.education || "",
        location: profile.location || { city: "", state: "", country: "" },
        interests: profile.interests?.join(", ") || "",
      });
      setEditing(true);
    }
  };

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    if (name.includes("location.")) {
      const key = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        location: {
          ...prev.location,
          [key]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === "age" ? Number(value) : value,
      }));
    }
  };

  const handleFormSubmit = async () => {
    try {
      await updateProfile({
        name: formData.name,
        surname: formData.surname,
        age: formData.age,
        bio: formData.bio,
        intent: formData.intent,
        phone: formData.phone,
        occupation: formData.occupation,
        education: formData.education,
        location: formData.location,
        interests: formData.interests.split(",").map((i) => i.trim()),
      });
      toast.success("Profile updated!");
      setEditing(false);
    } catch (error) {
      console.error(error);
      toast.error("Update failed");
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (confirm("Are you sure you want to delete this photo?")) {
      try {
        await deletePhoto({ storageId: photoId as any });
        toast.success("Photo deleted");
      } catch (error) {
        toast.error("Failed to delete photo");
        console.error(error);
      }
    }
  };

  const handlePhotoUploaded = () => {
    setShowPhotoUpload(false);
    toast.success("Photo added successfully!");
  };

  if (!profile) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Photos */}
        <div className="relative">
          {profile.photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-1">
              {profile.photos.slice(0, 4).map((photo, index) => (
                <div key={photo.id} className={`relative ${index === 0 ? 'col-span-2 h-64' : 'h-32'}`}>
                  <img
                    src={photo.url || ""}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
              {profile.photos.length > 4 && (
                <div className="h-32 bg-gray-100 flex items-center justify-center text-gray-500">
                  +{profile.photos.length - 4} more
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 bg-gray-200 flex flex-col items-center justify-center text-gray-400">
              <span className="text-6xl mb-2">👤</span>
              <p className="text-sm">No photos uploaded</p>
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {profile.name}, {profile.age}
            </h2>
            <button
              onClick={handleEdit}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors text-sm"
            >
              Edit
            </button>
          </div>

          {editing ? (
            <div className="space-y-3">
              <input name="name" value={formData.name} onChange={handleFormChange} className="input" placeholder="Name" />
              <input name="surname" value={formData.surname} onChange={handleFormChange} className="input" placeholder="Surname" />
              <input name="age" type="number" value={formData.age} onChange={handleFormChange} className="input" placeholder="Age" />
              
              <select
                name="intent"
                value={formData.intent}
                onChange={handleFormChange}
                className="input"
              >
                <option value="">Select intent</option>
                {[
                  "dating", "friendship", "marriage", "hookup", "long-term", "situationship", "entanglement", "FWB",
                  "chat only", "open relationship", "polyamory", "poly curious", "monogamy", "bi curious", "exploring",
                  "serious relationship", "nothing serious", "relationship anarchist", "emotional connection",
                  "mental stimulation", "travel buddy", "co-parenting", "queerplatonic", "dom/sub", "sapiosexual",
                  "short-term", "kinky", "playful", "adventurous", "vibing"
                ].map((intent) => (
                  <option key={intent} value={intent}>
                    {intent.charAt(0).toUpperCase() + intent.slice(1)}
                  </option>
                ))}
              </select>

              <textarea name="bio" value={formData.bio} onChange={handleFormChange} className="input" placeholder="Bio" />
              <input name="phone" value={formData.phone} onChange={handleFormChange} className="input" placeholder="Phone" />
              <input name="occupation" value={formData.occupation} onChange={handleFormChange} className="input" placeholder="Occupation" />
              <input name="education" value={formData.education} onChange={handleFormChange} className="input" placeholder="Education Qualification" />
              <input name="location.city" value={formData.location.city} onChange={handleFormChange} className="input" placeholder="City" />
              <input name="location.state" value={formData.location.state} onChange={handleFormChange} className="input" placeholder="State" />
              <input name="location.country" value={formData.location.country} onChange={handleFormChange} className="input" placeholder="Country" />
              <input name="interests" value={formData.interests} onChange={handleFormChange} className="input" placeholder="Interests (comma-separated)" />
              <div className="flex gap-3">
                <button onClick={handleFormSubmit} className="w-full bg-primary text-white py-2 rounded-lg">Save</button>
                <button onClick={() => setEditing(false)} className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Looking for</h3>
                <p className="text-gray-800 capitalize">{profile.intent}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-1">About</h3>
                <p className="text-gray-800">{profile.bio}</p>
              </div>
              {profile.occupation && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">Occupation</h3>
                  <p className="text-gray-800">{profile.occupation}</p>
                </div>
              )}
              {profile.education && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">Education</h3>
                  <p className="text-gray-800">{profile.education}</p>
                </div>
              )}
              {profile.location && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">Location</h3>
                  <p className="text-gray-800">
                    {profile.location.city}, {profile.location.state}, {profile.location.country}
                  </p>
                </div>
              )}
              {profile.phone && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">Phone</h3>
                  <p className="text-gray-800">{profile.phone}</p>
                </div>
              )}
              {profile.interests.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, index) => (
                      <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Member since</h3>
                <p className="text-gray-800">
                  {new Date(profile._creationTime).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {/* Bottom Buttons */}
          <div className="mt-6 space-y-3">
            {showPhotoUpload ? (
              <div className="space-y-2">
                <PhotoUpload
                  onPhotoUploaded={handlePhotoUploaded}
                  currentPhotoCount={profile.photos.length}
                />
                <button
                  onClick={() => setShowPhotoUpload(false)}
                  className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPhotoUpload(true)}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                📷 Add Photos ({profile.photos.length}/6)
              </button>
            )}
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
