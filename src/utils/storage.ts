import { Lead, PaymentRecord, SheetSyncConfig } from '../types/crm';
import { INITIAL_LEADS } from '../data/initialLeads';
import { INITIAL_PAYMENTS } from '../data/initialPayments';

const STORAGE_KEY = 'crm_leads_data_v3';
const PAYMENTS_KEY = 'crm_payments_data_v3';
const CONFIG_KEY = 'crm_sheet_sync_config_v3';

export function loadLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveLeads(INITIAL_LEADS, false);
      return INITIAL_LEADS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_LEADS;
  } catch (err) {
    console.error('Error reading leads from localStorage:', err);
    return INITIAL_LEADS;
  }
}

export function saveLeads(leads: Lead[], syncToServer = true): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    if (syncToServer && typeof window !== 'undefined') {
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads }),
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Error saving leads to localStorage:', err);
  }
}

export function resetLeads(): Lead[] {
  saveLeads(INITIAL_LEADS);
  savePayments(INITIAL_PAYMENTS);
  return INITIAL_LEADS;
}

export function loadPayments(): PaymentRecord[] {
  try {
    const raw = localStorage.getItem(PAYMENTS_KEY);
    if (!raw) {
      savePayments(INITIAL_PAYMENTS, false);
      return INITIAL_PAYMENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PAYMENTS;
  } catch (err) {
    return INITIAL_PAYMENTS;
  }
}

export function savePayments(payments: PaymentRecord[], syncToServer = true): void {
  try {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
    if (syncToServer && typeof window !== 'undefined') {
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments }),
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Error saving payments to localStorage:', err);
  }
}

export function loadSyncConfig(): SheetSyncConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const fallbackUrl = localStorage.getItem('dcpl_apps_script_url') || '';
      const webAppUrl = parsed.webAppUrl || fallbackUrl;
      return {
        webAppUrl,
        spreadsheetId: parsed.spreadsheetId || '',
        mainSheetName: parsed.mainSheetName || 'Main Project Sheet',
        paymentSheetName: parsed.paymentSheetName || 'Payment Sheet',
        driveFolderId: parsed.driveFolderId || '',
        autoSync: parsed.autoSync !== undefined ? Boolean(parsed.autoSync) : true,
        lastSyncedAt: parsed.lastSyncedAt || null,
        syncIntervalMinutes: parsed.syncIntervalMinutes || 1,
      };
    }
  } catch (e) {
    console.error(e);
  }
  const savedScriptUrl = typeof window !== 'undefined' ? localStorage.getItem('dcpl_apps_script_url') || '' : '';
  return {
    webAppUrl: savedScriptUrl,
    spreadsheetId: '',
    mainSheetName: 'Main Project Sheet',
    paymentSheetName: 'Payment Sheet',
    driveFolderId: '',
    autoSync: true,
    lastSyncedAt: null,
    syncIntervalMinutes: 1,
  };
}

export function saveSyncConfig(cfg: SheetSyncConfig, syncToServer = true): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    if (cfg.webAppUrl) {
      localStorage.setItem('dcpl_apps_script_url', cfg.webAppUrl.trim());
    }
    if (syncToServer && typeof window !== 'undefined') {
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncConfig: cfg }),
      }).catch(() => {});
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Builds a complete, multi-compatible Google Sheet payload for a Lead.
 * Ensures that whether the Apps Script reads `req.lead`, top-level camelCase keys,
 * `req.rowValues`, or exact Google Sheet Header keys, all 44 columns are mapped
 * starting from Column 1 (LeadID) into the exact next upcoming row.
 */
