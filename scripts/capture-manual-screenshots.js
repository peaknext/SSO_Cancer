#!/usr/bin/env node

/**
 * Capture screenshots for the user manual.
 *
 * Prerequisites:
 *   - API running on port 48002
 *   - Web dev server running on port 47001
 *   - Google Chrome installed at the default Windows path
 *
 * Usage:
 *   node scripts/capture-manual-screenshots.js
 *   node scripts/capture-manual-screenshots.js --base http://localhost:47001
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE = process.argv.find((a) => a.startsWith('--base='))
  ? process.argv.find((a) => a.startsWith('--base=')).split('=')[1]
  : 'http://localhost:47001';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const OUTPUT_DIR = path.resolve(__dirname, '..', 'apps', 'web', 'public', 'images', 'manual');

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 };

const LOGIN_EMAIL = 'admin@sso-cancer.local';
const LOGIN_PASSWORD = 'Admin@1234';

// ---------------------------------------------------------------------------
// Screenshot definitions
// ---------------------------------------------------------------------------

const SCREENSHOTS = [
  // Pre-login
  { name: '01-login.png', url: '/login', preLogin: true },

  // Dashboard & Layout
  { name: '02-layout-overview.png', url: '/', delay: 3000 },
  { name: '03-dashboard-stats.png', url: '/', delay: 3000 },

  // Cancer Patients
  { name: '04-patient-list.png', url: '/cancer-patients' },
  { name: '05-patient-detail.png', url: '/cancer-patients', clickFirstRow: true },
  { name: '06-patient-new.png', url: '/cancer-patients/new' },

  // Protocol Analysis
  { name: '07-protocol-analysis.png', url: '/protocol-analysis' },
  { name: '08-import-page.png', url: '/protocol-analysis/import' },

  // Reference Data
  { name: '09-protocol-list.png', url: '/protocols' },
  { name: '10-protocol-detail.png', url: '/protocols', clickFirstRow: true },
  { name: '11-regimen-list.png', url: '/regimens' },
  { name: '12-drug-list.png', url: '/drugs' },
  { name: '13-cancer-sites.png', url: '/cancer-sites' },

  // Export
  { name: '14-ssop-export.png', url: '/ssop-export' },
  { name: '15-cipn-export.png', url: '/cipn-export' },

  // Profile
  { name: '16-profile.png', url: '/profile' },

  // Settings
  { name: '17-settings-users.png', url: '/settings/users' },
  { name: '18-settings-app.png', url: '/settings/app' },
  { name: '19-settings-ai.png', url: '/settings/ai' },
  { name: '20-settings-aipn.png', url: '/settings/aipn-catalog' },
  { name: '21-settings-audit-logs.png', url: '/settings/audit-logs' },
  { name: '22-settings-scan-logs.png', url: '/settings/scan-logs' },
  { name: '23-settings-backup.png', url: '/settings/backup' },
  { name: '24-settings-maintenance.png', url: '/settings/maintenance' },

  // User Manual
  { name: '25-user-manual.png', url: '/user-manual' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForLoad(page, ms = 1500) {
  await new Promise((r) => setTimeout(r, ms));
}

async function ensureLightMode(page) {
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.setAttribute('data-theme', 'light');
    // next-themes stores in localStorage key 'theme'
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Manual Screenshot Capture ===');
  console.log(`Base URL : ${BASE}`);
  console.log(`Chrome   : ${CHROME_PATH}`);
  console.log(`Output   : ${OUTPUT_DIR}`);
  console.log(`Viewport : ${VIEWPORT.width}x${VIEWPORT.height}`);
  console.log('');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: VIEWPORT,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--force-color-profile=srgb',
    ],
  });

  const page = await browser.newPage();

  // Disable animations for cleaner screenshots
  await page.evaluateOnNewDocument(() => {
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `;
    document.head.appendChild(style);
  });

  const results = { success: [], failed: [] };

  // -----------------------------------------------------------------------
  // Step 1: Capture login page (pre-login)
  // -----------------------------------------------------------------------
  const loginShot = SCREENSHOTS.find((s) => s.preLogin);
  if (loginShot) {
    try {
      console.log(`[1/25] Capturing ${loginShot.name} ...`);
      await page.goto(`${BASE}${loginShot.url}`, { waitUntil: 'networkidle0', timeout: 30000 });
      await waitForLoad(page, 1000);
      await page.screenshot({ path: path.join(OUTPUT_DIR, loginShot.name), type: 'png' });
      results.success.push(loginShot.name);
      console.log(`  ✓ ${loginShot.name}`);
    } catch (err) {
      results.failed.push({ name: loginShot.name, error: err.message });
      console.log(`  ✗ ${loginShot.name}: ${err.message}`);
    }
  }

  // -----------------------------------------------------------------------
  // Step 2: Log in via API directly, then set cookies + auth state
  // -----------------------------------------------------------------------
  console.log('\nLogging in via API...');
  try {
    // Login via API to get access token and refresh cookie
    const loginResp = await page.evaluate(
      async (email, password, base) => {
        const resp = await fetch(`${base}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        });
        return { status: resp.status, data: await resp.json() };
      },
      LOGIN_EMAIL,
      LOGIN_PASSWORD,
      BASE,
    );

    if (loginResp.status !== 201 && loginResp.status !== 200) {
      throw new Error(`Login API returned ${loginResp.status}: ${JSON.stringify(loginResp.data)}`);
    }

    const loginData = loginResp.data.data || loginResp.data;
    const accessToken = loginData.accessToken;
    const user = loginData.user;

    if (!accessToken) {
      throw new Error('No accessToken in login response');
    }

    console.log(`  ✓ API login OK (token: ${accessToken.slice(0, 20)}...)`);

    // Set auth state in localStorage (Zustand persist)
    await page.evaluate(
      (token, user) => {
        const authState = {
          state: {
            user: user,
            accessToken: token,
            isAuthenticated: true,
            isHydrating: false,
          },
          version: 0,
        };
        localStorage.setItem('sso-cancer-auth', JSON.stringify(authState));
        localStorage.setItem('theme', 'light');
      },
      accessToken,
      user,
    );

    // Set auth cookie via puppeteer API (ensures middleware sees it)
    await page.setCookie({
      name: 'sso-cancer-auth-flag',
      value: '1',
      domain: 'localhost',
      path: '/',
      sameSite: 'Strict',
      expires: Math.floor(Date.now() / 1000) + 604800,
    });

    // Navigate to dashboard to verify auth works
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 30000 });
    await waitForLoad(page, 2000);

    // Verify we're on dashboard (not redirected to login)
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error('Still on login page after auth setup');
    }

    // Ensure light mode is applied
    await ensureLightMode(page);
    await waitForLoad(page, 500);

    console.log(`  ✓ Authenticated and on dashboard (${currentUrl})\n`);
  } catch (err) {
    console.error(`  ✗ Login failed: ${err.message}`);
    console.error('  Cannot continue without login. Exiting.');
    await browser.close();
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // Step 3: Capture all post-login pages
  // -----------------------------------------------------------------------
  const postLoginShots = SCREENSHOTS.filter((s) => !s.preLogin);
  let idx = 2;

  for (const shot of postLoginShots) {
    idx++;
    const label = `[${idx}/${SCREENSHOTS.length}]`;

    try {
      console.log(`${label} Capturing ${shot.name} ...`);

      // Navigate
      await page.goto(`${BASE}${shot.url}`, { waitUntil: 'networkidle0', timeout: 30000 });
      await waitForLoad(page, shot.delay || 1500);

      // Check if redirected to login (token expired)
      if (page.url().includes('/login') && shot.url !== '/login') {
        console.log(`  (redirected to login — re-auth needed, skipping)`);
        results.failed.push({ name: shot.name, error: 'Redirected to login' });
        continue;
      }

      // Ensure light mode persists
      await ensureLightMode(page);
      await waitForLoad(page, 300);

      // If we need to click the first table row to get a detail page
      if (shot.clickFirstRow) {
        try {
          // Try clicking a table row link
          const link = await page.$('table tbody tr a, table tbody tr td a, [data-row-link]');
          if (link) {
            await link.click();
            await page
              .waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 })
              .catch(() => {});
            await waitForLoad(page, 1500);
          } else {
            // No rows — screenshot the empty list as-is
            console.log(`  (no table rows found, using list view)`);
          }
        } catch {
          console.log(`  (click-first-row failed, using current view)`);
        }
      }

      // Take screenshot
      await page.screenshot({ path: path.join(OUTPUT_DIR, shot.name), type: 'png' });
      results.success.push(shot.name);
      console.log(`  ✓ ${shot.name}`);
    } catch (err) {
      results.failed.push({ name: shot.name, error: err.message });
      console.log(`  ✗ ${shot.name}: ${err.message}`);
    }
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  await browser.close();

  console.log('\n=== Summary ===');
  console.log(`Success: ${results.success.length}/${SCREENSHOTS.length}`);
  console.log(`Failed : ${results.failed.length}/${SCREENSHOTS.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed screenshots:');
    for (const f of results.failed) {
      console.log(`  - ${f.name}: ${f.error}`);
    }
  }

  console.log(`\nScreenshots saved to: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
