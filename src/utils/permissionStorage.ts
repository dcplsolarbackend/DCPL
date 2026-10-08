import { UserRole } from '../types/crm';

export interface ColumnAccessRule {
  columnKey: string;
  label: string;
  category: 'General' | 'Milestone Dates' | 'Technical Specs' | 'Financials & Dues' | 'Drive Files' | 'Payment Sheet';
  viewRoles: UserRole[];
  editRoles: UserRole[];
}

const ALL_ROLES: UserRole[] = [
  'Admin',
  'Sales Manager',
  'Sales Executive',
  'Operations Engineer',
  'Accounts Manager',
];

export const DEFAULT_COLUMN_RULES: ColumnAccessRule[] = [
  // 1. General & Customer
  {
    columnKey: 'leadId',
    label: 'LeadID (Col 1)',
    category: 'General',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin'],
  },
  {
    columnKey: 'customerName',
    label: 'Customer Name (Col 16)',
    category: 'General',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Sales Manager', 'Sales Executive'],
  },
  {
    columnKey: 'phone',
    label: 'Phone No (Col 17)',
    category: 'General',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Sales Manager', 'Sales Executive'],
  },
  {
    columnKey: 'address',
    label: 'Address (Col 18)',
    category: 'General',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Sales Manager', 'Sales Executive', 'Operations Engineer'],
  },
  {
    columnKey: 'source',
    label: 'Lead Source (Col 19)',
    category: 'General',
    viewRoles: ['Admin', 'Sales Manager', 'Sales Executive'],
    editRoles: ['Admin', 'Sales Manager'],
  },
  {
    columnKey: 'salesPerson',
    label: 'Sales Person (Col 20)',
    category: 'General',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Sales Manager'],
  },
  {
    columnKey: 'status',
    label: 'Current Status (Col 21)',
    category: 'General',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Sales Manager', 'Sales Executive', 'Operations Engineer'],
  },
  {
    columnKey: 'notes',
    label: 'Remark / Notes (Col 40)',
    category: 'General',
    viewRoles: [...ALL_ROLES],
    editRoles: [...ALL_ROLES],
  },

  // 2. Financials & Dues (High Sensitivity)
  {
    columnKey: 'dealAmount',
    label: 'Deal Amount (Col 23)',
    category: 'Financials & Dues',
    viewRoles: ['Admin', 'Sales Manager', 'Accounts Manager'],
    editRoles: ['Admin', 'Sales Manager', 'Accounts Manager'],
  },
  {
    columnKey: 'quotationAmount',
    label: 'Quotation Amount (Col 24)',
    category: 'Financials & Dues',
    viewRoles: ['Admin', 'Sales Manager', 'Sales Executive', 'Accounts Manager'],
    editRoles: ['Admin', 'Sales Manager', 'Accounts Manager'],
  },
  {
    columnKey: 'paymentType',
    label: 'Payment Type (Col 25)',
    category: 'Financials & Dues',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Sales Manager', 'Accounts Manager'],
  },
  {
    columnKey: 'paymentReceived',
    label: 'Payment Received (Col 38)',
    category: 'Financials & Dues',
    viewRoles: ['Admin', 'Sales Manager', 'Accounts Manager'],
    editRoles: ['Admin', 'Accounts Manager'],
  },
  {
    columnKey: 'duePayment',
    label: 'Due Amount (Col 39)',
    category: 'Financials & Dues',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Accounts Manager'],
  },
  {
    columnKey: 'subsidyDone',
    label: 'Subsidy Status (Col 37)',
    category: 'Financials & Dues',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Accounts Manager', 'Sales Manager'],
  },

  // 3. Technical Specs & Hardware
  {
    columnKey: 'systemCapacity',
    label: 'System Capacity (Col 22)',
    category: 'Technical Specs',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Sales Manager', 'Operations Engineer'],
  },
  {
    columnKey: 'panels',
    label: 'Panels Brand & Model (Col 31)',
    category: 'Technical Specs',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Sales Manager', 'Operations Engineer'],
  },
  {
    columnKey: 'inverters',
    label: 'Inverter Brand & kW (Col 32)',
    category: 'Technical Specs',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Sales Manager', 'Operations Engineer'],
  },
  {
    columnKey: 'battery',
    label: 'Battery Specification (Col 33)',
    category: 'Technical Specs',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Sales Manager', 'Operations Engineer'],
  },
  {
    columnKey: 'wiring',
    label: 'Wiring Meters (Col 34)',
    category: 'Technical Specs',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Operations Engineer'],
  },
  {
    columnKey: 'structure',
    label: 'Structure Type (Col 35)',
    category: 'Technical Specs',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Operations Engineer'],
  },
  {
    columnKey: 'netMeterDone',
    label: 'Net Meter Done (Col 36)',
    category: 'Technical Specs',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Operations Engineer'],
  },

  // 4. Milestone Dates
  {
    columnKey: 'followUpDate',
    label: 'Follow Up Date (Col 3)',
    category: 'Milestone Dates',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Sales Manager', 'Sales Executive'],
  },
  {
    columnKey: 'surveyDate',
    label: 'Survey Date (Col 10)',
    category: 'Milestone Dates',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Operations Engineer'],
  },
  {
    columnKey: 'mDispatchDate',
    label: 'M Dispatch Date (Col 11)',
    category: 'Milestone Dates',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Operations Engineer'],
  },
  {
    columnKey: 'installationDate',
    label: 'Installation Date (Col 12)',
    category: 'Milestone Dates',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Operations Engineer'],
  },
  {
    columnKey: 'netMeterDate',
    label: 'Net Meter Date (Col 13)',
    category: 'Milestone Dates',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Operations Engineer'],
  },
  {
    columnKey: 'completeDate',
    label: 'Complete Date (Col 15)',
    category: 'Milestone Dates',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Operations Engineer', 'Sales Manager'],
  },

  // 5. Google Drive Files & Approvals
  {
    columnKey: 'priceApproval',
    label: 'Price Approval (Col 26)',
    category: 'Drive Files',
    viewRoles: ['Admin', 'Sales Manager', 'Accounts Manager'],
    editRoles: ['Admin', 'Sales Manager'],
  },
  {
    columnKey: 'quotationFile',
    label: 'Quotation File PDF (Col 41)',
    category: 'Drive Files',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Sales Manager', 'Sales Executive'],
  },
  {
    columnKey: 'projectSheetApproved',
    label: 'Project Sheet Approved (Col 28)',
    category: 'Drive Files',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Sales Manager', 'Operations Engineer'],
  },
  {
    columnKey: 'documentImage',
    label: 'Document Image (Col 29)',
    category: 'Drive Files',
    viewRoles: [...ALL_ROLES],
    editRoles: ['Admin', 'Sales Manager', 'Operations Engineer'],
  },

  // 6. Payment Sheet Columns
  {
    columnKey: 'paymentRecordAdd',
    label: 'Record New Payment Transaction',
    category: 'Payment Sheet',
    viewRoles: ['Admin', 'Accounts Manager', 'Sales Manager'],
    editRoles: ['Admin', 'Accounts Manager'],
  },
  {
    columnKey: 'receiptImageUpload',
    label: 'Upload Receipt Image to Google Drive',
    category: 'Payment Sheet',
    viewRoles: ['Admin', 'Accounts Manager', 'Sales Manager'],
    editRoles: ['Admin', 'Accounts Manager', 'Sales Executive'],
  },
];

const PERMISSIONS_KEY = 'crm_column_permissions_v2';

export function loadColumnPermissions(): ColumnAccessRule[] {
  try {
    const raw = localStorage.getItem(PERMISSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_COLUMN_RULES;
}

export function saveColumnPermissions(rules: ColumnAccessRule[], syncToServer = true): void {
  try {
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(rules));
    if (syncToServer && typeof window !== 'undefined') {
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnPermissions: rules }),
      }).catch(() => {});
    }
  } catch (e) {
    console.error(e);
  }
}

export function canViewColumn(columnKey: string, role: UserRole, rules: ColumnAccessRule[]): boolean {
  if (role === 'Admin') return true;
  const rule = rules.find((r) => r.columnKey === columnKey);
  if (!rule) return true;
  return rule.viewRoles.includes(role);
}

export function canEditColumn(columnKey: string, role: UserRole, rules: ColumnAccessRule[]): boolean {
  if (role === 'Admin') return true;
  const rule = rules.find((r) => r.columnKey === columnKey);
  if (!rule) return true;
  return rule.editRoles.includes(role);
}
