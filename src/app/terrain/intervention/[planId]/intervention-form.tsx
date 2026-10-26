"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { compressImage } from "@/lib/image";
import { flushQueue, queue } from "@/lib/offline-queue";
import { todayIso } from "@/lib/domain/schedule";
import { SignaturePad } from "./signature-pad";

type Answer = { label: string; ok: boolean | null; comment: string };
type Result = "conforme" | "reserves" | "non_conforme";

const RESULTS: { value: Result; label: string; tone: string }[] = [
  { value: "conforme", label: "Conforme", tone: "border-ok bg-emerald-50 text-ok" },
  { value: "reserves", label: "Avec réserves", tone: "border-warn bg-amber-50 text-warn" },
  { value: "non_conforme", label: "Non conforme", tone: "border-risk bg-red-50 text-risk" },
];

export function InterventionForm({
  planId,
  label,
  checklist,
  technician,
}: {
  planId: string;
  label: string;
  checklist: string[];
  technician: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answer[]>(checklist.map((l) => ({ label: l, ok: null, comment: "" })));
  const [extra, setExtra] = useState("");
  const [performedOn, setPerformedOn] = useState(todayIso());
  const [techName, setTechName] = useState(technician);
  const [measures, setMeasures] = useState("");
  const [comments, setComments] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [signedBy, setSignedBy] = useState("");
  const [chosen, setChosen] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggested: Result = useMemo(() => {
    if (answers.some((a) => a.ok === false)) return "non_conforme";
    return "conforme";
  }, [answers]);
  const result = chosen ?? suggested;

  function setAnswer(i: number, patch: Partial<Answer>) {
    setAnswers((prev) => prev.map((a, n) => (n === i ? { ...a, ...patch } : a)));
  }

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    try {
      const added = await Promise.all([...files].slice(0, 10 - photos.length).map((f) => compressImage(f)));
      setPhotos((p) => [...p, ...added]);
    } catch {
      setError("Impossible de lire la photo.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (answers.some((a) => a.ok === false && !a.comment.trim())) {
      setError("Décrivez chaque point non conforme : il deviendra une observation à lever.");
      return;
    }
    setBusy(true);
    try {
      const items = [...answers];
      if (extra.trim()) items.push({ label: extra.trim(), ok: false, comment: "" });
      await queue.add({
        client_ref: crypto.randomUUID(),
        control_plan_id: planId,
        performed_on: performedOn,
        technician_name: techName,
        result,
        checklist: items.map((a) => ({ label: a.label, ok: a.ok, ...(a.comment ? { comment: a.comment } : {}) })),
        measures,
        comments,
        signed_by: signedBy,
        signature,
        photos,
        label,
        queued_at: new Date().toISOString(),
      });
      flushQueue().catch(() => {});
      router.push("/terrain?enregistre=1");
    } catch {
      setError("Enregistrement impossible sur cet appareil (stockage plein ou navigation privée).");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="card grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="performed_on">Date</label>
          <input id="performed_on" type="date" required value={performedOn} max={todayIso()} onChange={(e) => setPerformedOn(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="tech">Technicien</label>
          <input id="tech" value={techName} onChange={(e) => setTechName(e.target.value)} className="input" />
        </div>
      </div>

      <fieldset className="card flex flex-col gap-3">
        <legend className="label px-1">Points de contrôle</legend>
        {answers.length === 0 && <p className="text-sm text-slate-600">Pas de liste prédéfinie pour ce contrôle.</p>}
        {answers.map((a, i) => (
          <div key={i} className="flex flex-col gap-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <p className="text-sm">{a.label}</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={a.label}>
              {([[true, "OK"], [false, "NOK"], [null, "N/A"]] as const).map(([v, l]) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={a.ok === v}
                  onClick={() => setAnswer(i, { ok: v })}
                  className={`rounded border py-2 text-sm font-medium ${
                    a.ok === v
                      ? v === true ? "border-ok bg-ok text-white" : v === false ? "border-risk bg-risk text-white" : "border-slate-500 bg-slate-500 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            {a.ok === false && (
              <input
                aria-label={`Constat pour ${a.label}`}
                placeholder="Constat (obligatoire)"
                value={a.comment}
                onChange={(e) => setAnswer(i, { comment: e.target.value })}
                className="input"
              />
            )}
          </div>
        ))}
        <div>
          <label className="label" htmlFor="extra">Autre anomalie constatée</label>
          <input id="extra" value={extra} onChange={(e) => setExtra(e.target.value)} className="input" placeholder="Laisser vide si aucune" />
        </div>
      </fieldset>

      <div className="card flex flex-col gap-3">
        <div>
          <label className="label" htmlFor="measures">Mesures relevées</label>
          <textarea id="measures" rows={3} value={measures} onChange={(e) => setMeasures(e.target.value)} className="input" placeholder={"Ex. Isolement L1/PE : 250 MΩ\nT° borne L2 : 48 °C"} />
        </div>
        <div>
          <label className="label" htmlFor="comments">Commentaires</label>
          <textarea id="comments" rows={3} value={comments} onChange={(e) => setComments(e.target.value)} className="input" />
        </div>
      </div>

      <div className="card flex flex-col gap-3">
        <label className="label" htmlFor="photos">Photos ({photos.length}/10)</label>
        <input id="photos" type="file" accept="image/*" capture="environment" multiple onChange={(e) => addPhotos(e.target.files)} className="text-sm" />
        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {photos.map((p, n) => (
              <button key={n} type="button" onClick={() => setPhotos((all) => all.filter((_, k) => k !== n))} className="relative" aria-label={`Retirer la photo ${n + 1}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="aspect-square w-full rounded object-cover" />
                <span className="absolute right-1 top-1 rounded bg-black/60 px-1 text-xs text-white">×</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <fieldset className="card flex flex-col gap-2">
        <legend className="label px-1">Résultat</legend>
        <div className="grid grid-cols-3 gap-2">
          {RESULTS.map((r) => (
            <button key={r.value} type="button" onClick={() => setChosen(r.value)} aria-pressed={result === r.value} className={`rounded border-2 px-1 py-2 text-sm font-medium ${result === r.value ? r.tone : "border-slate-200 bg-white text-slate-600"}`}>
              {r.label}
            </button>
          ))}
        </div>
        {!chosen && <p className="text-xs text-slate-500">Proposé d&apos;après les points de contrôle.</p>}
      </fieldset>

      <div className="card flex flex-col gap-3">
        <div>
          <label className="label" htmlFor="signed_by">Nom du signataire (client ou responsable)</label>
          <input id="signed_by" value={signedBy} onChange={(e) => setSignedBy(e.target.value)} className="input" />
        </div>
        <SignaturePad onChange={setSignature} />
      </div>

      {error && <p className="text-sm text-risk">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary py-3 text-base">
        {busy ? "Enregistrement…" : "Enregistrer l'intervention"}
      </button>
      <p className="text-center text-xs text-slate-500">Fonctionne sans réseau : l&apos;envoi se fait automatiquement au retour de la connexion.</p>
    </form>
  );
}
