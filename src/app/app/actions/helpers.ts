import { redirect } from "next/navigation";

export function str(form: FormData, name: string): string | null {
  const v = form.get(name);
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s === "" ? null : s;
}

export function required(form: FormData, name: string, label: string): string {
  const v = str(form, name);
  if (!v) throw new Error(`Champ obligatoire : ${label}`);
  return v;
}

export function dateField(form: FormData, name: string): string | null {
  const v = str(form, name);
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error("Date invalide");
  return v;
}

export function intField(form: FormData, name: string, min: number, max: number): number {
  const n = Number(str(form, name));
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`Valeur attendue entre ${min} et ${max}`);
  }
  return n;
}

/** Redirige vers la page avec un message d'erreur lisible plutôt qu'une page d'erreur. */
export function failTo(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "Erreur inattendue";
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}erreur=${encodeURIComponent(message)}`);
}

export function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export function checkOne<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null || result.data === undefined) throw new Error("Enregistrement introuvable");
  return result.data;
}
