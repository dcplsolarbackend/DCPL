import type { PipelineStage, UserRole, User, Lead } from '../types/crm';
import { ALL_STAGES } from '../constants/stages';

const STAGE_PERMISSIONS_STORAGE_KEY = 'crm_stage_permissions_v1';
const STAGE_MANDATORY_STORAGE_KEY = 'crm_stage_mandatory_rules_v1';

export const FIELD_DEFINITIONS: { key: string; label: string; category: string }[] = [
  { key: 'customerName', label: 'Customer Name', category: 'Basic Info' },
  { key: 'phone', label: 'Contact Phone', category: 'Basic Info' },
  { key: 'address', label: 'Site Address', category: 'Basic Info' },
  { key: 'source', label: 'Lead Source', category: 'Basic Info' },
  { key: 'salesPerson', label: 'Sales Person (Name/Email)', category: 'Basic Info' },
  { key: 'driveFolderUrl', label: 'Google Drive Folder', category: 'Documents' },
  { key: 'followUpDate', label: 'Follow Up Date', category: 'Dates' },
  { key: 'convertedDate', label: 'Converted Date', category: 'Dates' },
  { key: 'quotationAmount', label: 'Quotation Amount', category: 'Commercials' },
  { key: 'quotationDate', label: 'Quotation Date', category: 'Dates' },
  { key: 'systemCapacity', label: 'Plant Capacity (kW)', category: 'Technical' },
  { key: 'dealAmount', label: 'Deal Amount (₹)', category: 'Commercials' },
  { key: 'documentationDate', label: 'Documentation Date', category: 'Dates' },
  { key: 'registrationDate', label: 'Registration Date', category: 'Operations' },
  { key: 'consumerNumber', label: 'Consumer Number', category: 'Operations' },
  { key: 'loanDate', label: 'Loan Approval Date', category: 'Commercials' },
  { key: 'loanStatus', label: 'Loan Status', category: 'Commercials' },
  { key: 'surveyDate', label: 'Site Survey Date', category: 'Operations' },
  { key: 'surveyorName', label: 'Surveyor Engineer', category: 'Operations' },
  { key: 'mDispatchDate', label: 'Material Dispatch Date', category: 'Operations' },
  { key: 'solarModuleModel', label: 'Panel Brand & Model', category: 'Technical' },
  { key: 'inverterModel', label: 'Inverter Brand & Model', category: 'Technical' },
  { key: 'installationDate', label: 'Installation Date', category: 'Operations' },
  { key: 'installerName', label: 'Installer Name / Lead', category: 'Operations' },
  { key: 'structure', label: 'Structure Type', category: 'Technical' },
  { key: 'wiring', label: 'Wiring Length (Mtr)', category: 'Technical' },
  { key: 'inspectionDate', label: 'Discom Inspection Date', category: 'Operations' },
  { key: 'netMeterDate', label: 'Net Meter Date', category: 'Operations' },
  { key: 'connectionDate', label: 'Grid Connection Date', category: 'Operations' },
  { key: 'paymentReceived', label: 'Payment Received (₹)', category: 'Commercials' },
  { key: 'notes', label: 'Remarks / Notes', category: 'Basic Info' },
];

/**
 * Default stage access permissions per Role
 */
export const DEFAULT_STAGE_PERMISSIONS: Record<UserRole, PipelineStage[]> = {
  Admin: [...ALL_STAGES],
  'Sales Manager': [
    'New Leads',
    'Follow Up',
    'Converted',
    'Quotation',
    'Documentation',
    'Complete',
    'Lost'
  ],
  'Sales Executive': [
    'New Leads',
    'Follow Up',
    'Converted',
    'Quotation',
    'Documentation'
  ],
  'Operations Engineer': [
    'Registration',
    'Loan',
    'Survey',
    'Material Dispatch',
    'Installation',
    'Inspection',
    'Net Meter',
    'Connection',
    'Complete'
  ],
  'Accounts Manager': [...ALL_STAGES]
};

/**
 * Default mandatory (required) fields per Pipeline Stage.
 * User example:
 * At 'New Leads', customer capacity/quote is NOT required; only phone, name, source, and sales person are required.
 * At 'Documentation', documentationDate and consumer details become required.
 */
