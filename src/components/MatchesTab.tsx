import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function MatchesTab() {
  const matches = useQuery(api.swipes.getMatches);

  if (!matches || matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center p-8">
        <div className="text-6xl mb-4">💖</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No matches yet</h3>
        <p className="text-gray-500">Start swiping to find your perfect match!</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Matches</h2>
      
      <div className="space-y-4">
        {matches.map((match) => (
          <div
            key={match._id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              {/* Profile photo */}
              <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {match.otherUser.firstPhoto ? (
                  <img
                    src={match.otherUser.firstPhoto}
                    alt={match.otherUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-2xl">👤</span>
                  </div>
                )}
              </div>

              {/* Match info */}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">
                  {match.otherUser.name}, {match.otherUser.age}
                </h3>
                <p className="text-sm text-gray-600">{match.otherUser.intent}</p>
                <p className="text-xs text-gray-500">
                  Matched {new Date(match.matchedAt).toLocaleDateString()}
                </p>
                {match.lastMessage && (
                  <p className="text-sm text-gray-600 mt-1">
                    Last message: {new Date(match.lastMessage.timestamp).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Message button */}
              <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors">
                Message
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
