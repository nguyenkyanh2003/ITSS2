import { useCallback, useEffect, useState } from "react";
import { getApiUrl } from "../../utils/api";

export function useUnreadMessages(enabled: boolean) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadMessages = useCallback(async () => {
    if (!enabled) {
      setUnreadCount(0);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setUnreadCount(0);
      return;
    }

    try {
      const res = await fetch(getApiUrl("/api/chats/conversations?limit=1"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUnreadCount(Number(data.data?.unreadTotal || 0));
      }
    } catch {
      setUnreadCount(0);
    }
  }, [enabled]);

  useEffect(() => {
    refreshUnreadMessages();

    if (!enabled) return;

    const handleMessagesUpdated = () => refreshUnreadMessages();
    window.addEventListener("messagesUpdated", handleMessagesUpdated);
    const intervalId = window.setInterval(refreshUnreadMessages, 30000);

    return () => {
      window.removeEventListener("messagesUpdated", handleMessagesUpdated);
      window.clearInterval(intervalId);
    };
  }, [enabled, refreshUnreadMessages]);

  return { unreadCount, refreshUnreadMessages };
}
