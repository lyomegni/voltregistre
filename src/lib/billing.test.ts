import { describe, expect, it } from "vitest";
import { accessState, maxSites } from "./billing";

describe("accessState", () => {
  const now = new Date("2026-10-26T12:00:00Z");
  it("compte les jours d'essai restants", () => {
    const s = accessState(
      { plan: "essai", trial_ends_at: "2026-11-02T12:00:00Z", subscription_status: null },
      now,
    );
    expect(s).toEqual({ active: true, trialDaysLeft: 7 });
  });
  it("bloque à la fin de l'essai", () => {
    const s = accessState(
      { plan: "essai", trial_ends_at: "2026-10-25T12:00:00Z", subscription_status: null },
      now,
    );
    expect(s.active).toBe(false);
  });
  it("suit le statut Stripe des abonnés", () => {
    expect(
      accessState({ plan: "pro", trial_ends_at: "", subscription_status: "active" }, now).active,
    ).toBe(true);
    expect(
      accessState({ plan: "pro", trial_ends_at: "", subscription_status: "canceled" }, now).active,
    ).toBe(false);
  });
});

describe("maxSites", () => {
  it("dépend de l'offre", () => {
    expect(maxSites({ plan: "essentiel" })).toBe(1);
    expect(maxSites({ plan: "multisites" })).toBe(10);
    expect(maxSites({ plan: "essai" })).toBe(3);
  });
});
