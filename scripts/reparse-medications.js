const pg = require('pg');
const client = new pg.Client('postgresql://postgres:postgres@localhost:5432/sso_cancer?schema=public');

function parseMedicationLine(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return { rawLine: line, hospitalCode: null, medicationName: null, quantity: null, unit: null };
  }

  // Pattern 1: "CODE - NAME QTY UNIT (price)"
  const match1 = trimmed.match(
    /^(\d+)\s*-\s*(.+?)\s+(\d+(?:\.\d+)?)\s+(\S+?)(?:\s*\(.*\))?\s*$/
  );
  if (match1) {
    return {
      rawLine: trimmed,
      hospitalCode: match1[1],
      medicationName: match1[2].replace(/\s*\(.*\)\s*$/, '').trim(),
      quantity: match1[3],
      unit: match1[4],
    };
  }

  // Pattern 2: "CODE - NAME"
  const match2 = trimmed.match(/^(\d+)\s*-\s*(.+)$/);
  if (match2) {
    return {
      rawLine: trimmed,
      hospitalCode: match2[1],
      medicationName: match2[2].replace(/\s*\(.*\)\s*$/, '').trim(),
      quantity: null,
      unit: null,
    };
  }

  // Pattern 3: "NAME QTY UNIT" (no code)
  const match3 = trimmed.match(/^([A-Za-z][A-Za-z\s\-]+?)\s+(\d+(?:\.\d+)?)\s+(\S+)$/);
  if (match3) {
    return {
      rawLine: trimmed,
      hospitalCode: null,
      medicationName: match3[1].trim(),
      quantity: match3[2],
      unit: match3[3],
    };
  }

  // Fallback
  return {
    rawLine: trimmed,
    hospitalCode: null,
    medicationName: trimmed,
    quantity: null,
    unit: null,
  };
}

async function main() {
  await client.connect();

  // Get all visits with medications_raw
  const visits = await client.query(
    'SELECT id, medications_raw FROM patient_visits WHERE medications_raw IS NOT NULL'
  );
  console.log('Total visits with medications_raw:', visits.rows.length);

  // Delete all existing visit_medications
  const deleted = await client.query('DELETE FROM visit_medications');
  console.log('Deleted existing visit_medications:', deleted.rowCount);

  let totalCreated = 0;
  for (const visit of visits.rows) {
    // Split on literal \n (backslash-n from CSV), actual newline, or pipe
    const medLines = visit.medications_raw
      .split(/(?:\\n|\n|\|)+/)
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of medLines) {
      const parsed = parseMedicationLine(line);
      await client.query(
        'INSERT INTO visit_medications (visit_id, raw_line, hospital_code, medication_name, quantity, unit) VALUES ($1, $2, $3, $4, $5, $6)',
        [visit.id, parsed.rawLine, parsed.hospitalCode, parsed.medicationName, parsed.quantity, parsed.unit]
      );
      totalCreated++;
    }
  }
  console.log('Created visit_medications:', totalCreated);

  // Show distribution
  const dist = await client.query(`
    SELECT med_count, count(*) as visit_count FROM (
      SELECT visit_id, count(*) as med_count FROM visit_medications GROUP BY visit_id
    ) sub GROUP BY med_count ORDER BY med_count
  `);
  console.log('\nMedication count distribution:');
  dist.rows.forEach((r) => console.log('  ', r.med_count, 'meds:', r.visit_count, 'visits'));

  await client.end();
}

main().catch((e) => {
  console.error(e);
  client.end();
  process.exit(1);
});
