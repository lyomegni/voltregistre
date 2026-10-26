import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { COLORS, s } from "./styles";
import { RESULT_LABELS, type Intervention } from "@/lib/types";

type Img = { data: Buffer; format: "png" | "jpg" };

export type InterventionPdfData = {
  orgName: string;
  siteName: string;
  equipmentName: string | null;
  planLabel: string | null;
  reference: string | null;
  intervention: Intervention;
  signature: Img | null;
  photos: Img[];
};

function fr(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function InterventionReport({ d }: { d: InterventionPdfData }) {
  const i = d.intervention;
  const color = i.result === "conforme" ? COLORS.ok : i.result === "reserves" ? COLORS.warn : COLORS.risk;
  return (
    <Document title={`Rapport d'intervention ${fr(i.performed_on)}`} author={d.orgName} language="fr">
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>{d.orgName.toUpperCase()} · RAPPORT D&apos;INTERVENTION</Text>
        <Text style={s.h1}>{d.planLabel ?? "Intervention"}</Text>
        <Text style={s.muted}>
          {d.siteName}
          {d.equipmentName ? ` · ${d.equipmentName}` : ""}
          {"\n"}Réalisée le {fr(i.performed_on)} par {i.technician_name ?? "—"}
        </Text>
        {d.reference && <Text style={s.small}>{d.reference}</Text>}
        <Text style={{ marginTop: 10, fontSize: 12, fontFamily: "Helvetica-Bold", color }}>Résultat : {RESULT_LABELS[i.result]}</Text>

        <Text style={s.h2}>Points de contrôle</Text>
        {i.checklist.map((c, n) => (
          <View key={n} style={s.row} wrap={false}>
            <Text style={[s.cell, { width: "10%", fontFamily: "Helvetica-Bold", color: c.ok === true ? COLORS.ok : c.ok === false ? COLORS.risk : COLORS.muted }]}>
              {c.ok === true ? "OK" : c.ok === false ? "NOK" : "N/A"}
            </Text>
            <Text style={[s.cell, { width: "90%" }]}>
              {c.label}
              {c.comment ? `\n${c.comment}` : ""}
            </Text>
          </View>
        ))}

        {i.measures && (
          <>
            <Text style={s.h2}>Mesures</Text>
            <Text>{i.measures}</Text>
          </>
        )}
        {i.comments && (
          <>
            <Text style={s.h2}>Commentaires</Text>
            <Text>{i.comments}</Text>
          </>
        )}

        {d.photos.length > 0 && (
          <>
            <Text style={s.h2}>Photos</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {d.photos.map((p, n) => (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image key={n} src={p} style={{ width: 165, height: 124, objectFit: "cover" }} />
              ))}
            </View>
          </>
        )}

        <View style={{ marginTop: 20, flexDirection: "row", gap: 20 }} wrap={false}>
          <View style={{ flex: 1 }}>
            <Text style={s.small}>TECHNICIEN</Text>
            <Text>{i.technician_name ?? "—"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.small}>SIGNATURE {i.signed_by ? `DE ${i.signed_by.toUpperCase()}` : ""}</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {d.signature ? <Image src={d.signature} style={{ width: 160, height: 60, objectFit: "contain" }} /> : <Text>—</Text>}
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>Généré par VoltRegistre</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
