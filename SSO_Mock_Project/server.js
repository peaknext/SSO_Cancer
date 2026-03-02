'use strict';

const express = require('express');
const { generateAllVisits } = require('./data/generate-visits');

// ── Configuration ─────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT, 10) || 4001;
const API_KEY = process.env.HIS_API_KEY;
if (!API_KEY) {
  console.error('[mock-his] ERROR: HIS_API_KEY environment variable is required.');
  console.error('[mock-his] Usage: HIS_API_KEY=your-key node server.js');
  process.exit(1);
}

// ── Generate mock data at startup ─────────────────────────────────────────────

const dataStore = generateAllVisits();
const totalVisits = [...dataStore.values()].reduce((sum, d) => sum + d.visits.length, 0);

console.log(`[mock-his] Generated ${dataStore.size} patients, ${totalVisits} visits`);

// ── Express App ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// ── Health check (no auth required) ───────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'mock-his',
    serverTime: new Date().toISOString(),
    patientCount: dataStore.size,
    totalVisits,
  });
});

// ── Auth middleware for /api/* ─────────────────────────────────────────────────

app.use('/api', (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!token || token !== API_KEY) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'API Key ไม่ถูกต้อง',
      },
    });
  }
  next();
});

// ── Endpoint 1b: Patient Search (HIS team's actual format) ──────────────────
// GET /api/patient?hn={hn} or GET /api/patient?cid={citizenId}

app.get('/api/patient', (req, res) => {
  const hn = (req.query.hn || '').trim();
  const cid = (req.query.cid || '').trim();

  if (!hn && !cid) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PARAMETER', message: 'กรุณาระบุ hn หรือ cid' },
    });
  }

  const results = [];
  for (const [, record] of dataStore) {
    const p = record.patient;
    if (hn && p.hn.includes(hn)) results.push({ ...p });
    else if (cid && p.citizenId === cid) results.push({ ...p });
  }

  res.json({ success: true, data: results });
});

// ── Endpoint 1a: Patient Search (original spec format — kept for compatibility)
// GET /api/patients/search?q={searchTerm}&type={searchType}

app.get('/api/patients/search', (req, res) => {
  const q = (req.query.q || '').trim();
  let type = (req.query.type || '').trim();

  if (!q) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PARAMETER',
        message: 'กรุณาระบุ parameter q สำหรับค้นหา',
      },
    });
  }

  // Auto-detect search type
  if (!type) {
    if (/^\d{13}$/.test(q)) {
      type = 'citizen_id';
    } else if (/^\d+$/.test(q)) {
      type = 'hn';
    } else {
      type = 'name';
    }
  }

  const results = [];

  for (const [, record] of dataStore) {
    const p = record.patient;
    let match = false;

    switch (type) {
      case 'hn':
        match = p.hn.includes(q);
        break;
      case 'citizen_id':
        match = p.citizenId === q;
        break;
      case 'name':
        match = p.fullName.toLowerCase().includes(q.toLowerCase());
        break;
      default:
        match =
          p.hn.includes(q) ||
          p.citizenId.includes(q) ||
          p.fullName.toLowerCase().includes(q.toLowerCase());
    }

    if (match) {
      results.push({ ...p });
    }
  }

  res.json({ success: true, data: results });
});

// ── Endpoint 3: Advanced Patient Search (Clinical Criteria) ─────────────────
// POST /api/patients/search/advanced

