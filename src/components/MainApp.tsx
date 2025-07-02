import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { DiscoverTab } from "./DiscoverTab";
import { MatchesTab } from "./MatchesTab";
import { MessagesTab } from "./MessagesTab";
import { ProfileTab } from "./ProfileTab";
import { ProfileSetup } from "./ProfileSetup";
import { AdminPanel } from "./AdminPanel";

type Tab = "discover" | "matches" | "messages" | "profile" | "admin";

export function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const profile = useQuery(api.profiles.getCurrentProfile);
  const user = useQuery(api.auth.loggedInUser);

  if (profile === undefined) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (profile === null) {
    return <ProfileSetup />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">Ship</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Hi, {profile.name}</span>
        </div>
      </header>

      <main className="pb-20">
        {activeTab === "discover" && <DiscoverTab />}
        {activeTab === "matches" && <MatchesTab />}
        {activeTab === "messages" && <MessagesTab />}
        {activeTab === "profile" && <ProfileTab />}
        {activeTab === "admin" && <AdminPanel />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          {[
            { id: "discover", label: "Discover", icon: "🔍" },
            { id: "matches", label: "Matches", icon: "💖" },
            { id: "messages", label: "Messages", icon: "💬" },
            { id: "profile", label: "Profile", icon: "👤" },
            ...(user?.email === "admin@ship.com" ? [{ id: "admin", label: "Admin", icon: "⚙️" }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="text-lg mb-1">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
