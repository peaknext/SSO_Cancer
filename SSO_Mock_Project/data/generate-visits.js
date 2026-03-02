'use strict';

const { patients, CHEMO_MIX_FEE } = require('./patients');

/**
 * Deterministic visit generator.
 * Produces ~300 visits from 10 patient templates.
 *
 * Returns Map<hn, { patient, visits[] }>
 */

const PHYSICIANS = ['ก54236', 'ว78901', 'ท12345', 'ส67890'];

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00+07:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateTime(dateStr, hour, minute) {
  return `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

function generateAllVisits() {
  const store = new Map();
  let vnCounter = 7001001;

  for (const patient of patients) {
    const patientInfo = {
      hn: patient.hn,
      citizenId: patient.citizenId,
      titleName: patient.titleName,
      fullName: patient.fullName,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
      address: patient.address,
      phoneNumber: patient.phoneNumber,
      insuranceType: patient.insuranceType,
      mainHospitalCode: patient.mainHospitalCode,
    };

    const visits = [];
    let currentDate = patient.startDate;
    let overallCycle = 0;

    // ── Generate chemo visits from phases ──────────────────────────────
    for (const phase of patient.phases) {
      for (let c = 1; c <= phase.cycleCount; c++) {
        overallCycle++;
        const vn = String(vnCounter++);
        const physician = PHYSICIANS[overallCycle % PHYSICIANS.length];
        const isMorning = overallCycle % 2 === 0;
        const startHour = isMorning ? 8 : 13;
        const endHour = startHour + 2;

        const medications = [];
        const billingItems = [];

        // Add chemo drugs
        for (const drug of phase.drugs) {
          medications.push({
            hospitalCode: drug.hospitalCode,
            medicationName: drug.medicationName,
            quantity: drug.quantity,
            unit: drug.unit,
          });
          billingItems.push({
            hospitalCode: drug.hospitalCode,
            aipnCode: drug.billing.aipnCode,
            billingGroup: drug.billing.billingGroup,
            description: drug.billing.description,
            quantity: parseInt(drug.quantity) || 1,
            unitPrice: drug.billing.unitPrice,
            claimUnitPrice: drug.billing.unitPrice,
            claimCategory: phase.isRadiation ? 'OPR' : 'OP1',
          });
        }

        // Add supportive drugs
        for (const sup of phase.supportive) {
          medications.push({
            hospitalCode: sup.hospitalCode,
            medicationName: sup.medicationName,
            quantity: sup.quantity,
            unit: sup.unit,
          });
          billingItems.push({
            hospitalCode: sup.hospitalCode,
            aipnCode: sup.billing.aipnCode,
            billingGroup: sup.billing.billingGroup,
            description: sup.billing.description,
            quantity: parseInt(sup.quantity) || 1,
            unitPrice: sup.billing.unitPrice,
            claimUnitPrice: sup.billing.unitPrice,
            claimCategory: 'OP1',
          });
        }

        // Add chemo mix fee (for non-radiation visits with drugs)
        if (!phase.isRadiation && phase.drugs.length > 0) {
          medications.push({
            hospitalCode: CHEMO_MIX_FEE.hospitalCode,
            medicationName: CHEMO_MIX_FEE.medicationName,
            quantity: CHEMO_MIX_FEE.quantity,
            unit: CHEMO_MIX_FEE.unit,
          });
          billingItems.push({
            hospitalCode: CHEMO_MIX_FEE.hospitalCode,
            aipnCode: CHEMO_MIX_FEE.billing.aipnCode,
            billingGroup: CHEMO_MIX_FEE.billing.billingGroup,
            description: CHEMO_MIX_FEE.billing.description,
            quantity: 1,
            unitPrice: CHEMO_MIX_FEE.billing.unitPrice,
            claimUnitPrice: CHEMO_MIX_FEE.billing.unitPrice,
            claimCategory: 'OP1',
          });
        }

        // Add radiation billing items
        if (phase.isRadiation) {
          billingItems.push({
            hospitalCode: '9200101',
            aipnCode: '55825',
            billingGroup: 'G',
            description: 'ค่ารังสีรักษา — External beam radiation',
            quantity: 1,
            unitPrice: 3500.0,
            claimUnitPrice: 3500.0,
            claimCategory: 'OPR',
          });
        }

        const visit = {
          vn,
          visitDate: currentDate,
          serviceStartTime: formatDateTime(currentDate, startHour, 30),
          serviceEndTime: formatDateTime(currentDate, endHour, 30),
          physicianLicenseNo: physician,
          clinicCode: phase.clinicCode || '01',
          primaryDiagnosis: phase.primaryDiagnosis || patient.primaryDiagnosis,
          secondaryDiagnoses: phase.secondaryDiagnoses || patient.secondaryDiagnoses,
          hpi: phase.isRadiation
            ? `มารับรังสีรักษาครั้งที่ ${c}`
            : `มาตามนัดรับเคมีบำบัด ${phase.name} cycle ${c}`,
          doctorNotes: phase.doctorNotes(c),
          medications,
          billingItems,
        };

        visits.push(visit);

        // Advance date for next cycle
        if (c < phase.cycleCount) {
          currentDate = addDays(currentDate, phase.intervalDays);
        }
      }

      // Gap between phases
      currentDate = addDays(currentDate, 7);
    }

    // ── Generate follow-up visits (no chemo) ──────────────────────────
    for (let f = 1; f <= (patient.followUpVisits || 0); f++) {
      currentDate = addDays(currentDate, 28 + (f % 3) * 7);
      const vn = String(vnCounter++);

      visits.push({
        vn,
        visitDate: currentDate,
        serviceStartTime: formatDateTime(currentDate, 9, 0),
        serviceEndTime: formatDateTime(currentDate, 9, 30),
        physicianLicenseNo: PHYSICIANS[f % PHYSICIANS.length],
        clinicCode: '01',
        primaryDiagnosis: patient.primaryDiagnosis,
        secondaryDiagnoses: patient.primaryDiagnosis,
        hpi: `มาตามนัด follow-up ครั้งที่ ${f} หลังเคมีบำบัด`,
        doctorNotes: `Follow-up visit ${f} — ตรวจร่างกาย, CBC, LFT ${f >= 3 ? ', CT scan' : ''}`,
        medications: [],
        billingItems: [
          {
            hospitalCode: '9300001',
            aipnCode: '55021',
            billingGroup: 'B',
            description: 'ค่าตรวจวินิจฉัย',
            quantity: 1,
            unitPrice: 300.0,
            claimUnitPrice: 300.0,
            claimCategory: 'OP1',
          },
        ],
      });
    }

    // Sort visits chronologically
    visits.sort((a, b) => a.visitDate.localeCompare(b.visitDate));

    patientInfo.totalVisitCount = visits.length;

    store.set(patient.hn, { patient: patientInfo, visits });
  }

  return store;
}

module.exports = { generateAllVisits };
