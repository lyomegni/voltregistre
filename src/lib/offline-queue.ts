/** File d'attente IndexedDB des interventions saisies hors ligne. */

export type QueuedIntervention = {
  client_ref: string;
  control_plan_id: string;
  performed_on: string;
  technician_name: string;
  result: "conforme" | "reserves" | "non_conforme";
  checklist: { label: string; ok: boolean | null; comment?: string }[];
  measures: string;
  comments: string;
  signed_by: string;
  signature: string | null; // data URL PNG
  photos: string[]; // data URLs JPEG
  label: string; // pour l'affichage dans la file
  queued_at: string;
};

const DB = "voltregistre";
const STORE = "interventions";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "client_ref" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const queue = {
  add: (item: QueuedIntervention) => tx("readwrite", (s) => s.put(item)),
  all: () => tx<QueuedIntervention[]>("readonly", (s) => s.getAll()),
  remove: (ref: string) => tx("readwrite", (s) => s.delete(ref)),
};

export const QUEUE_EVENT = "voltregistre:queue";

/** Envoie les interventions en attente. Renvoie le nombre restant. */
export async function flushQueue(): Promise<number> {
  const items = await queue.all();
  for (const item of items) {
    try {
      const res = await fetch("/api/interventions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        await queue.remove(item.client_ref);
      } else if (res.status === 400 || res.status === 403 || res.status === 404) {
        // Donnée refusée définitivement : on la garde pour ne rien perdre, mais on la marque.
        console.error("Intervention refusée", item.client_ref, await res.text());
      } else {
        break; // erreur serveur ou session expirée : on réessaiera plus tard
      }
    } catch {
      break; // hors ligne
    }
  }
  const left = (await queue.all()).length;
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT, { detail: left }));
  return left;
}
