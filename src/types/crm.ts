export type PipelineStage = 
  | 'Lead'
  | 'New Leads'
  | 'Follow Up'
  | 'Converted'
  | 'Quotation'
  | 'Documentation'
  | 'Registration'
  | 'Loan'
  | 'Survey'
  | 'Material Dispatch'
  | 'Installation'
  | 'Inspection'
  | 'Net Meter'
  | 'Connection'
  | 'Complete'
  | 'Lost';

/**
 * Exact 44 Columns from DCPL Solar Google Sheet ("Main Project Sheet")
 */
export interface Lead {
  // 1-15: IDs & Dates
  leadId: string;                // Col 1: LeadID
  leadDate: string;              // Col 2: Lead Date
  followUpDate: string;          // Col 3: Follow Up Date
  nextFollowUp: string;          // Col 4: Next Follow Up
  convertedDate: string;         // Col 5: Converted Date
  quotationDate: string;         // Col 6: Quotation Date
  documentationDate: string;     // Col 7: Documentation Date
  registrationDate: string;      // Col 8: Registration Date
  loanDate: string;              // Col 9: Loan Date
  surveyDate: string;            // Col 10: Survey Date
  mDispatchDate: string;         // Col 11: M Dispatch Date
  installationDate: string;      // Col 12: Installation Date
  netMeterDate: string;          // Col 13: Net Meter Date
  connectionDate: string;        // Col 14: Connection Date
  completeDate: string;          // Col 15: Complete Date

  // 16-21: Core Customer & Sales Rep
  customerName: string;          // Col 16: Customer Name
  phone: string;                 // Col 17: Phone No
  address: string;               // Col 18: Address
  source: string;                // Col 19: Source (Field, on call, JD enquiry, etc.)
  salesPerson: string;           // Col 20: Sales Person (email or name)
  status: PipelineStage;         // Col 21: Current Status

  // 22-25: System & Financials
  systemCapacity: string;        // Col 22: System Capacity (e.g. 3.15KW Hybrid)
  dealAmount: number;            // Col 23: Deal Amount (₹)
  quotationAmount: number;       // Col 24: Quotation Amount (₹)
  paymentType: string;           // Col 25: Type (Cash, Loan, etc.)

  // 26-30: Approvals & Attachments / Drive files
  priceApproval?: string;        // Col 26: Price Approval image/file link
  quotationFileApproved?: string;// Col 27: Quotation File
  projectSheetApproved?: string; // Col 28: Project Sheet Approved PDF link
  documentImage?: string;        // Col 29: Document Image
  otherDocImage?: string;        // Col 30: Other Doc. Image

  // 31-35: Technical Equipment Specs
  panels?: string;               // Col 31: Panels (e.g. Adani 615w*5nos DCR Panels)
  inverters?: string;            // Col 32: Inverters (e.g. 3.3kw UTL GTI)
  battery?: string;              // Col 33: Battery
  wiring?: string;               // Col 34: Wiring (e.g. 170 mtr)
  structure?: string;            // Col 35: Structure (GI, Hot-Dip, Elevated, etc.)

  // 36-39: Status Flags & Payment Balance
  netMeterDone?: boolean;        // Col 36: Net Meter (TRUE/FALSE)
  subsidyDone?: boolean;         // Col 37: Subsidy (TRUE/FALSE)
  paymentReceived: number;       // Col 38: Payment Received (₹)
  duePayment: number;            // Col 39: Due Amount (₹)

  // 40-44: Remarks & Metadata
  notes?: string;                // Col 40: Remark
  quotationFile?: string;        // Col 41: Quotation File (PDF link)
  lastModifiedBy?: string;       // Col 42: Last Modified By (email)
  lastModifiedTime?: string;     // Col 43: Last Modified Time
  firstPaymentMonth?: string;    // Col 44: First Payment Month

  // Helpers for app
  salesEmail?: string;
  assignedTo?: string;
  createdBy?: string;
  projectType?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Exact 7 Columns from DCPL Solar Google Sheet ("Payment Sheet")
 */
export interface PaymentRecord {
  id: string;                    // Internal tracking ID
  leadId: string;                // Col 1: LeadID
  paymentDate: string;           // Col 2: Payment Date
  paymentType: string;           // Col 3: Payment Type (Cash, UPI, RTGS/NEFT, Cheque, Loan)
  amount: number;                // Col 4: Amount (₹)
  transactionId: string;         // Col 5: Transaction ID / Ref No
  receiptImage?: string;         // Col 6: Receipt Image (Google Drive link / preview)
  remark?: string;               // Col 7: Remark
  createdAt?: string;
}

export type UserRole = 
  | 'Admin' 
  | 'Sales Manager' 
  | 'Sales Executive' 
  | 'Operations Engineer' 
  | 'Accounts Manager';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  phone?: string;
  assignedLeadsCount?: number;
  lastActive: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userEmail: string;
  userName: string;
  userRole: UserRole;
  action: 'CREATE_LEAD' | 'UPDATE_STAGE' | 'UPDATE_PAYMENT' | 'EDIT_LEAD' | 'DELETE_LEAD' | 'USER_STATUS_CHANGE' | 'SHEET_SYNC' | 'RECORD_PAYMENT';
  leadId?: string;
  leadName?: string;
  details: string;
  timestamp: string;
}

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'lead_assigned' | 'stage_changed' | 'payment_due' | 'sheet_synced' | 'system';
  targetLeadId?: string;
}

export type ViewMode = 
  | 'dashboard'     // Main Project Sheet overview
  | 'table'         // All Data (Full 44 Columns View)
  | 'kanban'        // 15-Stage Pipeline Kanban
  | 'followups'     // Daily Follow-ups
  | 'payments'      // Payment Sheet & Receipts Ledger
  | 'users'         // Users & Permissions (RBAC)
  | 'sync';         // Google Sheet & Google Drive 2-Way Sync

export interface SheetSyncConfig {
  webAppUrl: string;
  spreadsheetId?: string;
  mainSheetName: string;
  paymentSheetName: string;
  driveFolderId?: string;
  autoSync: boolean;
  lastSyncedAt: string | null;
  syncIntervalMinutes: number;
}
