"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Assistant IA public — flottant, disponible sans compte, répond à partir des vraies données du site (voir lib/ai/chat.ts). */
export function ChatWidget() {
  const t = useTranslations("chat");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 0);
    return () => clearTimeout(id);
  }, [messages, pending]);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || pending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setPending(true);
    setError(null);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: nextMessages }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? t("error"));
      setPending(false);
      return;
    }

    const { reply } = (await response.json()) as { reply: string };
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setPending(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title={t("open")}
        className="fixed end-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-rf-gold text-rf-bg shadow-lg transition-transform hover:scale-105 md:bottom-6"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        <span className="sr-only">{t("open")}</span>
      </button>

      {open && (
        <div className="fixed inset-x-4 bottom-36 z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-rf-border bg-rf-bg-card shadow-2xl sm:inset-x-auto sm:end-4 sm:w-96 md:bottom-24">
          <div className="border-b border-rf-border px-4 py-3">
            <p className="font-display text-sm font-bold text-rf-fg">{t("title")}</p>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && <p className="text-sm text-rf-fg-muted">{t("welcome")}</p>}
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                  message.role === "user"
                    ? "ms-auto bg-rf-gold text-rf-bg"
                    : "bg-rf-bg-elevated text-rf-fg",
                )}
              >
                {message.content}
              </div>
            ))}
            {pending && (
              <div className="flex items-center gap-2 text-sm text-rf-fg-subtle">
                <Loader2 size={14} className="animate-spin" />
                {t("thinking")}
              </div>
            )}
            {error && <p className="text-xs text-rf-live">{error}</p>}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-rf-border p-3">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t("placeholder")}
              disabled={pending}
              className="min-w-0 flex-1 rounded-xl border border-rf-border bg-rf-bg-elevated px-3 py-2 text-sm text-rf-fg placeholder:text-rf-fg-subtle focus:border-rf-gold focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rf-gold text-rf-bg disabled:opacity-50"
            >
              <Send size={16} />
              <span className="sr-only">{t("send")}</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
