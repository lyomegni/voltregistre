"use client";

import { useEffect, useState } from "react";
import { QUEUE_EVENT, flushQueue, queue } from "@/lib/offline-queue";

/** Affiche l'état réseau et le nombre d'interventions en attente ; synchronise au retour du réseau. */
export function SyncBadge() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    setOnline(navigator.onLine);
    queue.all().then((q) => setPending(q.length)).catch(() => {});
    const sync = () => flushQueue().then(setPending).catch(() => {});
    const goOnline = () => {
      setOnline(true);
      sync();
    };
    const goOffline = () => setOnline(false);
    const onQueue = (e: Event) => setPending((e as CustomEvent<number>).detail);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener(QUEUE_EVENT, onQueue);
    if (navigator.onLine) sync();
    const timer = setInterval(() => navigator.onLine && sync(), 60_000);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener(QUEUE_EVENT, onQueue);
      clearInterval(timer);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => flushQueue().then(setPending)}
      className={`rounded px-2 py-1 font-mono text-[11px] ${online ? "bg-white/10" : "bg-volt-bright text-ink"}`}
      title="Synchroniser maintenant"
    >
      {online ? "En ligne" : "Hors ligne"}
      {pending > 0 && ` · ${pending} à envoyer`}
    </button>
  );
}
