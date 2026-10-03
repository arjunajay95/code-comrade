import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Fails on any high or critical advisory unless it is waived by id and package
// in audit-allowlist.json. A waiver stops working after its expiry date, so an
// exception is always a decision that gets revisited. Run from the folder being
// audited. npm audit reads that folder's lockfile.
const FAILING_SEVERITIES = new Set(["high", "critical"]);
const allowlistUrl = new URL("../audit-allowlist.json", import.meta.url);

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

// A fixed command string with no user input. The shell lets Windows find npm,
// which is a .cmd file there. npm audit exits non-zero when it finds anything,
// so only its output is read, not its exit code.
const run = spawnSync("npm audit --json", {
  encoding: "utf8",
  shell: true,
  maxBuffer: 64 * 1024 * 1024,
});

let report;
try {
  report = JSON.parse(run.stdout);
} catch {
  fail(`Could not read the npm audit output, so the gate fails closed.\n${run.stderr || run.stdout}`);
}
if (report.error) {
  fail(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`);
}

// A string in "via" only names another package. An object is the advisory
// itself, so reading the objects counts each advisory once, however many
// packages depend on the affected one.
const advisories = new Map();
for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vulnerability.via) {
    if (typeof via !== "object") continue;
    const id = /GHSA-[a-z0-9-]+/i.exec(via.url ?? "")?.[0] ?? `npm-${via.source}`;
    advisories.set(id.toLowerCase(), { id, package: via.name, severity: via.severity, title: via.title });
  }
}

const { waivers } = JSON.parse(readFileSync(allowlistUrl, "utf8"));
const active = new Map();
const lapsed = new Map();
for (const waiver of waivers) {
  // A waiver lasts through its expiry date, in UTC.
  const endOfDay = new Date(`${waiver.expires}T23:59:59Z`);
  if (Number.isNaN(endOfDay.getTime())) fail(`Waiver ${waiver.id} needs an expires date as YYYY-MM-DD.`);
  (endOfDay >= new Date() ? active : lapsed).set(waiver.id.toLowerCase(), waiver);
}

const blocking = [];
const matched = new Set();
for (const [key, advisory] of advisories) {
  if (!FAILING_SEVERITIES.has(advisory.severity)) continue;
  const waiver = active.get(key);
  // The package must match too, so the same id on another package still blocks.
  if (waiver && waiver.package === advisory.package) {
    matched.add(key);
    continue;
  }
  blocking.push(advisory);
}

for (const [key, waiver] of active) {
  console.log(matched.has(key) ? `Waived until ${waiver.expires}: ${waiver.id} (${waiver.package}). ${waiver.reason}` : `Note: the waiver for ${waiver.id} matched nothing here. Remove it once no folder needs it.`);
}

if (blocking.length > 0) {
  console.error("Blocking advisories:");
  for (const advisory of blocking) {
    const expired = lapsed.get(advisory.id.toLowerCase());
    console.error(`- ${advisory.id} ${advisory.package} (${advisory.severity}): ${advisory.title}` + (expired ? ` [waiver expired ${expired.expires}]` : ""));
  }
  process.exit(1);
}
console.log("Audit gate passed: no unwaived high or critical advisories.");
