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
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (profile === null) {
    return <ProfileSetup />;
  }

  const navItems = [
    { id: "discover", label: "Discover", icon: "🔍" },
    { id: "matches", label: "Matches", icon: "💖" },
    { id: "messages", label: "Messages", icon: "💬" },
    { id: "profile", label: "Profile", icon: "👤" },
    ...(user?.email === "admin@ship.com"
      ? [{ id: "admin", label: "Admin", icon: "⚙️" }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md h-16 border-b shadow-sm px-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary">🚢 Ship</h2>
        <div className="text-sm text-gray-600">Hi, {profile.name}</div>
      </header>

      {/* Main Tab Content */}
      <main className="pb-24 px-2">
        {activeTab === "discover" && <DiscoverTab />}
        {activeTab === "matches" && <MatchesTab />}
        {activeTab === "messages" && <MessagesTab />}
        {activeTab === "profile" && <ProfileTab />}
        {activeTab === "admin" && <AdminPanel />}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-md z-20 px-2">
        <div className="flex justify-between max-w-md mx-auto">
          {navItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex flex-col items-center justify-center flex-1 py-2 rounded-lg transition-all duration-150 ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
