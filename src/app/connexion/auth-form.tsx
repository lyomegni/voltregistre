"use client";

import { useActionState, useState } from "react";
import { sendMagicLink, signIn, signUp, type AuthState } from "./actions";

const MODES = {
  connexion: { label: "Se connecter", action: signIn },
  inscription: { label: "Créer un compte", action: signUp },
  lien: { label: "Recevoir un lien", action: sendMagicLink },
} as const;

type Mode = keyof typeof MODES;

export function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("connexion");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded border border-slate-200 bg-slate-50 p-1 text-sm" role="tablist">
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded px-2 py-1.5 ${mode === m ? "bg-white font-medium shadow-sm" : "text-slate-600"}`}
          >
            {m === "connexion" ? "Connexion" : m === "inscription" ? "Inscription" : "Lien e-mail"}
          </button>
        ))}
      </div>
      <ModeForm key={mode} mode={mode} next={next} />
    </div>
  );
}

function ModeForm({ mode, next }: { mode: Mode; next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(MODES[mode].action, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="suite" value={next} />
      <div>
        <label htmlFor="email" className="label">E-mail professionnel</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      {mode !== "lien" && (
        <div>
          <label htmlFor="password" className="label">Mot de passe</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={mode === "inscription" ? 8 : undefined}
            autoComplete={mode === "inscription" ? "new-password" : "current-password"}
            className="input"
          />
        </div>
      )}
      {state.error && <p className="text-sm text-risk">{state.error}</p>}
      {state.info && <p className="text-sm text-ok">{state.info}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Patientez…" : MODES[mode].label}
      </button>
    </form>
  );
}
