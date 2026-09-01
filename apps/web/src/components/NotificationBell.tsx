"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatRelativeTime } from "@/lib/date";
import { toIntlLocale } from "@/lib/intl-locale";
import { cn } from "@/lib/cn";

interface NotificationItem {
  id: string;
  title: string;
  linkUrl: string;
  isRead: boolean;
  createdAt: string;
}

const POLL_INTERVAL_MS = 60_000;

interface NotificationBellProps {
  /**
   * "header" (par défaut) : panneau sous la cloche, aligné à droite — pour
   * MobileHeader, barre large en haut d'écran.
   * "rail" : panneau qui s'ouvre sur le côté — pour la Sidebar, rail étroit
   * (w-20) collé au bord gauche de l'écran, où un panneau de 320px aligné
   * "end" déborderait entièrement hors de l'écran.
   */
  variant?: "header" | "rail";
}

/** Cloche de notifications — visible uniquement pour un compte public connecté (voir Sidebar/MobileHeader). */
export function NotificationBell({ variant = "header" }: NotificationBellProps) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    const response = await fetch("/api/notifications");
    if (!response.ok) return;
    const body: { notifications: NotificationItem[]; unreadCount: number } = await response.json();
    setNotifications(body.notifications);
    setUnreadCount(body.unreadCount);
  }

  useEffect(() => {
    const initial = setTimeout(refresh, 0);
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function handleOpen() {
    setOpen(true);
    if (unreadCount > 0) {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await fetch("/api/notifications/read", { method: "POST" });
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        title={t("title")}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rf-bg-card text-rf-fg-muted transition-colors hover:text-rf-fg"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-rf-live" aria-hidden />
        )}
        <span className="sr-only">{t("title")}</span>
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-rf-border bg-rf-bg-card shadow-2xl",
            variant === "rail" ? "start-full bottom-0 ms-2" : "end-0 top-full mt-2",
          )}
        >
          <div className="border-b border-rf-border px-4 py-3">
            <p className="font-display text-sm font-bold text-rf-fg">{t("title")}</p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-rf-fg-subtle">{t("empty")}</p>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.linkUrl}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block border-b border-rf-border px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-rf-bg-elevated",
                    !notification.isRead && "bg-rf-gold/5",
                  )}
                >
                  <p className="line-clamp-2 font-medium text-rf-fg">{notification.title}</p>
                  <p className="mt-1 text-xs text-rf-fg-subtle">
                    {formatRelativeTime(new Date(notification.createdAt), toIntlLocale(locale))}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