export function buildSheetLeadPayload(lead: Lead, updatedBy: string) {
  const nowTime = lead.lastModifiedTime || new Date().toLocaleString();
  const rowValues = [
    lead.leadId || '',
    lead.leadDate || '',
    lead.followUpDate || '',
    lead.nextFollowUp || '',
    lead.convertedDate || '',
    lead.quotationDate || '',
    lead.documentationDate || '',
    lead.registrationDate || '',
    lead.loanDate || '',
    lead.surveyDate || '',
    lead.mDispatchDate || '',
    lead.installationDate || '',
    lead.netMeterDate || '',
    lead.connectionDate || '',
    lead.completeDate || '',
    lead.customerName || '',
    lead.phone || '',
    lead.address || '',
    lead.source || '',
    lead.salesPerson || '',
    lead.status || 'New Leads',
    lead.systemCapacity || '',
    lead.dealAmount || 0,
    lead.quotationAmount || 0,
    lead.paymentType || '',
    lead.priceApproval || '',
    lead.quotationFileApproved || '',
    lead.projectSheetApproved || '',
    lead.documentImage || '',
    lead.otherDocImage || '',
    lead.panels || '',
    lead.inverters || '',
    lead.battery || '',
    lead.wiring || '',
    lead.structure || '',
    lead.netMeterDone ? 'TRUE' : 'FALSE',
    lead.subsidyDone ? 'TRUE' : 'FALSE',
    lead.paymentReceived || 0,
    lead.duePayment || 0,
    lead.notes || '',
    lead.quotationFile || '',
    updatedBy || lead.lastModifiedBy || '',
    nowTime,
    lead.firstPaymentMonth || '',
  ];

  return {
    action: 'saveLead',
    insertMode: 'nextUpcomingRow',
    lead: {
      ...lead,
      lastModifiedBy: updatedBy || lead.lastModifiedBy || '',
      lastModifiedTime: nowTime,
    },
    ...lead,
    updatedBy: updatedBy || lead.lastModifiedBy || '',
    lastModifiedBy: updatedBy || lead.lastModifiedBy || '',
    lastModifiedTime: nowTime,
    rowValues,
    row: rowValues,
    'LeadID': lead.leadId || '',
    'Lead Date': lead.leadDate || '',
    'Follow Up Date': lead.followUpDate || '',
    'Next Follow Up ': lead.nextFollowUp || '',
    'Next Follow Up': lead.nextFollowUp || '',
    'Converted Date': lead.convertedDate || '',
    'Quotation Date': lead.quotationDate || '',
    'Documentation Date': lead.documentationDate || '',
    'Registration Date': lead.registrationDate || '',
    'Loan Date': lead.loanDate || '',
    'Survey Date': lead.surveyDate || '',
    'M Dispatch Date': lead.mDispatchDate || '',
    'Installation Date': lead.installationDate || '',
    'Net Meter Date': lead.netMeterDate || '',
    'Connection Date': lead.connectionDate || '',
    'Complete Date': lead.completeDate || '',
    'Customer Name': lead.customerName || '',
    'Phone No': lead.phone || '',
    'Phone': lead.phone || '',
    'Address': lead.address || '',
    'Source': lead.source || '',
    'Sales Person': lead.salesPerson || '',
    'Current Status': lead.status || 'New Leads',
    'Status': lead.status || 'New Leads',
    'System Capacity': lead.systemCapacity || '',
    'Deal Amount': lead.dealAmount || 0,
    'Quotation Amount': lead.quotationAmount || 0,
    'Type': lead.paymentType || '',
    'Price Approval': lead.priceApproval || '',
    'Quoattion File': lead.quotationFileApproved || '',
    'Project Sheet Approved': lead.projectSheetApproved || '',
    'Document Image': lead.documentImage || '',
    'Other Doc. Image': lead.otherDocImage || '',
    'Panels': lead.panels || '',
    'Inverters': lead.inverters || '',
    'Battery': lead.battery || '',
    'Wiring': lead.wiring || '',
    'Structure': lead.structure || '',
    'Net Meter ': lead.netMeterDone ? 'TRUE' : 'FALSE',
    'Net Meter': lead.netMeterDone ? 'TRUE' : 'FALSE',
    'Subsidy': lead.subsidyDone ? 'TRUE' : 'FALSE',
    'Payment Received': lead.paymentReceived || 0,
    'Due Amount': lead.duePayment || 0,
    'Remark': lead.notes || '',
    'Quotation File': lead.quotationFile || '',
    'Last Modified By': updatedBy || lead.lastModifiedBy || '',
    'Last Modified Time': nowTime,
    'First Payment Month': lead.firstPaymentMonth || '',
  };
}

export interface QuotationPdfInfo {
  url: string;
  fileName: string;
  rawValue: string;
  isDirectUrl: boolean;
}

/**
 * Resolves the Quotation PDF link (from Col 41 quotationFile or Col 27 quotationFileApproved).
 * Supports both direct https:// links and Google Drive / AppSheet relative file paths.
 */
