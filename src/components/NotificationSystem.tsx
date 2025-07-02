import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function NotificationSystem() {
  const [lastMatchCount, setLastMatchCount] = useState(0);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  const matches = useQuery(api.swipes.getMatches);
  const conversations = useQuery(api.messages.getConversations);

  // Check for new matches
  useEffect(() => {
    if (matches && matches.length > lastMatchCount && lastMatchCount > 0) {
      const newMatches = matches.length - lastMatchCount;
      toast.success(`🎉 You have ${newMatches} new match${newMatches > 1 ? 'es' : ''}!`, {
        duration: 5000,
      });
    }
    if (matches) {
      setLastMatchCount(matches.length);
    }
  }, [matches, lastMatchCount]);

  // Check for new messages
  useEffect(() => {
    if (conversations) {
      const totalUnread = conversations.withMessages.reduce(
        (sum, conv) => sum + conv.unreadCount, 
        0
      );
      
      if (totalUnread > lastMessageCount && lastMessageCount > 0) {
        const newMessages = totalUnread - lastMessageCount;
        toast.info(`💬 You have ${newMessages} new message${newMessages > 1 ? 's' : ''}!`, {
          duration: 4000,
        });
      }
      setLastMessageCount(totalUnread);
    }
  }, [conversations, lastMessageCount]);

  return null; // This component only handles notifications
}
