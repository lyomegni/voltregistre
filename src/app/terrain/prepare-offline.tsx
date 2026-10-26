"use client";

import { useState } from "react";

/** Charge à l'avance les fiches d'intervention pour pouvoir les ouvrir sans réseau. */
export function PrepareOffline({ urls }: { urls: string[] }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  if (urls.length === 0) return null;
  async function run() {
    setState("busy");
    await Promise.allSettled(urls.map((u) => fetch(u, { credentials: "same-origin" })));
    setState("done");
  }
  return (
    <button type="button" onClick={run} disabled={state === "busy"} className="btn-secondary">
      {state === "done"
        ? `${urls.length} fiches disponibles hors ligne`
        : state === "busy"
          ? "Préparation…"
          : "Préparer ces fiches pour le hors ligne"}
    </button>
  );
}
