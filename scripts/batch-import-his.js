#!/usr/bin/env node
/**
 * Batch import all patients from HIS API.
 *
 * Usage:
 *   node scripts/batch-import-his.js [--concurrency 3] [--from 2024-01-01] [--to 2027-12-31]
 *
 * Requires: API server running on localhost:48002
 */

const API = 'http://localhost:48002/api/v1';
const DEFAULT_CONCURRENCY = 1;
const DEFAULT_FROM = '2024-01-01';
const DEFAULT_TO = '2027-12-31';
const DELAY_BETWEEN_MS = 1200; // 1.2s between each request to stay under 60 req/min rate limit
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 5000; // 5s base delay for retry backoff

// ─── Parse CLI args ──────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    concurrency: DEFAULT_CONCURRENCY,
    from: DEFAULT_FROM,
    to: DEFAULT_TO,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--concurrency' && args[i + 1]) opts.concurrency = parseInt(args[++i], 10);
    if (args[i] === '--from' && args[i + 1]) opts.from = args[++i];
    if (args[i] === '--to' && args[i + 1]) opts.to = args[++i];
  }
  return opts;
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sso-cancer.local', password: 'Admin@1234' }),
  });
  const json = await res.json();
  const token = json.data?.accessToken || json.accessToken;
  if (!token) throw new Error('Login failed: ' + JSON.stringify(json));
  return token;
}

async function getPatientHns(token) {
  // Fetch all patients to get their HN list
  let page = 1;
  const limit = 100;
  const hns = [];
  while (true) {
    const res = await fetch(`${API}/cancer-patients?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    const patients = json.data || [];
    if (patients.length === 0) break;
    for (const p of patients) {
      if (p.hn) hns.push(p.hn);
    }
    const totalPages = json.meta?.totalPages || 1;
    if (page >= totalPages) break;
    page++;
  }
  return [...new Set(hns)]; // deduplicate
}

async function importPatient(token, hn, from, to, retryCount = 0) {
  const url = `${API}/his-integration/import/${encodeURIComponent(hn)}?from=${from}&to=${to}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  if (!res.ok) {
    // Retry on rate limiting (429) with exponential backoff
    if (res.status === 429 && retryCount < MAX_RETRIES) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
      process.stdout.write(`\n    ⏳ HN ${hn}: Rate limited, retrying in ${delay / 1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})...\n`);
      await sleep(delay);
      return importPatient(token, hn, from, to, retryCount + 1);
    }
    return { hn, ok: false, error: json.error?.message || json.message || res.statusText };
  }
  const d = json.data || json;
  return {
    hn,
    ok: true,
    visits: d.importedVisits ?? d.visits ?? 0,
    meds: d.totalMedications ?? 0,
    billing: d.totalBillingItems ?? 0,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Concurrency pool ────────────────────────────────────────────────────────

async function runPool(tasks, concurrency, delayMs) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      if (delayMs > 0 && i > 0) await sleep(delayMs);
      results[i] = await tasks[i]();
    }
  }

  const workers = [];
  for (let w = 0; w < Math.min(concurrency, tasks.length); w++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  HIS Batch Import                                ║`);
  console.log(`║  Concurrency: ${String(opts.concurrency).padEnd(3)}  From: ${opts.from}  To: ${opts.to} ║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);

  // 1. Login
  process.stdout.write('Logging in... ');
  const token = await login();
  console.log('OK');

  // 2. Get all patient HNs
  process.stdout.write('Loading patient list... ');
  const hns = await getPatientHns(token);
  console.log(`${hns.length} patients found\n`);

  if (hns.length === 0) {
    console.log('No patients to import.');
    return;
  }

  // 3. Import each patient
  const startTime = Date.now();
  let done = 0;
  let totalVisits = 0;
  let totalMeds = 0;
  let totalBilling = 0;
  let errors = 0;

  const tasks = hns.map((hn) => async () => {
    const result = await importPatient(token, hn, opts.from, opts.to);
    done++;
    const pct = Math.round((done / hns.length) * 100);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const eta = done > 0 ? Math.round(((Date.now() - startTime) / done) * (hns.length - done) / 1000) : '?';

    if (result.ok) {
      totalVisits += result.visits;
      totalMeds += result.meds;
      totalBilling += result.billing;
      process.stdout.write(
        `\r  [${pct}%] ${done}/${hns.length} | HN ${hn}: ${result.visits} visits | Total: ${totalVisits} visits | ${elapsed}s elapsed, ~${eta}s left   `,
      );
    } else {
      errors++;
      process.stdout.write(
        `\r  [${pct}%] ${done}/${hns.length} | HN ${hn}: ERROR ${result.error}                              \n`,
      );
    }
    return result;
  });

  const results = await runPool(tasks, opts.concurrency, DELAY_BETWEEN_MS);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  Import Complete                                 ║`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║  Patients processed: ${String(hns.length).padEnd(28)}║`);
  console.log(`║  Total visits imported: ${String(totalVisits).padEnd(25)}║`);
  console.log(`║  Total medications: ${String(totalMeds).padEnd(28)}║`);
  console.log(`║  Total billing items: ${String(totalBilling).padEnd(26)}║`);
  console.log(`║  Errors: ${String(errors).padEnd(39)}║`);
  console.log(`║  Time: ${String(elapsed + 's').padEnd(41)}║`);
  console.log(`╚══════════════════════════════════════════════════╝`);

  // List errors
  const errorResults = results.filter((r) => !r.ok);
  if (errorResults.length > 0) {
    console.log(`\nErrors:`);
    for (const r of errorResults) {
      console.log(`  HN ${r.hn}: ${r.error}`);
    }
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
