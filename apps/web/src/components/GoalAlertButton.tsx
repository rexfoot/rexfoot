"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

type PushState = "unknown" | "unsupported" | "unconfigured" | "denied" | "off" | "on" | "working" | "error";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64.replace(/-/g, "+").replace(/_/g, "/") + padding);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Bouton "M'alerter des buts de ce match" (Web Push, sans compte) — placé
 * sous le score sur la page détail. Sans VAPID côté serveur, le bouton
 * affiche que les alertes sont désactivées (jamais de crash).
 */
export function GoalAlertButton({ matchId }: { matchId: string }) {
  const t = useTranslations("matches");
  const [state, setState] = useState<PushState>("unknown");

  const refresh = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function subscribe() {
    setState("working");
    try {
      const keyRes = await fetch("/api/push/vapid-key");
      if (!keyRes.ok) {
        setState("unconfigured");
        return;
      }
      const { publicKey } = (await keyRes.json()) as { publicKey: string };
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, endpoint: sub.endpoint, p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))), auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))) }),
      });
      setState(res.ok ? "on" : "error");
    } catch {
      setState("error");
    }
  }

  async function unsubscribe() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId, endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("error");
    }
  }

  if (state === "unknown" || state === "unsupported") return null;

  const labels: Record<PushState, string> = {
    unknown: "",
    unsupported: "",
    unconfigured: t("pushUnconfigured"),
    denied: t("pushDenied"),
    off: t("pushSubscribe"),
    on: t("pushSubscribed"),
    working: "…",
    error: t("pushError"),
  };

  const disabled = state === "working" || state === "unconfigured" || state === "denied" || state === "error";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={state === "on" ? unsubscribe : subscribe}
      title={labels[state]}
      aria-pressed={state === "on"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        state === "on"
          ? "border-rf-gold/40 bg-rf-gold/15 text-rf-gold"
          : "border-rf-border text-rf-fg-muted hover:border-rf-gold/40 hover:text-rf-fg",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {state === "on" ? <BellOff size={14} /> : <Bell size={14} />}
      {labels[state]}
    </button>
  );
}