export function getQuotationPdfInfo(lead: Partial<Lead> | null | undefined): QuotationPdfInfo | null {
  if (!lead) return null;
  const raw = (lead.quotationFile || lead.quotationFileApproved || '').trim();
  if (!raw) return null;

  const isDirectUrl = /^https?:\/\//i.test(raw);
  const parts = raw.split('/');
  const lastPart = parts[parts.length - 1] || raw;
  const fileName = decodeURIComponent(lastPart).replace(/\?.*$/, '') || 'Quotation.pdf';

  if (isDirectUrl) {
    return {
      url: raw,
      fileName,
      rawValue: raw,
      isDirectUrl: true,
    };
  }

  const searchQuery = encodeURIComponent(lastPart);
  const driveUrl = `https://drive.google.com/drive/search?q=${searchQuery}`;

  return {
    url: driveUrl,
    fileName,
    rawValue: raw,
    isDirectUrl: false,
  };
}

export const MAIN_SHEET_HEADERS = [
  'LeadID',
  'Lead Date',
  'Follow Up Date',
  'Next Follow Up ',
  'Converted Date',
  'Quotation Date',
  'Documentation Date',
  'Registration Date',
  'Loan Date',
  'Survey Date',
  'M Dispatch Date',
  'Installation Date',
  'Net Meter Date',
  'Connection Date',
  'Complete Date',
  'Customer Name',
  'Phone No',
  'Address',
  'Source',
  'Sales Person',
  'Current Status',
  'System Capacity',
  'Deal Amount',
  'Quotation Amount',
  'Type',
  'Price Approval',
  'Quoattion File',
  'Project Sheet Approved',
  'Document Image',
  'Other Doc. Image',
  'Panels',
  'Inverters',
  'Battery',
  'Wiring',
  'Structure',
  'Net Meter ',
  'Subsidy',
  'Payment Received',
  'Due Amount',
  'Remark',
  'Quotation File',
  'Last Modified By',
  'Last Modified Time',
  'First Payment Month',
];

export const PAYMENT_SHEET_HEADERS = [
  'LeadID',
  'Payment Date',
  'Payment Type',
  'Amount',
  'Transaction ID',
  'Receipt Image',
  'Remark',
];

/**
 * Generates CSV string matching the exact 44 columns in user's Main Project Sheet
 */
