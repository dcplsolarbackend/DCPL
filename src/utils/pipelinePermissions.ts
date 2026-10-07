import type { PipelineStage, UserRole, User, Lead } from '../types/crm';
import { ALL_STAGES } from '../constants/stages';

const STAGE_PERMISSIONS_STORAGE_KEY = 'crm_stage_permissions_v1';
const STAGE_MANDATORY_STORAGE_KEY = 'crm_stage_mandatory_rules_v3';

export interface StageFieldDefinition {
  key: keyof Lead & string;
  label: string;
  category: 'Basic Info' | 'Commercials' | 'Technical' | 'Dates' | 'Operations' | 'Documents';
  placeholder?: string;
  inputType?: 'text' | 'number' | 'date' | 'url' | 'textarea' | 'select';
}

export const FIELD_DEFINITIONS: StageFieldDefinition[] = [
  // Basic Info (Lead & Sales)
  { key: 'salesPerson', label: 'Sales Person Name (Col 20)', category: 'Basic Info', inputType: 'select' },
  { key: 'phone', label: 'Phone No (Col 17)', category: 'Basic Info', placeholder: 'e.g. 7055294686' },
  { key: 'source', label: 'Lead Source (Col 19)', category: 'Basic Info', placeholder: 'Field, On Call, JD Enquiry, Referral...' },
  { key: 'customerName', label: 'Customer Name (Col 16)', category: 'Basic Info', placeholder: 'e.g. Mr. Ram Kishore' },
  { key: 'address', label: 'Site Address (Col 18)', category: 'Basic Info', placeholder: 'Full installation site address' },
  { key: 'notes', label: 'Remark / Notes (Col 40)', category: 'Basic Info', inputType: 'textarea', placeholder: 'Discussion history, site remarks...' },

  // Dates (15 Milestones)
  { key: 'leadDate', label: 'Lead Date (Col 2)', category: 'Dates', placeholder: 'YYYY-MM-DD' },
  { key: 'followUpDate', label: 'Follow Up Date (Col 3)', category: 'Dates', placeholder: 'YYYY-MM-DD' },
  { key: 'nextFollowUp', label: 'Next Follow Up (Col 4)', category: 'Dates', placeholder: 'YYYY-MM-DD' },
  { key: 'convertedDate', label: 'Converted Date (Col 5)', category: 'Dates', placeholder: 'YYYY-MM-DD' },
  { key: 'quotationDate', label: 'Quotation Date (Col 6)', category: 'Dates', placeholder: 'YYYY-MM-DD' },
  { key: 'documentationDate', label: 'Documentation Date (Col 7)', category: 'Dates', placeholder: 'YYYY-MM-DD' },
  { key: 'registrationDate', label: 'Registration Date (Col 8)', category: 'Operations', placeholder: 'YYYY-MM-DD' },
  { key: 'loanDate', label: 'Loan Date (Col 9)', category: 'Commercials', placeholder: 'YYYY-MM-DD' },
  { key: 'surveyDate', label: 'Site Survey Date (Col 10)', category: 'Operations', placeholder: 'YYYY-MM-DD' },
  { key: 'mDispatchDate', label: 'Material Dispatch Date (Col 11)', category: 'Operations', placeholder: 'YYYY-MM-DD' },
  { key: 'installationDate', label: 'Installation Date (Col 12)', category: 'Operations', placeholder: 'YYYY-MM-DD' },
  { key: 'netMeterDate', label: 'Net Meter Date (Col 13)', category: 'Operations', placeholder: 'YYYY-MM-DD' },
  { key: 'connectionDate', label: 'Grid Connection Date (Col 14)', category: 'Operations', placeholder: 'YYYY-MM-DD' },
  { key: 'completeDate', label: 'Complete Date (Col 15)', category: 'Operations', placeholder: 'YYYY-MM-DD' },
  { key: 'firstPaymentMonth', label: 'First Payment Month (Col 44)', category: 'Commercials', placeholder: 'e.g. 2/5/2026' },

  // Commercials
  { key: 'quotationAmount', label: 'Quotation Amount (₹) (Col 24)', category: 'Commercials', inputType: 'number' },
  { key: 'dealAmount', label: 'Deal Amount (₹) (Col 23)', category: 'Commercials', inputType: 'number' },
  { key: 'paymentType', label: 'Payment Type (Cash/Loan) (Col 25)', category: 'Commercials', inputType: 'select' },
  { key: 'paymentReceived', label: 'Payment Received (₹) (Col 38)', category: 'Commercials', inputType: 'number' },
  { key: 'duePayment', label: 'Due Amount (₹) (Col 39)', category: 'Commercials', inputType: 'number' },

  // Technical Specs
  { key: 'systemCapacity', label: 'System Capacity (kW) (Col 22)', category: 'Technical', placeholder: 'e.g. 3.15KW Hybrid / 5KW On Grid' },
  { key: 'panels', label: 'Panels Brand & Model (Col 31)', category: 'Technical', placeholder: 'e.g. Adani 615W DCR Panels' },
  { key: 'inverters', label: 'Inverters Brand & Model (Col 32)', category: 'Technical', placeholder: 'e.g. 3.3kW UTL Hybrid' },
  { key: 'battery', label: 'Battery (Col 33)', category: 'Technical', placeholder: 'e.g. UTL 100Ah Lithium / NA' },
  { key: 'wiring', label: 'Wiring Length (Mtr) (Col 34)', category: 'Technical', placeholder: 'e.g. 170 mtr' },
  { key: 'structure', label: 'Structure Type (Col 35)', category: 'Technical', placeholder: 'e.g. GI Structure / Elevated' },

  // Documents & Google Drive
  { key: 'quotationFile', label: 'View Quotation PDF Link (Col 41)', category: 'Documents', placeholder: 'https://drive.google.com/... or Quotation PDF/...' },
  { key: 'driveFolderUrl', label: 'Google Drive Folder Link', category: 'Documents', placeholder: 'https://drive.google.com/drive/folders/...' },
  { key: 'quotationFileApproved', label: 'Quotation File Approved (Col 27)', category: 'Documents', placeholder: 'Approved Quotation PDF link' },
  { key: 'projectSheetApproved', label: 'Project Sheet Approved PDF (Col 28)', category: 'Documents', placeholder: 'Project Sheet Approved PDF link' },
  { key: 'priceApproval', label: 'Price Approval Image (Col 26)', category: 'Documents', placeholder: 'Price Approval link' },
  { key: 'documentImage', label: 'Document Image (Col 29)', category: 'Documents', placeholder: 'Aadhaar / Electricity Bill link' },
  { key: 'otherDocImage', label: 'Other Doc. Image (Col 30)', category: 'Documents', placeholder: 'Other Document link' },
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
 * As requested:
 * - At 'New Leads' / 'Lead': ONLY Sales Person Name, Phone No, and Source are required (Customer Name / Capacity not required yet).
 * - Each subsequent stage requires its relevant milestone columns, and Admin can customize any stage freely.
 */
export const DEFAULT_STAGE_MANDATORY_RULES: Record<PipelineStage, string[]> = {
  Lead: ['salesPerson', 'phone', 'source'],
  'New Leads': ['salesPerson', 'phone', 'source'],
  'Follow Up': ['salesPerson', 'phone', 'followUpDate'],
  'Converted': ['salesPerson', 'phone', 'customerName', 'convertedDate', 'systemCapacity', 'dealAmount'],
  'Quotation': ['salesPerson', 'phone', 'customerName', 'quotationAmount', 'quotationDate', 'quotationFile'],
  'Documentation': ['customerName', 'phone', 'address', 'documentationDate', 'documentImage'],
  'Registration': ['customerName', 'phone', 'registrationDate'],
  'Loan': ['customerName', 'phone', 'loanDate', 'paymentType'],
  'Survey': ['customerName', 'phone', 'surveyDate', 'structure'],
  'Material Dispatch': ['customerName', 'mDispatchDate', 'panels', 'inverters'],
  'Installation': ['customerName', 'installationDate', 'wiring', 'structure'],
  'Inspection': ['customerName', 'installationDate'],
  'Net Meter': ['customerName', 'netMeterDate'],
  'Connection': ['customerName', 'connectionDate'],
  'Complete': ['customerName', 'completeDate', 'paymentReceived'],
  'Lost': ['phone', 'notes'],
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('crm_stage_rules_updated'));
    }
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('crm_stage_rules_updated'));
    }
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
    const isMissing =
      val === undefined ||
      val === null ||
      (typeof val === 'string' && val.trim() === '') ||
      (typeof val === 'number' && val <= 0 && fieldKey !== 'duePayment' && fieldKey !== 'paymentReceived');

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
      errorMessage: `Stage "${targetStage}" ke liye yeh mandatory columns bharna zaroori hai: ${missingLabels.join(', ')}`,
    };
  }

  return {
    isValid: true,
    missingKeys: [],
    missingLabels: [],
  };
}
