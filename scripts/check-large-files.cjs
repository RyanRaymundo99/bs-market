/**
 * Lists App Router pages/layouts by line count.
 *
 * Fails when any page/layout has more than LARGE_FILE_FAIL_LINES (default 800),
 * except paths listed in scripts/large-files-allowlist.json (grandfathered until split).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SCAN_ROOTS = [path.join(ROOT, "src", "app")];
const ALLOWLIST_JSON = path.join(ROOT, "scripts", "large-files-allowlist.json");
const EXTENSIONS = new Set([".tsx", ".ts"]);
const WARN_LINES = Number(process.env.LARGE_FILE_WARN_LINES || 500);
const FAIL_LINES = Number(process.env.LARGE_FILE_FAIL_LINES || 800);

function loadAllowlist() {
  try {
    const raw = fs.readFileSync(ALLOWLIST_JSON, "utf8");
    const data = JSON.parse(raw);
    const list = data.allowUntilSplit;
    if (!Array.isArray(list)) return new Set();
    return new Set(list.map((p) => String(p).replace(/\\/g, "/")));
  } catch {
    return new Set();
  }
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (EXTENSIONS.has(path.extname(name))) acc.push(full);
  }
  return acc;
}

function countLines(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw) return 0;
  return raw.split(/\r\n|\r|\n/).length;
}

function main() {
  const files = [];
  for (const root of SCAN_ROOTS) walk(root, files);

  const rows = files
    .filter((f) => {
      const rel = path.relative(ROOT, f).replace(/\\/g, "/");
      return (
        rel.endsWith("/page.tsx") ||
        rel.endsWith("/page.ts") ||
        rel.endsWith("/layout.tsx") ||
        rel.endsWith("/layout.ts")
      );
    })
    .map((f) => ({
      file: path.relative(ROOT, f).replace(/\\/g, "/"),
      lines: countLines(f),
    }))
    .sort((a, b) => b.lines - a.lines);

  const allowUntilSplit = loadAllowlist();

  console.log("Large route/layout modules (line counts):\n");
  let worst = 0;
  for (const r of rows) {
    console.log(String(r.lines).padStart(5) + "  " + r.file);
    if (r.lines > worst) worst = r.lines;
    if (r.lines >= WARN_LINES) {
      console.warn("  ^ warning: " + r.file + " has " + r.lines + " lines (warn >= " + WARN_LINES + ")");
    }
  }

  const violations = rows.filter(
    (r) => r.lines > FAIL_LINES && !allowUntilSplit.has(r.file)
  );

  if (violations.length > 0) {
    console.error(
      "\ncheck-large-files: FAIL — " +
        violations.length +
        " file(s) exceed " +
        FAIL_LINES +
        " lines (not allowlisted). Remove/trim or add to scripts/large-files-allowlist.json only if grandfathering is intentional.\n"
    );
    for (const v of violations) {
      console.error("  " + v.lines + "  " + v.file);
    }
    process.exit(1);
  }

  console.log(
    "\nOK (max " +
      FAIL_LINES +
      " lines for new/extra routes; worst file " +
      worst +
      " lines; allowlist size " +
      allowUntilSplit.size +
      ")."
  );
}

main();