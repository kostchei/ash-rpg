import { describe, expect, it } from "vitest";
import { runPathProgressionAudit } from "../src/server/paths/audit.js";

describe("Progression & Probability Audit Simulation", () => {
  it("verifies >= 95% of standard-exploration runs reach Level 9 by finale entry and Level 10 at success", () => {
    // Run simulation over 200 representative seeded runs
    const report = runPathProgressionAudit({
      pathId: "the_mind_below",
      iterations: 200,
      partySize: 4,
      accessRate: 0.90,
      explorationRate: 0.95,
      baseSeed: "fast_ci_audit_seed",
    });

    // Check release criteria: >= 95% reach level 9 by finale entry
    expect(report.level9FinaleSuccessRate).toBeGreaterThanOrEqual(0.95);

    // Check completion level: >= 95% reach level 10 upon campaign success
    expect(report.level10CompletionSuccessRate).toBeGreaterThanOrEqual(0.95);

    // Verify percentiles
    expect(report.percentiles.finaleEntryLevel.p50).toBeGreaterThanOrEqual(9);
    expect(report.percentiles.completionLevel.p50).toBe(10);
    expect(report.percentiles.completionLevel.p95).toBe(10);

    // Verify 50% group treasure drop probability in action
    const totalDrops = report.averageDropsCount.total;
    const positiveFraction = report.averageDropsCount.positive / Math.max(1, totalDrops);
    // Should be close to 0.5 (between 0.42 and 0.58 across runs)
    expect(positiveFraction).toBeGreaterThanOrEqual(0.42);
    expect(positiveFraction).toBeLessThanOrEqual(0.58);
  });
});
