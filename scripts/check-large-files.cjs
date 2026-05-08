/**
 * Lists App Router pages/layouts by line count.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SCAN_ROOTS = [path.join(ROOT, "src", "app")];
const EXTENSIONS = new Set([".tsx", ".ts"]);
const WARN_LINES = Number(process.env.LARGE_FILE_WARN_LINES || 500);
const FAIL_LINES = Number(process.env.LARGE_FILE_FAIL_LINES || 10000);

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

  console.log("Large route/layout modules (line counts):\n");
  let worst = 0;
  for (const r of rows) {
    console.log(String(r.lines).padStart(5) + "  " + r.file);
    if (r.lines > worst) worst = r.lines;
    if (r.lines >= WARN_LINES) {
      console.warn("  ^ warning: " + r.file + " has " + r.lines + " lines (warn >= " + WARN_LINES + ")");
    }
  }

  if (worst >= FAIL_LINES) {
    console.error("\ncheck-large-files: FAIL -- " + worst + " lines exceeds LARGE_FILE_FAIL_LINES=" + FAIL_LINES);
    process.exit(1);
  }

  console.log("\nOK (fail threshold " + FAIL_LINES + " lines). Set LARGE_FILE_FAIL_LINES to tighten.");
}

main();