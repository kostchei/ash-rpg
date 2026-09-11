import { runPathProgressionAudit, formatAuditMarkdown } from "../src/server/paths/audit.js";

const iterations = parseInt(process.env.AUDIT_ITERATIONS || "1000", 10);
const pathId = process.env.AUDIT_PATH_ID || "the_mind_below";

console.log(`Running progression audit simulation for "${pathId}" over ${iterations} runs...`);
const report = runPathProgressionAudit({
  pathId,
  iterations,
  partySize: 4,
  accessRate: 0.90,
  explorationRate: 0.95,
  baseSeed: "release_audit_campaign_seed",
});

const md = formatAuditMarkdown(report);
console.log(md);

if (report.level9FinaleSuccessRate < 0.95) {
  console.error(`WARNING: Level 9 finale entry rate ${(report.level9FinaleSuccessRate * 100).toFixed(1)}% is below the 95% target.`);
  process.exit(1);
} else {
  console.log("Audit PASSED: >=95% reached Level 9 by finale entry!");
}
