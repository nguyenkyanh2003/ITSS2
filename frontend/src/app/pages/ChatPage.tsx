import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router";
import { ArrowLeft, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";

interface LocationState {
  conversationId?: string;
  sellerName?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  receiver: string;
  content: string;
  createdAt?: string;
}

export function ChatPage() {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { showNotification } = useNotification();
  const errorTitle = "Lỗi";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const state = (location.state || {}) as LocationState;
  const sellerName = state.sellerName || "Người bán";

  const token = useMemo(() => localStorage.getItem("token"), []);

  useEffect(() => {
    if (!userId || !token) return;

    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/chats/with/${userId}?limit=50`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Không thể tải tin nhắn");
        }

        const items = Array.isArray(data.data?.messages) ? data.data.messages : [];
        setMessages(items.reverse());
      } catch (error: any) {
        showNotification(errorTitle, error.message || "Không thể tải tin nhắn", "error");
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [userId, token]);

  const handleSend = async () => {
    if (!userId || !token) return;
    const content = input.trim();
    if (!content) return;

    try {
      const res = await fetch(`/api/chats/with/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Không thể gửi tin nhắn");
      }

      const message = data.data?.message;
      if (message) {
        setMessages((prev) => [...prev, message]);
      }
      setInput("");
    } catch (error: any) {
      showNotification(errorTitle, error.message || "Không thể gửi tin nhắn", "error");
    }
  };

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Không tìm thấy hội thoại.</p>
          <Link to="/profile" className="text-[#FF5C00] hover:underline">
            Quay lại hồ sơ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#FF5C00] px-6 py-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link to="/profile" className="inline-flex items-center gap-2 text-white hover:opacity-80">
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại</span>
          </Link>
          <div className="text-white font-semibold ml-2">{sellerName}</div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow-md p-4 min-h-[60vh] flex flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto">
            {isLoading ? (
              <div className="text-gray-500 text-center py-6">Đang tải tin nhắn...</div>
            ) : messages.length === 0 ? (
              <div className="text-gray-500 text-center py-6">Chưa có tin nhắn nào.</div>
            ) : (
              messages.map((message) => {
                const isMine = String(message.sender) === String(user.id);
                return (
                  <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`px-4 py-2 rounded-lg max-w-[70%] ${isMine ? "bg-[#FF5C00] text-white" : "bg-gray-100 text-gray-800"}`}>
                      {message.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-4 border-t border-gray-200 flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00] focus:border-transparent"
            />
            <button
              onClick={handleSend}
              className="px-4 py-2 bg-[#FF5C00] text-white rounded-lg hover:bg-[#E65100] transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