export function exportToGoogleSheetCsv(leads: Lead[]): string {
  const rows = leads.map((l) => [
    l.leadId,
    l.leadDate || '',
    l.followUpDate || '',
    l.nextFollowUp || '',
    l.convertedDate || '',
    l.quotationDate || '',
    l.documentationDate || '',
    l.registrationDate || '',
    l.loanDate || '',
    l.surveyDate || '',
    l.mDispatchDate || '',
    l.installationDate || '',
    l.netMeterDate || '',
    l.connectionDate || '',
    l.completeDate || '',
    `"${(l.customerName || '').replace(/"/g, '""')}"`,
    `"${(l.phone || '').replace(/"/g, '""')}"`,
    `"${(l.address || '').replace(/"/g, '""')}"`,
    `"${(l.source || '').replace(/"/g, '""')}"`,
    `"${(l.salesPerson || '').replace(/"/g, '""')}"`,
    l.status,
    `"${(l.systemCapacity || '').replace(/"/g, '""')}"`,
    l.dealAmount || 0,
    l.quotationAmount || 0,
    l.paymentType || '',
    l.priceApproval || '',
    l.quotationFileApproved || '',
    l.projectSheetApproved || '',
    l.documentImage || '',
    l.otherDocImage || '',
    `"${(l.panels || '').replace(/"/g, '""')}"`,
    `"${(l.inverters || '').replace(/"/g, '""')}"`,
    `"${(l.battery || '').replace(/"/g, '""')}"`,
    `"${(l.wiring || '').replace(/"/g, '""')}"`,
    `"${(l.structure || '').replace(/"/g, '""')}"`,
    l.netMeterDone ? 'TRUE' : 'FALSE',
    l.subsidyDone ? 'TRUE' : 'FALSE',
    l.paymentReceived || 0,
    l.duePayment || 0,
    `"${(l.notes || '').replace(/"/g, '""')}"`,
    l.quotationFile || '',
    l.lastModifiedBy || '',
    l.lastModifiedTime || '',
    l.firstPaymentMonth || '',
  ]);

  return [MAIN_SHEET_HEADERS.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Generates CSV string matching the 7 columns in user's Payment Sheet
 */
export function exportPaymentsCsv(payments: PaymentRecord[]): string {
  const rows = payments.map((p) => [
    p.leadId,
    p.paymentDate || '',
    `"${(p.paymentType || '').replace(/"/g, '""')}"`,
    p.amount || 0,
    `"${(p.transactionId || '').replace(/"/g, '""')}"`,
    p.receiptImage || '',
    `"${(p.remark || '').replace(/"/g, '""')}"`,
  ]);

  return [PAYMENT_SHEET_HEADERS.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function downloadCsv(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Robust CSV parser that handles quotes and multiple lines
 */
export function parseGoogleSheetCsv(csvText: string): Lead[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) return [];

  const dataLines = lines.slice(1);
  const results: Lead[] = [];

  for (const line of dataLines) {
    const cells: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());

    if (cells.length >= 16) {
      const leadId = cells[0] || `LD-${Math.floor(1000 + Math.random() * 9000)}`;
      const leadDate = cells[1] || '';
      const followUpDate = cells[2] || '';
      const nextFollowUp = cells[3] || '';
      const convertedDate = cells[4] || '';
      const quotationDate = cells[5] || '';
      const documentationDate = cells[6] || '';
      const registrationDate = cells[7] || '';
      const loanDate = cells[8] || '';
      const surveyDate = cells[9] || '';
      const mDispatchDate = cells[10] || '';
      const installationDate = cells[11] || '';
      const netMeterDate = cells[12] || '';
      const connectionDate = cells[13] || '';
      const completeDate = cells[14] || '';
      const customerName = cells[15] || 'Unnamed Customer';
      const phone = cells[16] || '';
      const address = cells[17] || '';
      const source = cells[18] || '';
      const salesPerson = cells[19] || '';
      const statusRaw = cells[20] || 'Lead';
      const systemCapacity = cells[21] || '';
      const dealAmount = parseFloat(cells[22]) || 0;
      const quotationAmount = parseFloat(cells[23]) || 0;
      const paymentType = cells[24] || '';
      const priceApproval = cells[25] || '';
      const quotationFileApproved = cells[26] || '';
      const projectSheetApproved = cells[27] || '';
      const documentImage = cells[28] || '';
      const otherDocImage = cells[29] || '';
      const panels = cells[30] || '';
      const inverters = cells[31] || '';
      const battery = cells[32] || '';
      const wiring = cells[33] || '';
      const structure = cells[34] || '';
      const netMeterDone = (cells[35] || '').toUpperCase() === 'TRUE';
      const subsidyDone = (cells[36] || '').toUpperCase() === 'TRUE';
      const paymentReceived = parseFloat(cells[37]) || 0;
      const duePayment = parseFloat(cells[38]) || 0;
      const notes = cells[39] || '';
      const quotationFile = cells[40] || '';
      const lastModifiedBy = cells[41] || '';
      const lastModifiedTime = cells[42] || '';
      const firstPaymentMonth = cells[43] || '';

      results.push({
        leadId,
        leadDate,
        followUpDate,
        nextFollowUp,
        convertedDate,
        quotationDate,
        documentationDate,
        registrationDate,
        loanDate,
        surveyDate,
        mDispatchDate,
        installationDate,
        netMeterDate,
        connectionDate,
        completeDate,
        customerName,
        phone,
        address,
        source,
        salesPerson,
        salesEmail: salesPerson.includes('@') ? salesPerson : '',
        status: statusRaw as any,
        systemCapacity,
        dealAmount,
        quotationAmount,
        paymentType,
        priceApproval,
        quotationFileApproved,
        projectSheetApproved,
        documentImage,
        otherDocImage,
        panels,
        inverters,
        battery,
        wiring,
        structure,
        netMeterDone,
        subsidyDone,
        paymentReceived,
        duePayment,
        notes,
        quotationFile,
        lastModifiedBy,
        lastModifiedTime,
        firstPaymentMonth,
        projectType: systemCapacity || 'Solar Power Project',
      });
    }
  }

  return results;
}

/**
 * Parses Payment Sheet CSV
 */
export function parsePaymentsCsv(csvText: string): PaymentRecord[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) return [];

  const dataLines = lines.slice(1);
  const results: PaymentRecord[] = [];

  for (const line of dataLines) {
    const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim());
    if (parts.length >= 4) {
      results.push({
        id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        leadId: parts[0],
        paymentDate: parts[1] || new Date().toISOString().split('T')[0],
        paymentType: parts[2] || 'Cash',
        amount: parseFloat(parts[3]) || 0,
        transactionId: parts[4] || '',
        receiptImage: parts[5] || '',
        remark: parts[6] || '',
        createdAt: new Date().toISOString(),
      });
    }
  }

  return results;
}
