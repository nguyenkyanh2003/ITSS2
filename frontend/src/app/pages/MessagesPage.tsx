import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Inbox, MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useNotification } from "../../context/NotificationContext";
import { getApiUrl, getAssetUrl } from "../../utils/api";

interface ChatUser {
  id: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string;
}

interface ChatMessage {
  id: string;
  sender: string | { id?: string; _id?: string };
  receiver: string;
  content: string;
  isRead?: boolean;
  createdAt?: string;
}

interface Conversation {
  id: string;
  otherUser?: ChatUser;
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt?: string;
}

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop";

const getId = (value: string | { id?: string; _id?: string } | undefined) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value.id || value._id || "");
};

const formatMessageTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export function MessagesPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showNotification } = useNotification();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const errorTitle = "Lỗi";

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadConversations = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        setIsLoading(true);
        const res = await fetch(getApiUrl("/api/chats/conversations?limit=50"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Không thể tải tin nhắn");
        }

        setConversations(Array.isArray(data.data?.conversations) ? data.data.conversations : []);
      } catch (error: any) {
        showNotification(errorTitle, error.message || "Không thể tải tin nhắn", "error");
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [isAuthenticated, showNotification]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#EE4D2D] px-6 py-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-white hover:opacity-80">
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại</span>
          </Link>
          <div className="flex items-center gap-2 text-white font-semibold">
            <MessageCircle className="w-5 h-5" />
            <span>Tin nhắn</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-gray-500">Đang tải tin nhắn...</div>
          ) : conversations.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <div>Chưa có cuộc trò chuyện nào.</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conversation) => {
                const otherUser = conversation.otherUser;
                const otherUserId = otherUser?.id ? String(otherUser.id) : "";
                const displayName = otherUser?.fullName || otherUser?.email || "Người dùng";
                const lastMessage = conversation.lastMessage;
                const isMine = getId(lastMessage?.sender) === String(user.id);

                return (
                  <Link
                    key={conversation.id}
                    to={otherUserId ? `/chat/${otherUserId}` : "/messages"}
                    state={{
                      conversationId: conversation.id,
                      sellerName: displayName,
                    }}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-orange-50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                      <ImageWithFallback
                        src={getAssetUrl(otherUser?.avatarUrl) || DEFAULT_AVATAR}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="font-semibold text-gray-900 truncate">{displayName}</div>
                        {conversation.unreadCount > 0 && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#EE4D2D] text-white text-xs flex items-center justify-center">
                            {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 truncate mt-1">
                        {lastMessage
                          ? `${isMine ? "Bạn: " : ""}${lastMessage.content}`
                          : "Chưa có tin nhắn"}
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {formatMessageTime(lastMessage?.createdAt || conversation.updatedAt)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
