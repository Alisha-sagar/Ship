import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import EmojiPicker from "emoji-picker-react";

interface ChatInterfaceProps {
  matchId: Id<"matches">;
  otherUser: {
    name: string;
    firstPhoto?: string | null;
  };
  onBack: () => void;
}

export function ChatInterface({ matchId, otherUser, onBack }: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(api.messages.getMessages, { matchId });
  const sendMessage = useMutation(api.messages.sendMessage);
  const markAsRead = useMutation(api.messages.markMessagesAsRead);
  const getUploadUrl = useMutation(api.storage.generateUploadUrl);
  const currentUser = useQuery(api.auth.loggedInUser);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    markAsRead({ matchId });
  }, [matchId, markAsRead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await sendMessage({
        matchId,
        content: newMessage.trim(),
        messageType: "text",
      });
      setNewMessage("");
    } catch (error) {
      toast.error("Failed to send message");
      console.error(error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileUploading(true);

    try {
      const uploadUrl = await getUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await res.json();

      let messageType: "image" | "emoji" | "text" = "image";
      if (file.type.startsWith("image/")) {
        messageType = "image";
      } else {
        toast.error("Only image files are supported.");
        setFileUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      await sendMessage({
        matchId,
        content: file.name,
        attachmentId: storageId,
        messageType,
      });

    } catch (err) {
      toast.error("Failed to upload file");
      console.error(err);
    } finally {
      setFileUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleEmojiClick = (emojiData: any) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    return diffInHours < 24
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!messages || !currentUser) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-primary hover:text-primary-hover">← Back</button>
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
          {otherUser.firstPhoto ? (
            <img src={otherUser.firstPhoto} alt={otherUser.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">👤</div>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">{otherUser.name}</h3>
          <p className="text-xs text-gray-500">{isTyping ? "Typing..." : "Active now"}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-2">👋</div>
            <p>Say hello to start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.senderId === currentUser._id;
            const showTime = index === 0 || (message.timestamp - messages[index - 1].timestamp) > 300000;

            return (
              <div key={message._id}>
                {showTime && (
                  <div className="text-center text-xs text-gray-500 mb-2">
                    {formatTime(message.timestamp)}
                  </div>
                )}

                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${isOwn ? 'bg-primary text-white rounded-br-md' : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'}`}>
                    {message.messageType === "text" && <p className="text-sm">{message.content}</p>}

                    {message.messageType === "image" && message.attachmentUrl && (
                      <img src={message.attachmentUrl} alt="Attachment" className="rounded-md max-w-full h-auto" />
                    )}

                    {message.messageType === "video" && message.attachmentUrl && (
                      <video src={message.attachmentUrl} controls className="rounded-md max-w-full h-auto" />
                    )}

                    {message.messageType === "audio" && message.attachmentUrl && (
                      <audio src={message.attachmentUrl} controls className="w-full mt-2" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-2xl">😊</button>

          {showEmojiPicker && (
            <div className="absolute bottom-20 left-4 z-10">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          )}

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            maxLength={500}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,audio/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition"
            disabled={fileUploading}
          >
            📎
          </button>

          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
