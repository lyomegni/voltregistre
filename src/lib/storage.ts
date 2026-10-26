import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "fichiers";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Dépose un fichier sous <org>/<dossier>/ et renvoie son chemin. */
export async function uploadFile(
  supabase: SupabaseClient,
  orgId: string,
  folder: string,
  file: Blob,
): Promise<string> {
  const ext = EXTENSIONS[file.type];
  if (!ext) throw new Error("Format de fichier non accepté (JPEG, PNG, WebP ou PDF).");
  if (file.size > 15 * 1024 * 1024) throw new Error("Fichier trop volumineux (15 Mo maximum).");
  const path = `${orgId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Échec de l'envoi du fichier : ${error.message}`);
  return path;
}

export async function signedUrl(supabase: SupabaseClient, path: string | null, seconds = 3600) {
  if (!path) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export function fileFromForm(form: FormData, name: string): File | null {
  const value = form.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}