export const DEFAULT_STAGE_MANDATORY_RULES: Record<PipelineStage, string[]> = {
  Lead: ['customerName', 'phone', 'source', 'salesPerson'],
  'New Leads': ['customerName', 'phone', 'source', 'salesPerson'],
  'Follow Up': ['customerName', 'phone', 'followUpDate', 'salesPerson'],
  'Converted': ['customerName', 'phone', 'convertedDate', 'systemCapacity', 'dealAmount'],
  'Quotation': ['customerName', 'phone', 'quotationAmount', 'quotationDate'],
  'Documentation': ['customerName', 'phone', 'documentationDate'],
  'Registration': ['customerName', 'registrationDate', 'consumerNumber'],
  'Loan': ['customerName', 'loanDate'],
  'Survey': ['customerName', 'surveyDate', 'surveyorName'],
  'Material Dispatch': ['customerName', 'mDispatchDate'],
  'Installation': ['customerName', 'installationDate', 'installerName'],
  'Inspection': ['customerName', 'inspectionDate'],
  'Net Meter': ['customerName', 'netMeterDate'],
  'Connection': ['customerName', 'connectionDate'],
  'Complete': ['customerName', 'paymentReceived'],
  'Lost': ['customerName', 'notes'],
};

// ---------------------- Stage Permissions Helpers ----------------------

export function loadStagePermissions(): Record<UserRole, PipelineStage[]> {
  try {
    const raw = localStorage.getItem(STAGE_PERMISSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STAGE_PERMISSIONS, ...parsed };
    }
  } catch (err) {
    console.error('Failed to load stage permissions:', err);
  }
  return { ...DEFAULT_STAGE_PERMISSIONS };
}

export function saveStagePermissions(permissions: Record<UserRole, PipelineStage[]>): void {
  try {
    localStorage.setItem(STAGE_PERMISSIONS_STORAGE_KEY, JSON.stringify(permissions));
  } catch (err) {
    console.error('Failed to save stage permissions:', err);
  }
}

export function getVisibleStagesForUser(user: User | null): PipelineStage[] {
  if (!user) return ALL_STAGES;

  // Custom user override if configured by Admin
  if (user.customAllowedStages && user.customAllowedStages.length > 0) {
    return user.customAllowedStages;
  }

  // Admin always gets all stages
  if (user.role === 'Admin') {
    return ALL_STAGES;
  }

  const permissions = loadStagePermissions();
  return permissions[user.role] || DEFAULT_STAGE_PERMISSIONS[user.role] || ALL_STAGES;
}

// ---------------------- Stage Mandatory Fields Helpers ----------------------

export function loadStageMandatoryRules(): Record<PipelineStage, string[]> {
  try {
    const raw = localStorage.getItem(STAGE_MANDATORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STAGE_MANDATORY_RULES, ...parsed };
    }
  } catch (err) {
    console.error('Failed to load stage mandatory rules:', err);
  }
  return { ...DEFAULT_STAGE_MANDATORY_RULES };
}

export function saveStageMandatoryRules(rules: Record<PipelineStage, string[]>): void {
  try {
    localStorage.setItem(STAGE_MANDATORY_STORAGE_KEY, JSON.stringify(rules));
  } catch (err) {
    console.error('Failed to save stage mandatory rules:', err);
  }
}

export interface ValidationResult {
  isValid: boolean;
  missingKeys: string[];
  missingLabels: string[];
  errorMessage?: string;
}

/**
 * Validates whether a lead has all mandatory fields filled for a specific target pipeline stage.
 */
export function validateLeadForStage(lead: Partial<Lead>, targetStage: PipelineStage): ValidationResult {
  const rules = loadStageMandatoryRules();
  const mandatoryFields = rules[targetStage] || [];

  const missingKeys: string[] = [];
  const missingLabels: string[] = [];

  for (const fieldKey of mandatoryFields) {
    const val = (lead as any)[fieldKey];
    const isMissing = val === undefined || val === null || val === '' || (typeof val === 'number' && val <= 0 && fieldKey !== 'duePayment');

    if (isMissing) {
      missingKeys.push(fieldKey);
      const def = FIELD_DEFINITIONS.find((f) => f.key === fieldKey);
      missingLabels.push(def ? def.label : fieldKey);
    }
  }

  if (missingKeys.length > 0) {
    return {
      isValid: false,
      missingKeys,
      missingLabels,
      errorMessage: `Stage [${targetStage}] ke liye yeh fields zaroori (mandatory) hain: ${missingLabels.join(', ')}`,
    };
  }

  return {
    isValid: true,
    missingKeys: [],
    missingLabels: [],
  };
}
