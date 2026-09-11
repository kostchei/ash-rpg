import { describe, expect, it } from "vitest";
import { assignActZones, projectPublicActPlan } from "../src/server/paths/zone-plan.js";

describe("Three Pairwise Distinct Persistent Act Zones", () => {
  it("enforces that act1.zoneId, act2.zoneId, and act3.zoneId are pairwise distinct", () => {
    // Run 50 different seeds to verify the invariant holds across all random selections
    for (let i = 0; i < 50; i++) {
      const plan = assignActZones("the_mind_below", {
        seed: `distinct_zone_test_${i}`,
        mode: "random",
      });

      const [act1, act2, act3] = plan.acts;
      expect(act1.zoneId).toBeTruthy();
      expect(act2.zoneId).toBeTruthy();
      expect(act3.zoneId).toBeTruthy();

      expect(act1.zoneId).not.toBe(act2.zoneId);
      expect(act2.zoneId).not.toBe(act3.zoneId);
      expect(act1.zoneId).not.toBe(act3.zoneId);
    }
  });

  it("supports explicit and mixed zone assignment modes", () => {
    // Explicit Act 1, random Act 2 & 3
    const plan = assignActZones("the_mind_below", {
      explicitZones: ["cesspit_city", undefined, undefined],
      seed: "mixed_seed_1",
      mode: "mixed",
    });

    expect(plan.acts[0].zoneId).toBe("cesspit_city");
    expect(plan.acts[1].zoneId).toBeTruthy();
    expect(plan.acts[2].zoneId).toBeTruthy();
    expect(plan.acts[1].zoneId).not.toBe("cesspit_city");
    expect(plan.acts[2].zoneId).not.toBe("cesspit_city");
    expect(plan.acts[1].zoneId).not.toBe(plan.acts[2].zoneId);
  });

  it("throws an error if duplicate zones are explicitly passed across acts", () => {
    expect(() => {
      assignActZones("the_mind_below", {
        explicitZones: ["cesspit_city", "cesspit_city", "black_abyss"],
        mode: "explicit",
      });
    }).toThrow(/pairwise distinct/i);
  });

  it("conceals future act destinations in public projection when campaign is secret or unrevealed", () => {
    const plan = assignActZones("the_mind_below", {
      explicitZones: ["ashen_shire", "living_sandstone", "black_abyss"],
    });

    // Act 1 secret projection
    const publicSecret = projectPublicActPlan(plan, 1, true);
    expect(publicSecret.acts[0].revealed).toBe(false);
    expect(publicSecret.acts[0].name).toContain("Uncharted Territory");
    expect(publicSecret.acts[1].revealed).toBe(false);
    expect(publicSecret.acts[2].revealed).toBe(false);

    // Act 1 standard non-secret projection (Act 1 visible, Acts 2 and 3 concealed)
    const publicStandard = projectPublicActPlan(plan, 1, false);
    expect(publicStandard.acts[0].revealed).toBe(true);
    expect(publicStandard.acts[0].name).toBe("The Ashen Shire");
    expect(publicStandard.acts[1].revealed).toBe(false);
    expect(publicStandard.acts[2].revealed).toBe(false);

    // Act 2 standard projection (Acts 1 and 2 visible, Act 3 concealed)
    const publicAct2 = projectPublicActPlan(plan, 2, false);
    expect(publicAct2.acts[0].revealed).toBe(true);
    expect(publicAct2.acts[1].revealed).toBe(true);
    expect(publicAct2.acts[1].name).toBe("The Living Sandstone");
    expect(publicAct2.acts[2].revealed).toBe(false);
  });
});
