import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { api } from "../lib/api";

type ChatMessage = {
  _id: string;
  senderId: string | { _id: string; fullName: string };
  message: string;
  createdAt: string;
};

const MAX_MESSAGE_LENGTH = 500;

export default function ErrandChat({
  token,
  errandId,
  currentUserId,
  otherName,
  canSend,
}: {
  token: string;
  errandId: string;
  currentUserId: string;
  otherName: string;
  canSend: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let disposed = false;

    const loadMessages = async () => {
      const res = await api.getErrandMessages(token, errandId);
      if (disposed) return;
      setLoading(false);
      if (res.ok) {
        setMessages(res.messages || []);
        setError("");
      } else {
        setError(res.error || "Could not load this conversation.");
      }
    };

    setLoading(true);
    void loadMessages();
    const timer = window.setInterval(() => void loadMessages(), 3000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [open, token, errandId]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, open]);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || message.length > MAX_MESSAGE_LENGTH || !canSend || sending) return;

    setSending(true);
    setError("");
    const res = await api.sendErrandMessage(token, errandId, message);
    setSending(false);
    if (!res.ok) {
      setError(res.error || "Could not send your message.");
      return;
    }

    const saved = res.message as ChatMessage;
    setMessages((current) => [...current.filter((item) => item._id !== saved._id), saved]);
    setDraft("");
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
        aria-expanded={open}
      >
        <MessageCircle className="h-4 w-4" />
        {open ? "Close chat" : `Chat with ${otherName}`}
      </button>

      {open && (
        <section className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label={`Chat with ${otherName}`}>
          <header className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <p className="font-bold text-slate-800">Errand chat</p>
            <p className="text-xs text-slate-500">Only you and {otherName} can see these messages.</p>
          </header>

          <div className="max-h-72 min-h-32 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {loading && messages.length === 0 ? (
              <p className="text-center text-sm text-slate-400">Loading conversation...</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-slate-400">No messages yet. Start the conversation.</p>
            ) : messages.map((item) => {
              const senderId = typeof item.senderId === "string" ? item.senderId : item.senderId?._id;
              const senderName = typeof item.senderId === "string" ? "Participant" : item.senderId?.fullName;
              const mine = senderId === currentUserId;
              return (
                <div key={item._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${mine ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                    <p className={`mb-1 text-[11px] font-bold ${mine ? "text-emerald-100" : "text-slate-500"}`}>
                      {mine ? "You" : senderName}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm">{item.message}</p>
                    <p className={`mt-1 text-right text-[10px] ${mine ? "text-emerald-100" : "text-slate-400"}`}>
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {error && <p className="px-4 pb-2 text-sm text-rose-600">{error}</p>}

          {canSend ? (
            <form onSubmit={sendMessage} className="border-t border-slate-100 p-3">
              <label className="sr-only" htmlFor={`chat-message-${errandId}`}>Your message</label>
              <textarea
                id={`chat-message-${errandId}`}
                value={draft}
                onChange={(event) => setDraft(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={2}
                placeholder="Write a message..."
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">{draft.length}/{MAX_MESSAGE_LENGTH} characters</span>
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          ) : (
            <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">This errand has ended. The conversation is read-only.</p>
          )}
        </section>
      )}
    </div>
  );
}