app.post('/api/patients/search/advanced', (req, res) => {
  const { from, to, icdPrefixes, secondaryDiagnosisCodes, drugKeywords } = req.body || {};

  // ── Validate required date range ────────────────────────────────────
  if (!from || !to) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PARAMETER',
        message: 'กรุณาระบุ from และ to (YYYY-MM-DD)',
      },
    });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PARAMETER',
        message: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)',
      },
    });
  }

  if (fromDate > toDate) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'DATE_RANGE_INVALID',
        message: 'วันเริ่มต้นอยู่หลังวันสิ้นสุด',
      },
    });
  }

  const diffDays = (toDate - fromDate) / (1000 * 60 * 60 * 24);
  if (diffDays > 30) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'DATE_RANGE_EXCEEDED',
        message: 'ช่วงวันที่เกิน 30 วัน',
      },
    });
  }

  const icds = Array.isArray(icdPrefixes) ? icdPrefixes.map((s) => s.toUpperCase()) : [];
  const secCodes = Array.isArray(secondaryDiagnosisCodes)
    ? secondaryDiagnosisCodes.map((s) => s.toUpperCase())
    : [];
  const drugs = Array.isArray(drugKeywords)
    ? drugKeywords.map((s) => s.toLowerCase())
    : [];

  const results = [];

  for (const [, record] of dataStore) {
    const p = record.patient;
    const visits = record.visits;

    // ── SSO insurance filter ──────────────────────────────────────────
    if (p.insuranceType !== 'ประกันสังคม') continue;

    // ── Find matching visits ──────────────────────────────────────────
    let latestMatchDate = '';
    let matchCount = 0;

    for (const v of visits) {
      // Date range filter
      if (v.visitDate < from || v.visitDate > to) continue;

      // ICD-10 prefix filter on primaryDiagnosis
      if (icds.length > 0) {
        const diag = v.primaryDiagnosis.toUpperCase();
        if (!icds.some((prefix) => diag.startsWith(prefix))) continue;
      }

      // Secondary diagnosis filter
      if (secCodes.length > 0) {
        const sec = (v.secondaryDiagnoses || '').toUpperCase();
        const secParts = sec.split(',').map((s) => s.trim());
        const hasMatch = secCodes.some((code) =>
          secParts.some((part) => part.startsWith(code)),
        );
        if (!hasMatch) continue;
      }

      // Drug keyword filter (substring match on medication names)
      if (drugs.length > 0) {
        const meds = v.medications || [];
        const hasDrug = drugs.some((kw) =>
          meds.some((m) => m.medicationName.toLowerCase().includes(kw)),
        );
        if (!hasDrug) continue;
      }

      // Visit passed all filters
      matchCount++;
      if (v.visitDate > latestMatchDate) latestMatchDate = v.visitDate;
    }

    if (matchCount > 0) {
      results.push({
        ...p,
        matchingVisitCount: matchCount,
        _latestMatchDate: latestMatchDate,
      });
    }
  }

  // ── Sort by latest matching visit (descending), limit 200 ──────────
  results.sort((a, b) => b._latestMatchDate.localeCompare(a._latestMatchDate));
  const limited = results.slice(0, 200);

  // Remove internal sort key before sending
  const data = limited.map(({ _latestMatchDate, ...rest }) => rest);

  res.json({ success: true, data });
});

// ── Endpoint 2: Patient Visit Data ────────────────────────────────────────────
// GET /api/patients/:hn/visits?from={startDate}&to={endDate}

app.get('/api/patients/:hn/visits', (req, res) => {
  const { hn } = req.params;
  const from = req.query.from || '';
  const to = req.query.to || '';

  const record = dataStore.get(hn);

  if (!record) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'PATIENT_NOT_FOUND',
        message: `ไม่พบข้อมูลผู้ป่วย HN ${hn}`,
      },
    });
  }

  let visits = record.visits;

  // Filter by date range
  if (from) {
    visits = visits.filter((v) => v.visitDate >= from);
  }
  if (to) {
    visits = visits.filter((v) => v.visitDate <= to);
  }

  res.json({
    success: true,
    data: {
      patient: { ...record.patient },
      visits,
    },
  });
});

// ── Start server ──────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[mock-his] HIS Mock API running on port ${PORT}`);
  console.log(`[mock-his] API Key: ${'*'.repeat(Math.max(0, API_KEY.length - 8))}${API_KEY.slice(-4)}`);
  console.log(`[mock-his] Health: http://localhost:${PORT}/health`);
});
