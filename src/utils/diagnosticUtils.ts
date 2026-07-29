import { DiagnosticItemResult } from '../types';
import { DIAGNOSTIC_NAMES } from '../components/intake/deviceData';

export const get21Diagnostics = (
  beforeDiagnostics?: DiagnosticItemResult[],
  symptomsReported?: string,
  checklist?: any
): DiagnosticItemResult[] => {
  const existingMap = new Map<string, DiagnosticItemResult>();
  if (beforeDiagnostics && beforeDiagnostics.length > 0) {
    beforeDiagnostics.forEach((d) => existingMap.set(d.name, d));
  }

  const symptoms = (symptomsReported || '').toLowerCase();

  return DIAGNOSTIC_NAMES.map((name, idx) => {
    if (existingMap.has(name)) {
      return existingMap.get(name)!;
    }

    let status: 'Pass' | 'Fail' | 'N/A' = 'N/A';
    let note = '';

    // Infer reasonable failures based on symptoms or checklist
    if (name === 'Display' && (symptoms.includes('screen') || symptoms.includes('display') || symptoms.includes('shattered') || symptoms.includes('glass') || symptoms.includes('crack'))) {
      status = 'Fail';
      note = 'Screen damaged or cracked';
    } else if (name === 'Battery Health' && (symptoms.includes('battery') || symptoms.includes('drain') || symptoms.includes('degrade') || (checklist?.batteryHealthPercent && checklist.batteryHealthPercent < 80))) {
      status = 'Fail';
      note = checklist?.batteryHealthPercent ? `${checklist.batteryHealthPercent}% Max Capacity` : 'Degraded battery health';
    } else if (name === 'Charger' && (symptoms.includes('charge') || symptoms.includes('power') || symptoms.includes('liquid') || symptoms.includes('coffee') || symptoms.includes('spill'))) {
      status = 'Fail';
      note = 'Port issue or liquid exposure';
    } else if (name === 'Backglass' && (symptoms.includes('back glass') || symptoms.includes('backglass') || symptoms.includes('rear glass'))) {
      status = 'Fail';
      note = 'Shattered rear glass';
    } else if (name === 'Main Camera' && (symptoms.includes('camera') || symptoms.includes('lens') || symptoms.includes('ois'))) {
      status = 'Fail';
      note = 'Blurry or cracked lens';
    } else if (name === 'Face ID' && symptoms.includes('face id')) {
      status = 'Fail';
      note = 'Face ID issue';
    }

    return {
      id: `diag-${idx}`,
      name,
      status,
      note
    };
  });
};

export const get21AfterDiagnostics = (
  afterDiagnostics?: DiagnosticItemResult[],
  beforeDiagnostics?: DiagnosticItemResult[],
  symptomsReported?: string,
  checklist?: any
): DiagnosticItemResult[] => {
  const base21 = get21Diagnostics(beforeDiagnostics, symptomsReported, checklist);

  if (!afterDiagnostics || afterDiagnostics.length === 0) {
    return base21.map((beforeItem, idx) => ({
      id: `after-diag-${idx}`,
      name: beforeItem.name,
      status: 'N/A' as const,
      note: 'Pending QA'
    }));
  }

  const existingMap = new Map<string, DiagnosticItemResult>();
  afterDiagnostics.forEach((d) => existingMap.set(d.name, d));

  return base21.map((beforeItem, idx) => {
    if (existingMap.has(beforeItem.name)) {
      return existingMap.get(beforeItem.name)!;
    }
    return {
      id: `after-diag-${idx}`,
      name: beforeItem.name,
      status: 'N/A' as const,
      note: ''
    };
  });
};

export const checkIsBeforeDiagnosticCompleted = (wo: any): boolean => {
  if (!wo) return false;
  const hasBeforeDiag = 
    wo.beforeDiagnostics && 
    Array.isArray(wo.beforeDiagnostics) && 
    wo.beforeDiagnostics.some((d: any) => d.status === 'Pass' || d.status === 'Fail');
  const hasDiagResult = 
    wo.diagnosticResult && 
    typeof wo.diagnosticResult === 'string' && 
    wo.diagnosticResult.trim().length > 0 && 
    wo.diagnosticResult !== 'Diagnostic Pending' &&
    !wo.diagnosticResult.includes('Device intake completed') &&
    !wo.diagnosticResult.includes('diagnostics initialized') &&
    !wo.diagnosticResult.includes('Intake Pending');
  return Boolean(hasBeforeDiag || hasDiagResult);
};

export const checkIsAfterDiagnosticCompleted = (wo: any): boolean => {
  if (!wo) return false;
  const hasAfterDiag = 
    wo.afterDiagnostics && 
    Array.isArray(wo.afterDiagnostics) && 
    wo.afterDiagnostics.some((d: any) => d.status === 'Pass' || d.status === 'Fail');
  const hasQa = Boolean(wo.postRepairChecklist?.qaTechnicianId) || Boolean(wo.afterRepairSummary && wo.afterRepairSummary.trim().length > 0);
  return Boolean(hasAfterDiag || hasQa);
};

export const checkIsBeforeDiagnosticNeeded = (wo: any): boolean => {
  if (!wo) return false;
  return ['Receive', 'In Progress', 'Pending'].includes(wo.status) && !checkIsBeforeDiagnosticCompleted(wo);
};

export const checkIsAfterDiagnosticNeeded = (wo: any): boolean => {
  if (!wo) return false;
  return wo.status === 'Finished' && !checkIsAfterDiagnosticCompleted(wo);
};

export const checkIsDiagnosticCompleted = (wo: any): boolean => {
  if (!wo) return false;
  return checkIsBeforeDiagnosticCompleted(wo) || checkIsAfterDiagnosticCompleted(wo);
};

export const checkIsFinishedDiagnosticNeeded = (wo: any): boolean => {
  return checkIsAfterDiagnosticNeeded(wo);
};
