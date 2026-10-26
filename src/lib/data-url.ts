/** Convertit une image « data: » reçue du téléphone en Blob (côté serveur). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",", 2);
  const type = head.match(/^data:([^;]+);base64$/)?.[1];
  if (!type || !body) throw new Error("Image invalide");
  const bin = Buffer.from(body, "base64");
  return new Blob([new Uint8Array(bin)], { type });
}
