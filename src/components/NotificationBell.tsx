import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, PackageCheck, Sparkles, Trash2 } from "lucide-react";
import { api } from "../lib/api";

type Notice = {
  _id: string;
  type: "new_errand" | "accepted" | "picked_up";
  title: string;
  message: string;
  readAt?: string | null;
  createdAt: string;
};

export default function NotificationBell({ token, onOpen }: { token: string; onOpen: () => void }) {
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the panel when clicking/tapping outside it or pressing Escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const refresh = useCallback(async () => {
    const result = await api.getNotifications(token);
    if (!result.ok) return;
    setItems(Array.isArray(result.notifications) ? result.notifications : []);
    setUnread(Number(result.unreadCount) || 0);
  }, [token]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  async function openNotice(notice: Notice) {
    if (!notice.readAt) {
      await api.markNotificationRead(token, notice._id);
      setItems((current) => current.map((item) => item._id === notice._id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnread((count) => Math.max(0, count - 1));
    }
    setOpen(false);
    onOpen();
  }

  async function deleteNotice(notice: Notice) {
    const result = await api.deleteNotification(token, notice._id);
    if (!result.ok) return;
    setItems((current) => current.filter((item) => item._id !== notice._id));
    if (!notice.readAt) setUnread((count) => Math.max(0, count - 1));
  }

  async function markAllRead() {
    const result = await api.markAllNotificationsRead(token);
    if (!result.ok) return;
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    setUnread(0);
  }

  return (
    <div ref={containerRef} className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-100 bg-white text-emerald-800 shadow-sm transition hover:bg-emerald-50"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <div
          // Inline width so it can't collapse to the 40px bell wrapper
          style={{ width: "min(92vw, 24rem)", minWidth: "min(92vw, 20rem)" }}
          className="absolute right-0 top-full z-[60] mt-3 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <h2 className="font-extrabold text-slate-900">Notifications</h2>
              <p className="text-xs text-slate-500">{unread} unread</p>
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="shrink-0 whitespace-nowrap text-xs font-bold text-emerald-700 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[min(65vh,28rem)] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">No notifications yet.</p>
            ) : items.map((notice) => (
              <div
                key={notice._id}
                className={`group flex w-full items-start border-b border-slate-100 transition hover:bg-emerald-50/70 ${notice.readAt ? "bg-white" : "bg-emerald-50/40"}`}
              >
                <button
                  type="button"
                  onClick={() => void openNotice(notice)}
                  className="flex min-w-0 flex-1 gap-3 px-4 py-4 text-left"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    {notice.type === "new_errand" ? <Sparkles className="h-4 w-4" /> : <PackageCheck className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{notice.title}</span>
                      {!notice.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-slate-600">{notice.message}</span>
                    <time className="mt-2 block text-xs text-slate-400">
                      {new Date(notice.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
                    </time>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void deleteNotice(notice)}
                  aria-label="Delete notification"
                  title="Delete"
                  className="mr-3 mt-4 shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {items.some((item) => item.readAt) && (
            <div className="flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold text-slate-400">
              <CheckCheck className="h-4 w-4" /> Read notices stay for 30 days
            </div>
          )}
        </div>
      )}
    </div>
  );
}