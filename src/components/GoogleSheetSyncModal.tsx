import React, { useState } from 'react';
import { Lead, PaymentRecord, SheetSyncConfig, User } from '../types/crm';
import { 
  exportToGoogleSheetCsv, 
  exportPaymentsCsv, 
  downloadCsv, 
  parseGoogleSheetCsv, 
  parsePaymentsCsv,
  MAIN_SHEET_HEADERS,
  PAYMENT_SHEET_HEADERS
} from '../utils/storage';
import { 
  X, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  FileSpreadsheet, 
  RefreshCw,
  ArrowDownUp,
  CheckCircle2,
  HardDrive,
  FolderOpen
} from 'lucide-react';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  payments: PaymentRecord[];
  onImportLeads: (leads: Lead[]) => void;
  onImportPayments: (payments: PaymentRecord[]) => void;
  syncConfig: SheetSyncConfig;
  onSaveSyncConfig: (cfg: SheetSyncConfig) => void;
  onTriggerTwoWaySync: () => Promise<void>;
  isSyncing: boolean;
  currentUser: User;
}

const APPS_SCRIPT_CODE_DRIVE_SHEET = `// =========================================================================
// DCPL Solar CRM - Google Apps Script (Code.gs)
// Handles "Main Project Sheet" (44 Columns) + "Payment Sheet" (7 Columns)
// + "Users" Sheet (Multi-System Login) + Direct Google Drive PDF Uploads
// =========================================================================

var MAIN_SHEET_NAME = "Main Project Sheet";
var PAYMENT_SHEET_NAME = "Payment Sheet";
var USERS_SHEET_NAME = "Users";
var DRIVE_FOLDER_NAME = "DCPL Solar CRM Documents";

// 1. GET: Fetch Main Project Sheet, Payment Sheet & Users Sheet data
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var mainSheet = getOrCreateMainSheet(ss);
    var paySheet = getOrCreatePaymentSheet(ss);
    var usersSheet = getOrCreateUsersSheet(ss);
    
    // Read Main Project Sheet
    var mainData = mainSheet.getDataRange().getValues();
    var mainHeaders = mainData.shift(); // remove headers
    var leads = [];
    
    for (var i = 0; i < mainData.length; i++) {
      var r = mainData[i];
      var leadIdVal = String(r[0] || "").trim();
      var custNameVal = String(r[15] || "").trim();
      var phoneVal = String(r[16] || "").trim();
      if (leadIdVal || custNameVal || phoneVal) {
        leads.push({
          leadId: leadIdVal || ("LD-" + (i + 2)),
          leadDate: formatDate(r[1]),
          followUpDate: formatDate(r[2]),
          nextFollowUp: formatDate(r[3]),
          convertedDate: formatDate(r[4]),
          quotationDate: formatDate(r[5]),
          documentationDate: formatDate(r[6]),
          registrationDate: formatDate(r[7]),
          loanDate: formatDate(r[8]),
          surveyDate: formatDate(r[9]),
          mDispatchDate: formatDate(r[10]),
          installationDate: formatDate(r[11]),
          netMeterDate: formatDate(r[12]),
          connectionDate: formatDate(r[13]),
          completeDate: formatDate(r[14]),
          customerName: custNameVal,
          phone: phoneVal,
          address: String(r[17] || ""),
          source: String(r[18] || ""),
          salesPerson: String(r[19] || ""),
          status: String(r[20] || "New Leads"),
          systemCapacity: String(r[21] || ""),
          dealAmount: Number(r[22]) || 0,
          quotationAmount: Number(r[23]) || 0,
          paymentType: String(r[24] || ""),
          priceApproval: String(r[25] || ""),
          quotationFileApproved: String(r[26] || ""),
          projectSheetApproved: String(r[27] || ""),
          documentImage: String(r[28] || ""),
          otherDocImage: String(r[29] || ""),
          panels: String(r[30] || ""),
          inverters: String(r[31] || ""),
          battery: String(r[32] || ""),
          wiring: String(r[33] || ""),
          structure: String(r[34] || ""),
          netMeterDone: String(r[35]).toUpperCase() === "TRUE",
          subsidyDone: String(r[36]).toUpperCase() === "TRUE",
          paymentReceived: Number(r[37]) || 0,
          duePayment: Number(r[38]) || 0,
          notes: String(r[39] || ""),
          quotationFile: String(r[40] || ""),
          lastModifiedBy: String(r[41] || ""),
          lastModifiedTime: formatDate(r[42]),
          firstPaymentMonth: formatDate(r[43])
        });
      }
    }
    
    // Read Payment Sheet
    var payData = paySheet.getDataRange().getValues();
    payData.shift(); // remove headers
    var payments = [];
    
    for (var j = 0; j < payData.length; j++) {
      var pr = payData[j];
      if (String(pr[0] || "").trim()) {
        payments.push({
          id: "PAY-" + (j + 1),
          leadId: String(pr[0]).trim(),
          paymentDate: formatDate(pr[1]),
          paymentType: String(pr[2] || ""),
          amount: Number(pr[3]) || 0,
          transactionId: String(pr[4] || ""),
          receiptImage: String(pr[5] || ""),
          remark: String(pr[6] || "")
        });
      }
    }

    // Read Users Sheet
    var usersData = usersSheet.getDataRange().getValues();
    usersData.shift(); // remove headers
    var users = [];
    for (var u = 0; u < usersData.length; u++) {
      var ur = usersData[u];
      if (String(ur[1] || "").trim()) {
        var customStages = undefined;
        try {
          if (ur[7]) customStages = JSON.parse(String(ur[7]));
        } catch (e) {}
        users.push({
          id: String(ur[0] || ("USR-" + (u + 1))),
          email: String(ur[1]).trim(),
          password: String(ur[2] || "").trim(),
          name: String(ur[3] || "").trim(),
          role: String(ur[4] || "Sales Executive").trim(),
          status: String(ur[5] || "Active").trim(),
          phone: String(ur[6] || "").trim(),
          customAllowedStages: customStages
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      timestamp: new Date().toISOString(),
      leads: leads,
      payments: payments,
      users: users
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. POST: Save Lead (into exact next upcoming row), Record Payment, Sync Users, or Login
function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Action 1: Upload file to Google Drive and return Drive Web Link
    if (req.action === "uploadFile") {
      var folder = getOrCreateDriveFolder();
      var decoded = Utilities.base64Decode(req.base64Data);
      var blob = Utilities.newBlob(decoded, req.mimeType, req.fileName);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        fileUrl: file.getUrl(),
        fileId: file.getId()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Action 2: Save or Update Lead in Main Project Sheet (Exact Next Upcoming Row, Columns 1..44)
    if (req.action === "saveLead" || (!req.action && (req.leadId || req["LeadID"] || req.lead))) {
      var mainSheet = getOrCreateMainSheet(ss);
      var leadObj = req.lead || req;
      var savedRow = saveSingleLead(mainSheet, leadObj, req.updatedBy);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        leadId: leadObj.leadId || leadObj["LeadID"],
        row: savedRow
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Action 2B: Batch Sync
    if (req.action === "syncBatch") {
      var mainSheetBatch = getOrCreateMainSheet(ss);
      if (req.leads && req.leads.length) {
        for (var k = 0; k < req.leads.length; k++) {
          saveSingleLead(mainSheetBatch, req.leads[k], req.updatedBy);
        }
      }
      if (req.users && req.users.length) {
        var uSheetBatch = getOrCreateUsersSheet(ss);
        saveUsersToSheet(uSheetBatch, req.users);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Action 3: Save Payment record in Payment Sheet (Exact Next Upcoming Row, Columns 1..7)
    if (req.action === "savePayment") {
      var paySheet = getOrCreatePaymentSheet(ss);
      var mainSheetForPay = getOrCreateMainSheet(ss);
      var p = req.payment || req;
      
      var payRowData = [
        p.leadId || "",
        p.paymentDate || "",
        p.paymentType || "",
        Number(p.amount) || 0,
        p.transactionId || "",
        p.receiptImage || "",
        p.remark || ""
      ];

      var targetPayRow = findNextEmptyPaymentRow(paySheet);
      paySheet.getRange(targetPayRow, 1, 1, 7).setValues([payRowData]);
      
      // Update due amount in Main Project Sheet
      updateLeadPaymentTotals(mainSheetForPay, p.leadId);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", transactionId: p.transactionId, row: targetPayRow }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Action 4: Save / Sync Users from Admin Settings so any system can log in
    if (req.action === "saveUsers" && req.users) {
      var usersSheetSync = getOrCreateUsersSheet(ss);
      saveUsersToSheet(usersSheetSync, req.users);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: req.users.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Action 5: User Verification & Role Authentication from "Users" Sheet
    if (req.action === "login") {
      var usersSheet = getOrCreateUsersSheet(ss);
      var usersData = usersSheet.getDataRange().getValues();
      var reqEmail = String(req.email || "").toLowerCase().trim();
      var reqPass = String(req.password || "").trim();

      for (var u = 1; u < usersData.length; u++) {
        var uEmail = String(usersData[u][1] || "").toLowerCase().trim();
        var uPass = String(usersData[u][2] || "").trim();
        var uStatus = String(usersData[u][5] || "Active").trim();

        if (uEmail === reqEmail && (!uPass || uPass === reqPass || uPass.toLowerCase() === reqPass.toLowerCase())) {
          if (uStatus === "Inactive") {
            return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "User account is suspended (Inactive)." }))
              .setMimeType(ContentService.MimeType.JSON);
          }
          var customAllowedStages = undefined;
          try {
            if (usersData[u][7]) customAllowedStages = JSON.parse(String(usersData[u][7]));
          } catch (err) {}

          return ContentService.createTextOutput(JSON.stringify({
            status: "success",
            user: {
              id: String(usersData[u][0] || ("USR-" + u)),
              email: String(usersData[u][1]).trim(),
              name: String(usersData[u][3] || reqEmail.split("@")[0]),
              role: String(usersData[u][4] || "Sales Executive"),
              status: uStatus,
              phone: String(usersData[u][6] || ""),
              customAllowedStages: customAllowedStages
            }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid Credentials" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Writes Lead strictly into Columns 1..44 (Col A..AR) at either the matching LeadID row
// OR the exact next upcoming empty row (ignoring empty rows that only have FALSE checkboxes/formulas)
function saveSingleLead(sheet, l, updatedBy) {
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var numCols = Math.max(sheet.getLastColumn(), 44);
  var data = sheet.getRange(1, 1, lastRow, numCols).getValues();
  var leadIdStr = String(l.leadId || l["LeadID"] || "").trim();

  var existingRowIdx = -1;
  var firstUpcomingEmptyRowIdx = -1;

  for (var i = 1; i < data.length; i++) {
    var rowLeadId = String(data[i][0] || "").trim();
    var rowCustomer = String(data[i][15] || "").trim();
    var rowPhone = String(data[i][16] || "").trim();

    if (leadIdStr && rowLeadId === leadIdStr) {
      existingRowIdx = i + 1;
      break;
    }

    // A row is truly empty if LeadID (Col A), Customer Name (Col P), and Phone No (Col Q) are all blank,
    // even if Columns 36/37 have unchecked FALSE checkboxes or Col 39 has a formula.
    if (firstUpcomingEmptyRowIdx === -1 && rowLeadId === "" && rowCustomer === "" && rowPhone === "") {
      firstUpcomingEmptyRowIdx = i + 1;
    }
  }
  
  var rowData = [
    leadIdStr,
    l.leadDate || l["Lead Date"] || "",
    l.followUpDate || l["Follow Up Date"] || "",
    l.nextFollowUp || l["Next Follow Up "] || l["Next Follow Up"] || "",
    l.convertedDate || l["Converted Date"] || "",
    l.quotationDate || l["Quotation Date"] || "",
    l.documentationDate || l["Documentation Date"] || "",
    l.registrationDate || l["Registration Date"] || "",
    l.loanDate || l["Loan Date"] || "",
    l.surveyDate || l["Survey Date"] || "",
    l.mDispatchDate || l["M Dispatch Date"] || "",
    l.installationDate || l["Installation Date"] || "",
    l.netMeterDate || l["Net Meter Date"] || "",
    l.connectionDate || l["Connection Date"] || "",
    l.completeDate || l["Complete Date"] || "",
    l.customerName || l["Customer Name"] || "",
    l.phone || l["Phone No"] || "",
    l.address || l["Address"] || "",
    l.source || l["Source"] || "",
    l.salesPerson || l["Sales Person"] || "",
    l.status || l["Current Status"] || "New Leads",
    l.systemCapacity || l["System Capacity"] || "",
    Number(l.dealAmount || l["Deal Amount"]) || 0,
    Number(l.quotationAmount || l["Quotation Amount"]) || 0,
    l.paymentType || l["Type"] || "",
    l.priceApproval || l["Price Approval"] || "",
    l.quotationFileApproved || l["Quoattion File"] || "",
    l.projectSheetApproved || l["Project Sheet Approved"] || "",
    l.documentImage || l["Document Image"] || "",
    l.otherDocImage || l["Other Doc. Image"] || "",
    l.panels || l["Panels"] || "",
    l.inverters || l["Inverters"] || "",
    l.battery || l["Battery"] || "",
    l.wiring || l["Wiring"] || "",
    l.structure || l["Structure"] || "",
    (l.netMeterDone === true || String(l.netMeterDone).toUpperCase() === "TRUE") ? "TRUE" : "FALSE",
    (l.subsidyDone === true || String(l.subsidyDone).toUpperCase() === "TRUE") ? "TRUE" : "FALSE",
    Number(l.paymentReceived || l["Payment Received"]) || 0,
    Number(l.duePayment || l["Due Amount"]) || 0,
    l.notes || l["Remark"] || "",
    l.quotationFile || l["Quotation File"] || "",
    updatedBy || l.lastModifiedBy || l["Last Modified By"] || "",
    Utilities.formatDate(new Date(), "GMT+5:30", "M/d/yyyy HH:mm:ss"),
    l.firstPaymentMonth || l["First Payment Month"] || ""
  ];
  
  var targetRow = existingRowIdx > 0
    ? existingRowIdx
    : (firstUpcomingEmptyRowIdx > 0 ? firstUpcomingEmptyRowIdx : data.length + 1);

  // Always write starting at Column 1 (Column A) across 44 columns
  sheet.getRange(targetRow, 1, 1, 44).setValues([rowData]);
  return targetRow;
}

function findNextEmptyPaymentRow(paySheet) {
  var lastRow = Math.max(paySheet.getLastRow(), 1);
  var data = paySheet.getRange(1, 1, lastRow, 7).getValues();
  for (var i = 1; i < data.length; i++) {
    var rowLeadId = String(data[i][0] || "").trim();
    var rowAmount = String(data[i][3] || "").trim();
    if (rowLeadId === "" && (rowAmount === "" || rowAmount === "0")) {
      return i + 1;
    }
  }
  return data.length + 1;
}

function saveUsersToSheet(usersSheet, users) {
  var lastRow = usersSheet.getLastRow();
  if (lastRow > 1) {
    usersSheet.getRange(2, 1, lastRow - 1, 8).clearContent();
  }
  var rows = [];
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    rows.push([
      u.id || ("USR-0" + (i + 1)),
      u.email || "",
      u.password || "sales",
      u.name || "",
      u.role || "Sales Executive",
      u.status || "Active",
      u.phone || "",
      u.customAllowedStages ? JSON.stringify(u.customAllowedStages) : ""
    ]);
  }
  if (rows.length > 0) {
    usersSheet.getRange(2, 1, rows.length, 8).setValues(rows);
  }
}

function getOrCreateUsersSheet(ss) {
  var usersSheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(USERS_SHEET_NAME);
    usersSheet.getRange(1, 1, 1, 8).setValues([[
      "UserID", "Email", "Password", "Name", "Role", "Status", "Phone", "CustomStagesJSON"
    ]]);
    var initialRows = [
      ["USR-01", "dcplsolarbackend@gmail.com", "admin", "DCPL Solar Admin", "Admin", "Active", "+919876543210", ""],
      ["USR-02", "gurupreetraj12@gmail.com", "sales", "Gurupreet Raj", "Sales Executive", "Active", "+918273684253", ""],
      ["USR-08", "ankurjain198606@gmail.com", "sales", "Ankur Jain", "Sales Executive", "Active", "+919359975775", ""],
      ["USR-09", "akashkumar7310586822@gmail.com", "admin", "Akash Kumar", "Operations Engineer", "Active", "+917310586822", ""]
    ];
    usersSheet.getRange(2, 1, initialRows.length, 8).setValues(initialRows);
  }
  return usersSheet;
}

function updateLeadPaymentTotals(mainSheet, leadId) {
  var data = mainSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(leadId)) {
      var row = i + 1;
      var deal = Number(data[i][22]) || 0;
      var currentReceived = Number(data[i][37]) || 0;
      var paySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PAYMENT_SHEET_NAME);
      
      var payData = paySheet.getDataRange().getValues();
      var totalForLead = 0;
      for (var k = 1; k < payData.length; k++) {
        if (String(payData[k][0]) === String(leadId)) {
          totalForLead += Number(payData[k][3]) || 0;
        }
      }
      
      var newDue = Math.max(0, deal - totalForLead);
      mainSheet.getRange(row, 38).setValue(totalForLead); // Payment Received
      mainSheet.getRange(row, 39).setValue(newDue);        // Due Amount
      break;
    }
  }
}

function getOrCreateMainSheet(ss) {
  var s = ss.getSheetByName(MAIN_SHEET_NAME);
  if (!s) {
    s = ss.insertSheet(MAIN_SHEET_NAME);
    s.appendRow([
      "LeadID", "Lead Date", "Follow Up Date", "Next Follow Up ", "Converted Date",
      "Quotation Date", "Documentation Date", "Registration Date", "Loan Date",
      "Survey Date", "M Dispatch Date", "Installation Date", "Net Meter Date",
      "Connection Date", "Complete Date", "Customer Name", "Phone No", "Address",
      "Source", "Sales Person", "Current Status", "System Capacity", "Deal Amount",
      "Quotation Amount", "Type", "Price Approval", "Quoattion File",
      "Project Sheet Approved", "Document Image", "Other Doc. Image", "Panels",
      "Inverters", "Battery", "Wiring", "Structure", "Net Meter ", "Subsidy",
      "Payment Received", "Due Amount", "Remark", "Quotation File", "Last Modified By",
      "Last Modified Time", "First Payment Month"
    ]);
  }
  return s;
}

function getOrCreatePaymentSheet(ss) {
  var s = ss.getSheetByName(PAYMENT_SHEET_NAME);
  if (!s) {
    s = ss.insertSheet(PAYMENT_SHEET_NAME);
    s.appendRow([
      "LeadID", "Payment Date", "Payment Type", "Amount", "Transaction ID", "Receipt Image", "Remark"
    ]);
  }
  return s;
}

function getOrCreateDriveFolder() {
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

function formatDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "GMT+5:30", "M/d/yyyy");
  }
  return String(val);
}`;

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  leads,
  payments,
  onImportLeads,
  onImportPayments,
  syncConfig,
  onSaveSyncConfig,
  onTriggerTwoWaySync,
  isSyncing,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'twoway' | 'code' | 'drive' | 'csv'>('twoway');
  const [webAppUrl, setWebAppUrl] = useState(syncConfig.webAppUrl || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE_DRIVE_SHEET);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveUrl = () => {
    onSaveSyncConfig({
      ...syncConfig,
      webAppUrl: webAppUrl.trim(),
      autoSync: true,
      lastSyncedAt: new Date().toISOString(),
    });
    setStatusMessage('Google Apps Script URL saved successfully.');
  };

  const handleManualSyncNow = async () => {
    if (!webAppUrl) {
      alert('Please enter your Google Apps Script Web App URL first.');
      return;
    }
    handleSaveUrl();
    await onTriggerTwoWaySync();
  };

  const handleExportMainCsv = () => {
    const csvContent = exportToGoogleSheetCsv(leads);
    downloadCsv(`Main_Project_Sheet_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
  };

  const handleExportPaymentsCsv = () => {
    const csvContent = exportPaymentsCsv(payments);
    downloadCsv(`Payment_Sheet_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
  };

  const handleMainFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseGoogleSheetCsv(text);
        if (parsed.length > 0) {
          onImportLeads(parsed);
          alert(`Successfully imported ${parsed.length} projects from Main Project Sheet!`);
        } else {
          alert('Could not parse valid records. Please verify columns.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handlePayFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parsePaymentsCsv(text);
        if (parsed.length > 0) {
          onImportPayments(parsed);
          alert(`Successfully imported ${parsed.length} payment records!`);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Direct Google Sheets & Google Drive Integration
              </h3>
              <p className="text-xs text-slate-500">
                Main Project Sheet (44 Cols) + Payment Sheet (7 Cols) + Drive Attachments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 text-xs font-medium">
          <button
            onClick={() => setActiveTab('twoway')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'twoway'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Two-Way Live Sync
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'code'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Code.gs Script (Copy & Paste)
          </button>
          <button
            onClick={() => setActiveTab('drive')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'drive'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Google Drive Files & Folders
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'csv'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            CSV Backup & Manual Upload
          </button>
        </div>

        {/* Tab 1: Live Two-Way Sync */}
        {activeTab === 'twoway' && (
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
            <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                    <RefreshCw className={`w-4 h-4 text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Synchronize with Your Live Google Sheet</span>
                  </h4>
                  <p className="text-[11px] text-indigo-800 mt-0.5">
                    Syncs <strong>{leads.length}</strong> project rows + <strong>{payments.length}</strong> payment transactions.
                  </p>
                </div>

                <button
                  disabled={isSyncing}
                  onClick={handleManualSyncNow}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now (2-Way)'}
                </button>
              </div>

              {syncConfig.lastSyncedAt && (
                <div className="text-[11px] text-indigo-700 font-mono">
                  Last synchronized: {new Date(syncConfig.lastSyncedAt).toLocaleString()}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-800">
                Your Deployed Google Apps Script Web App URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  onClick={handleSaveUrl}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer shrink-0"
                >
                  Save URL
                </button>
              </div>
              {statusMessage && (
                <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{statusMessage}</span>
                </div>
              )}
            </div>

            {/* Automatic Background Sync Configuration */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      syncConfig.autoSync && Boolean((webAppUrl || syncConfig.webAppUrl).trim())
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-slate-400'
                    }`}
                  />
                  <strong className="text-slate-900 font-bold text-xs">
                    Automatic Background Sync (Auto-Sync)
                  </strong>
                </div>
                <p className="text-[11px] text-slate-600">
                  {syncConfig.autoSync && Boolean((webAppUrl || syncConfig.webAppUrl).trim())
                    ? `Active — Automatically syncs with Google Sheet every ${syncConfig.syncIntervalMinutes || 1} min(s) and on every record change.`
                    : 'Enter a valid Web App URL and keep Auto-Sync enabled for continuous live synchronization.'}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <select
                  value={syncConfig.syncIntervalMinutes || 1}
                  onChange={(e) => {
                    const mins = Number(e.target.value) || 1;
                    onSaveSyncConfig({
                      ...syncConfig,
                      webAppUrl: webAppUrl.trim() || syncConfig.webAppUrl,
                      syncIntervalMinutes: mins,
                      autoSync: true,
                    });
                  }}
                  className="px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value={1}>Every 1 Min</option>
                  <option value={2}>Every 2 Mins</option>
                  <option value={5}>Every 5 Mins</option>
                  <option value={10}>Every 10 Mins</option>
                </select>

                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(syncConfig.autoSync)}
                    onChange={(e) => {
                      onSaveSyncConfig({
                        ...syncConfig,
                        webAppUrl: webAppUrl.trim() || syncConfig.webAppUrl,
                        autoSync: e.target.checked,
                      });
                    }}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-emerald-900">
                    {syncConfig.autoSync ? 'Auto-Sync ON' : 'OFF'}
                  </span>
                </label>
              </div>
            </div>

            {/* Sheet Tabs Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <strong className="text-slate-900 block font-semibold">1. Main Project Sheet (44 Columns)</strong>
                <p className="text-[11px] text-slate-500">
                  LeadID, Dates (Follow Up, Converted, Quotation, Documentation, Registration, Loan, Survey, Dispatch, Installation, Net Meter, Connection, Complete), Customer Details, Technical Specs (Panels, Inverters, Battery, Wiring, Structure), Deal Amount, Due Amount.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <strong className="text-slate-900 block font-semibold">2. Payment Sheet (7 Columns)</strong>
                <p className="text-[11px] text-slate-500">
                  LeadID, Payment Date, Payment Type (Cash, UPI, RTGS/NEFT, Loan), Amount (₹), Transaction ID, Receipt Image (Google Drive link), Remark.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Code.gs Script */}
        {activeTab === 'code' && (
          <div className="p-6 space-y-3 max-h-[75vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800">
                  Google Apps Script (Code.gs)
                </span>
                <p className="text-[11px] text-slate-500">
                  Handles 44 Main Project Sheet columns + 7 Payment Sheet columns + Google Drive uploads.
                </p>
              </div>
              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Script</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed">
              {APPS_SCRIPT_CODE_DRIVE_SHEET}
            </pre>
          </div>
        )}

        {/* Tab 3: Google Drive Attachments */}
        {activeTab === 'drive' && (
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-700">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold">
                <HardDrive className="w-4 h-4 text-blue-600" />
                <span>Google Drive Storage Folder</span>
              </div>
              <p>
                When you deploy the `Code.gs` script, it automatically creates a dedicated Google Drive folder called <strong>"DCPL Solar CRM Documents"</strong> in your Google Drive.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">What is automatically saved to Google Drive:</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-2">
                <li><strong>Quotation PDF Files:</strong> Uploaded customer proposals and system estimates.</li>
                <li><strong>Payment Receipt Images:</strong> Uploaded bank slips, UPI screenshots, and cash receipts.</li>
                <li><strong>Project Sheet Approved PDFs:</strong> Engineering approval sheets and DISCOM sanction letters.</li>
                <li><strong>Customer ID & Electricity Bill Images:</strong> Saved to Document Image / Other Doc. Image.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 4: CSV Export & Import */}
        {activeTab === 'csv' && (
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
            <p className="text-slate-600">
              Download your full database backup or upload CSV files directly.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Main Project Sheet CSV */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <strong className="block font-bold text-slate-900">Main Project Sheet (44 Cols)</strong>
                <p className="text-[11px] text-slate-500">
                  {leads.length} projects with complete milestone dates, technical equipment & dues.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportMainCsv}
                    className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-medium text-slate-700 text-center cursor-pointer"
                  >
                    Export CSV
                  </button>
                  <label className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-medium text-slate-700 text-center cursor-pointer block">
                    <span>Import CSV</span>
                    <input type="file" accept=".csv" onChange={handleMainFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Payment Sheet CSV */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <strong className="block font-bold text-slate-900">Payment Sheet (7 Cols)</strong>
                <p className="text-[11px] text-slate-500">
                  {payments.length} verified payment receipts, transaction IDs & amounts.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportPaymentsCsv}
                    className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-medium text-slate-700 text-center cursor-pointer"
                  >
                    Export CSV
                  </button>
                  <label className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-medium text-slate-700 text-center cursor-pointer block">
                    <span>Import CSV</span>
                    <input type="file" accept=".csv" onChange={handlePayFileUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Active Session: <strong className="text-slate-700">{currentUser.email}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
