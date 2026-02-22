const pg = require('pg');
const client = new pg.Client('postgresql://postgres:postgres@localhost:5432/sso_cancer?schema=public');

async function resolveDrug(nameUpper) {
  if (!nameUpper) return null;

  // Strip trailing dosage/strength info: "FEMARA 2.5 MG" → "FEMARA"
  const nameBase = nameUpper.replace(/\s+\d[\d.,/]*\s*(MG|GM|ML|MCG|%|G|IU|UNIT|TAB|CAP|AMP|VIAL|SYRINGE|PREFILL).*$/i, '').trim();

  const namesToTry = nameBase !== nameUpper ? [nameUpper, nameBase] : [nameUpper];

  for (const name of namesToTry) {
    // Tier 1: Exact match on trade name
    let result = await client.query(
      'SELECT drug_id FROM drug_trade_names WHERE UPPER(trade_name) = $1 AND is_active = true LIMIT 1',
      [name]
    );
    if (result.rows.length > 0) return result.rows[0].drug_id;

    // Tier 1b: Exact match on generic name
    result = await client.query(
      'SELECT id FROM drugs WHERE UPPER(generic_name) = $1 AND is_active = true LIMIT 1',
      [name]
    );
    if (result.rows.length > 0) return result.rows[0].id;
  }

  for (const name of namesToTry) {
    // Tier 2: Starts-with match on trade name
    result = await client.query(
      'SELECT drug_id FROM drug_trade_names WHERE UPPER(trade_name) LIKE $1 AND is_active = true LIMIT 1',
      [name + '%']
    );
    if (result.rows.length > 0) return result.rows[0].drug_id;

    // Tier 2b: Starts-with match on generic name
    result = await client.query(
      'SELECT id FROM drugs WHERE UPPER(generic_name) LIKE $1 AND is_active = true LIMIT 1',
      [name + '%']
    );
    if (result.rows.length > 0) return result.rows[0].id;
  }

  for (const name of namesToTry) {
    // Tier 3: Contains match (skip short names to avoid false positives like LORA→chlorambucil)
    if (name.length < 5) continue;
    result = await client.query(
      'SELECT drug_id FROM drug_trade_names WHERE UPPER(trade_name) LIKE $1 AND is_active = true LIMIT 1',
      ['%' + name + '%']
    );
    if (result.rows.length > 0) return result.rows[0].drug_id;

    // Tier 3b: Contains match on generic name
    result = await client.query(
      'SELECT id FROM drugs WHERE UPPER(generic_name) LIKE $1 AND is_active = true LIMIT 1',
      ['%' + name + '%']
    );
    if (result.rows.length > 0) return result.rows[0].id;
  }

  return null;
}

async function main() {
  await client.connect();

  const meds = await client.query(
    'SELECT id, medication_name FROM visit_medications WHERE medication_name IS NOT NULL'
  );
  console.log('Total medications to resolve:', meds.rows.length);

  // Reset all resolved_drug_id first
  await client.query('UPDATE visit_medications SET resolved_drug_id = NULL');

  let resolved = 0;
  let unresolved = 0;
  const unresolvedNames = new Set();

  for (const med of meds.rows) {
    const nameUpper = med.medication_name.toUpperCase().trim();
    const drugId = await resolveDrug(nameUpper);

    if (drugId) {
      await client.query(
        'UPDATE visit_medications SET resolved_drug_id = $1 WHERE id = $2',
        [drugId, med.id]
      );
      resolved++;
    } else {
      unresolved++;
      unresolvedNames.add(med.medication_name);
    }
  }

  console.log('Resolved:', resolved);
  console.log('Unresolved:', unresolved);
  console.log('\nUnresolved unique medication names (' + unresolvedNames.size + '):');
  [...unresolvedNames].sort().forEach((n) => console.log('  -', n));

  await client.end();
}

main().catch((e) => {
  console.error(e);
  client.end();
  process.exit(1);
});
