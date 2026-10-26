import { StyleSheet } from "@react-pdf/renderer";

export const COLORS = { ink: "#17232b", muted: "#55636c", line: "#d5dad8", accent: "#b86a00", ok: "#2f7d4f", warn: "#a35b00", risk: "#b3362c", soft: "#f3f4f2" };

export const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: COLORS.ink, lineHeight: 1.35 },
  brand: { fontSize: 10, fontFamily: "Helvetica-Bold", color: COLORS.accent, letterSpacing: 1 },
  h1: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 6 },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 6, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: COLORS.ink },
  muted: { color: COLORS.muted },
  small: { fontSize: 7.5, color: COLORS.muted },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: COLORS.line, paddingVertical: 3 },
  head: { flexDirection: "row", backgroundColor: COLORS.soft, paddingVertical: 3, fontFamily: "Helvetica-Bold", fontSize: 7.5, color: COLORS.muted },
  cell: { paddingHorizontal: 3 },
  stats: { flexDirection: "row", borderWidth: 1.5, borderColor: COLORS.ink, marginTop: 12 },
  stat: { flex: 1, padding: 8, borderRightWidth: 0.5, borderRightColor: COLORS.line },
  statValue: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 2 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 7, color: COLORS.muted, flexDirection: "row", justifyContent: "space-between" },
});
