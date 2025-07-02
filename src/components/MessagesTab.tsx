import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChatInterface } from "./ChatInterface";
import { Id } from "../../convex/_generated/dataModel";

export function MessagesTab() {
  const [selectedMatch, setSelectedMatch] = useState<{
    matchId: Id<"matches">;
    otherUser: { name: string; firstPhoto?: string | null };
  } | null>(null);

  const conversations = useQuery(api.messages.getConversations);

  if (selectedMatch) {
    return (
      <ChatInterface
        matchId={selectedMatch.matchId}
        otherUser={selectedMatch.otherUser}
        onBack={() => setSelectedMatch(null)}
      />
    );
  }

  if (!conversations) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { withMessages, withoutMessages } = conversations;

  if (withMessages.length === 0 && withoutMessages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center p-8">
        <div className="text-6xl mb-4">💬</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No conversations yet</h3>
        <p className="text-gray-500">Start matching to begin conversations!</p>
      </div>
    );
  }

  const handleConversationClick = (conversation: any) => {
    setSelectedMatch({
      matchId: conversation.match._id,
      otherUser: {
        name: conversation.otherUser.name,
        firstPhoto: conversation.otherUser.firstPhoto,
      },
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Messages</h2>
      
      {/* Active conversations */}
      {withMessages.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Active Chats</h3>
          <div className="space-y-2">
            {withMessages.map((conversation) => (
              <div
                key={conversation.match._id}
                onClick={() => handleConversationClick(conversation)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  {/* Profile photo */}
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {conversation.otherUser.firstPhoto ? (
                      <img
                        src={conversation.otherUser.firstPhoto}
                        alt={conversation.otherUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-xl">👤</span>
                      </div>
                    )}
                  </div>

                  {/* Conversation info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-800 truncate">
                        {conversation.otherUser.name}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {conversation.lastMessage && 
                          new Date(conversation.lastMessage.timestamp).toLocaleDateString()
                        }
                      </span>
                    </div>
                    {conversation.lastMessage && (
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.lastMessage.senderId === conversation.otherUser.userId ? "" : "You: "}
                        {conversation.lastMessage.content}
                      </p>
                    )}
                  </div>

                  {/* Unread indicator */}
                  {conversation.unreadCount > 0 && (
                    <div className="w-6 h-6 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                      {conversation.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New matches without messages */}
      {withoutMessages.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">New Matches</h3>
          <div className="space-y-2">
            {withoutMessages.map((conversation) => (
              <div
                key={conversation.match._id}
                onClick={() => handleConversationClick(conversation)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  {/* Profile photo */}
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {conversation.otherUser.firstPhoto ? (
                      <img
                        src={conversation.otherUser.firstPhoto}
                        alt={conversation.otherUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-xl">👤</span>
                      </div>
                    )}
                  </div>

                  {/* Match info */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">
                      {conversation.otherUser.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Matched {new Date(conversation.match.matchedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Start chat button */}
                  <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors text-sm">
                    Say Hi!
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
