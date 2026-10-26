import { describe, expect, it } from "vitest";
import { buildDigest } from "./digest";

describe("buildDigest", () => {
  it("met les retards en avant et échappe le HTML", () => {
    const { subject, html } = buildDigest(
      "Usine <A>",
      [
        { planId: "1", label: "VPIE", equipmentName: null, siteName: "Lyon", dueOn: "2026-10-20", alert: "retard" },
        { planId: "2", label: "Thermographie", equipmentName: "TGBT-01", siteName: "Lyon", dueOn: "2026-11-25", alert: 30 },
      ],
      "https://app.example",
    );
    expect(subject).toBe("1 contrôle en retard · Usine <A>");
    expect(html).toContain("Usine &lt;A&gt;");
    expect(html).toContain("En retard (1)");
    expect(html).toContain("Dans 30 jours (1)");
    expect(html).toContain("20/10/2026");
    expect(html).not.toContain("Dans 7 jours");
  });
});
