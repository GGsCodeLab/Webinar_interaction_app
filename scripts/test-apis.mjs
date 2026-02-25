#!/usr/bin/env node
/**
 * Quick API smoke tests. Run with: node scripts/test-apis.mjs
 * Requires server running: npm run dev (in another terminal)
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

async function request(method, path, options = {}) {
  const url = path.startsWith("http") ? path : BASE + path;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function main() {
  const results = [];
  function ok(name, pass, detail = "") {
    results.push({ name, pass, detail });
    console.log(pass ? `  \x1b[32m✓\x1b[0m ${name}` : `  \x1b[31m✗\x1b[0m ${name}${detail ? " — " + detail : ""}`);
  }

  console.log("\n--- Quiz APIs ---\n");

  let r = await request("GET", "/api/quizzes");
  ok("GET /api/quizzes", r.status === 200 && Array.isArray(r.body), r.status === 200 ? "" : `status ${r.status}`);

  r = await request("POST", "/api/quizzes", { body: JSON.stringify({}) });
  ok("POST /api/quizzes (no auth)", r.status === 401, `status ${r.status}`);

  r = await request("POST", "/api/quizzes", { body: JSON.stringify({ name: "Test Quiz" }) });
  ok(
    "POST /api/quizzes (no auth, with name)",
    r.status === 401,
    r.status === 401 ? "" : `status ${r.status} (expected 401)`
  );

  r = await request("POST", "/api/quizzes", { body: "not json" });
  ok("POST /api/quizzes (invalid JSON)", r.status === 400 || r.status === 401, `status ${r.status}`);

  r = await request("GET", "/api/quizzes/1");
  ok("GET /api/quizzes/1", r.status === 200 || r.status === 404, `status ${r.status}`);

  console.log("\n--- State API ---\n");
  r = await request("GET", "/api/state");
  ok("GET /api/state", r.status === 200 && r.body && typeof r.body.type === "string", `status ${r.status}`);

  console.log("\n--- Polls / Topics ---\n");
  r = await request("GET", "/api/topics");
  ok("GET /api/topics", r.status === 200 && Array.isArray(r.body), `status ${r.status}`);

  console.log("\n--- Summary ---\n");
  const passed = results.filter((x) => x.pass).length;
  const failed = results.filter((x) => !x.pass);
  if (failed.length) {
    console.log(`Passed: ${passed}/${results.length}. Failed: ${failed.map((f) => f.name).join(", ")}`);
    process.exit(1);
  }
  console.log(`All ${results.length} checks passed.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
