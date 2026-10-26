import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/env";
import { categoryLabel } from "@/lib/domain/categories";

/** Étiquette SVG (70 × 40 mm) à imprimer et coller sur l'équipement. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: eq } = await supabase
    .from("equipment")
    .select("name, category, qr_token, site:sites(name)")
    .eq("id", id)
    .maybeSingle();
  if (!eq) return new Response("Introuvable", { status: 404 });
  const site = (eq.site as unknown as { name: string } | null)?.name ?? "";
  const qr = QRCode.create(`${appUrl()}/e/${eq.qr_token}`, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const cell = 34 / n;
  let rects = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.modules.get(x, y)) rects += `<rect x="${(3 + x * cell).toFixed(3)}" y="${(3 + y * cell).toFixed(3)}" width="${cell.toFixed(3)}" height="${cell.toFixed(3)}"/>`;
    }
  }
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="70mm" height="40mm" viewBox="0 0 70 40">
<rect width="70" height="40" fill="#fff" stroke="#17232b" stroke-width="0.4"/>
<g fill="#17232b">${rects}</g>
<text x="40" y="12" font-family="Arial, sans-serif" font-size="4.5" font-weight="bold" fill="#17232b">${esc(eq.name.slice(0, 12))}</text>
<text x="40" y="19" font-family="Arial, sans-serif" font-size="3" fill="#17232b">${esc(categoryLabel(eq.category).slice(0, 18))}</text>
<text x="40" y="24" font-family="Arial, sans-serif" font-size="3" fill="#55636c">${esc(site.slice(0, 18))}</text>
<text x="40" y="35" font-family="Arial, sans-serif" font-size="2.6" fill="#55636c">Scanner pour la fiche</text>
<text x="40" y="38" font-family="Arial, sans-serif" font-size="2.6" font-weight="bold" fill="#b86a00">VoltRegistre</text>
</svg>`;
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "content-disposition": `attachment; filename="etiquette-${eq.name.replace(/[^\w-]+/g, "_")}.svg"`,
    },
  });
}
