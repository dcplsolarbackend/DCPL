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

function buildAppsScriptCode(mainSheetDefault = 'Main Project Sheet', paymentSheetDefault = 'Payment Sheet') {
  return `// =========================================================================
// DCPL Solar CRM - Google Apps Script (Code.gs)
// Handles "${mainSheetDefault}" (44 Columns) + "${paymentSheetDefault}" (7 Columns)
// + "Users" Sheet (Multi-System Login) + Direct Google Drive PDF Uploads
// Compatible with AppSheet-style next row entry and formula cell preservation
// =========================================================================

var MAIN_SHEET_NAME = ${JSON.stringify(mainSheetDefault)};
var PAYMENT_SHEET_NAME = ${JSON.stringify(paymentSheetDefault)};
var USERS_SHEET_NAME = "Users";
var DRIVE_FOLDER_NAME = "DCPL Solar CRM Documents";

// Safe numeric parser that cleans currency symbols (₹, Rs, $), commas and spaces
function parseSheetNumber(val) {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  var str = String(val).replace(/[^0-9.-]/g, "");
  var num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// 1. GET: Fetch Main Project Sheet, Payment Sheet, Users Sheet & Available Tabs
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var requestedMain = (e && e.parameter && e.parameter.mainSheet) ? String(e.parameter.mainSheet).trim() : MAIN_SHEET_NAME;
    var requestedPay = (e && e.parameter && e.parameter.paymentSheet) ? String(e.parameter.paymentSheet).trim() : PAYMENT_SHEET_NAME;
    
    var mainSheet = getOrCreateMainSheet(ss, requestedMain);
    var paySheet = getOrCreatePaymentSheet(ss, requestedPay);
    var usersSheet = getOrCreateUsersSheet(ss);
    // STRICT: Return exact real sheet tab names that exist in this Google Spreadsheet
    var availableSheets = ss.getSheets().map(function(s) { return s.getName(); });
    
    // Step A: Read Payment Sheet first and sum payments by LeadID
    var payData = paySheet.getDataRange().getValues();
    payData.shift(); // remove headers
    var payments = [];
    var paymentSumByLeadId = {};
    
    for (var j = 0; j < payData.length; j++) {
      var pr = payData[j];
      var payLeadId = String(pr[0] || "").trim();
      var payAmt = parseSheetNumber(pr[3]);
      var payDateVal = formatDate(pr[1]);
      var payTxnVal = String(pr[4] || "").trim();

      // Only include rows that have actual payment data
      if (payLeadId && (payAmt > 0 || payTxnVal || payDateVal)) {
        payments.push({
          id: "PAY-" + (j + 1),
          leadId: payLeadId,
          paymentDate: payDateVal,
          paymentType: String(pr[2] || "UPI"),
          amount: payAmt,
          transactionId: payTxnVal || ("TXN-" + (j + 1)),
          receiptImage: String(pr[5] || ""),
          remark: String(pr[6] || "")
        });
        var normKey = payLeadId.toLowerCase();
        paymentSumByLeadId[normKey] = (paymentSumByLeadId[normKey] || 0) + payAmt;
      }
    }

    // Step B: Read Main Project Sheet and calculate Payment Received & Due Amount from Payment Sheet sum
    var mainData = mainSheet.getDataRange().getValues();
    mainData.shift(); // remove headers
    var leads = [];
    
    for (var i = 0; i < mainData.length; i++) {
      var r = mainData[i];
      var leadIdVal = String(r[0] || "").trim();
      var custNameVal = String(r[15] || "").trim();
      var phoneVal = String(r[16] || "").trim();
      var dateVal = formatDate(r[1]);

      // Only include rows that have real lead data (ignore empty formula-padded rows)
      if (leadIdVal || custNameVal || phoneVal || dateVal) {
        var resolvedId = leadIdVal || ("LD-" + (i + 2));
        var dealAmt = parseSheetNumber(r[22]);
        var sheetPaidAmt = parseSheetNumber(r[37]);
        var normLeadKey = resolvedId.toLowerCase();
        var summedPaid = paymentSumByLeadId[normLeadKey] !== undefined
          ? paymentSumByLeadId[normLeadKey]
          : sheetPaidAmt;
        var calcDueAmt = Math.max(0, dealAmt - summedPaid);

        leads.push({
          leadId: resolvedId,
          leadDate: dateVal,
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
          dealAmount: dealAmt,
          quotationAmount: parseSheetNumber(r[23]),
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
          paymentReceived: summedPaid,
          duePayment: calcDueAmt,
          notes: String(r[39] || ""),
          quotationFile: String(r[40] || ""),
          lastModifiedBy: String(r[41] || ""),
          lastModifiedTime: formatDate(r[42]),
          firstPaymentMonth: formatDate(r[43])
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
      availableSheets: availableSheets,
      mainSheetName: mainSheet.getName(),
      paymentSheetName: paySheet.getName(),
      leads: leads,
      payments: payments,
      users: users
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. POST: Save Lead, Record Payment in Payment Sheet, Sync Users, List Sheets, or Login
function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var requestedMain = String(req.mainSheetName || req.targetSheet || MAIN_SHEET_NAME).trim();
    var requestedPay = String(req.paymentSheetName || PAYMENT_SHEET_NAME).trim();

    // Action 0: List Available Sheet Tabs in Spreadsheet (Real tabs only)
    if (req.action === "getSheets") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        availableSheets: ss.getSheets().map(function(s) { return s.getName(); })
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
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
    
    // Action 2: Save or Update Lead in Selected Main Sheet
    if (req.action === "saveLead" || (!req.action && (req.leadId || req["LeadID"] || req.lead))) {
      var mainSheet = getOrCreateMainSheet(ss, requestedMain);
      var paySheetForLead = getOrCreatePaymentSheet(ss, requestedPay);
      var leadObj = req.lead || req;
      var savedRow = saveSingleLead(mainSheet, leadObj, req.updatedBy);
      updateLeadPaymentTotals(mainSheet, paySheetForLead, leadObj.leadId || leadObj["LeadID"]);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        leadId: leadObj.leadId || leadObj["LeadID"],
        sheetName: mainSheet.getName(),
        row: savedRow
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Action 2B: Batch Sync
    if (req.action === "syncBatch") {
      var mainSheetBatch = getOrCreateMainSheet(ss, requestedMain);
      var paySheetBatch = getOrCreatePaymentSheet(ss, requestedPay);
      if (req.payments && req.payments.length) {
        for (var pIdx = 0; pIdx < req.payments.length; pIdx++) {
          saveSinglePaymentToSheet(paySheetBatch, req.payments[pIdx]);
        }
      }
      if (req.leads && req.leads.length) {
        for (var k = 0; k < req.leads.length; k++) {
          saveSingleLead(mainSheetBatch, req.leads[k], req.updatedBy);
          updateLeadPaymentTotals(mainSheetBatch, paySheetBatch, req.leads[k].leadId || req.leads[k]["LeadID"]);
        }
      }
      if (req.users && req.users.length) {
        var uSheetBatch = getOrCreateUsersSheet(ss);
        saveUsersToSheet(uSheetBatch, req.users);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        availableSheets: ss.getSheets().map(function(s) { return s.getName(); }),
        mainSheetName: mainSheetBatch.getName(),
        paymentSheetName: paySheetBatch.getName()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Action 3: Save Payment record into Selected Payment Sheet (Linked by LeadID)
    if (req.action === "savePayment") {
      var paySheet = getOrCreatePaymentSheet(ss, requestedPay);
      var mainSheetForPay = getOrCreateMainSheet(ss, req.mainSheetName || MAIN_SHEET_NAME);
      var p = req.payment || req;
      var targetPayRow = saveSinglePaymentToSheet(paySheet, p);
      
      // Recalculate and update Payment Received & Due Amount in Main Project Sheet from Payment Sheet sum
      updateLeadPaymentTotals(mainSheetForPay, paySheet, p.leadId || p["LeadID"]);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        leadId: p.leadId || p["LeadID"],
        transactionId: p.transactionId || p["Transaction ID"],
        sheetName: paySheet.getName(),
        row: targetPayRow
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Action 4: Save / Sync Users from Admin Settings so any system can log in
    if (req.action === "saveUsers" && req.users) {
      var usersSheetSync = getOrCreateUsersSheet(ss);
      saveUsersToSheet(usersSheetSync, req.users);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: req.users.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Action 4B: Save single user
    if (req.action === "saveUser" && req.user) {
      var usersSheetSingle = getOrCreateUsersSheet(ss);
      var allUsers = req.users || [req.user];
      saveUsersToSheet(usersSheetSingle, allUsers);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", user: req.user.email }))
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

// Writes Lead into the EXACT NEXT ROW right after the previous entry (AppSheet style),
// preserving formula cells so Google Sheets processes formulas automatically.
function saveSingleLead(sheet, l, updatedBy) {
  var leadIdStr = String(l.leadId || l["LeadID"] || "").trim();
  var maxScanRows = Math.max(sheet.getLastRow(), 1);
  var numCols = Math.max(sheet.getLastColumn(), 44);

  // Scan rows to find existing LeadID or detect the last real data row
  var scanData = sheet.getRange(1, 1, maxScanRows, Math.min(numCols, 25)).getValues();
  var existingRowIdx = -1;
  var lastRealDataRowIdx = 1; // Header row 1

  for (var i = 1; i < scanData.length; i++) {
    var rowLeadId = String(scanData[i][0] || "").trim();
    var rowDate = scanData[i][1] ? String(scanData[i][1]).trim() : "";
    var rowCustomer = scanData[i][15] !== undefined ? String(scanData[i][15]).trim() : "";
    var rowPhone = scanData[i][16] !== undefined ? String(scanData[i][16]).trim() : "";

    // Match existing lead
    if (leadIdStr && rowLeadId && rowLeadId.toLowerCase() === leadIdStr.toLowerCase()) {
      existingRowIdx = i + 1;
      break;
    }

    // A row is considered a real data entry if it has LeadID, Date, Customer Name, or Phone
    if (rowLeadId !== "" || rowCustomer !== "" || rowPhone !== "" || rowDate !== "") {
      lastRealDataRowIdx = i + 1;
    }
  }

  // If editing an existing lead, use that row.
  // If adding a new lead, insert into the exact row right after the last entry (NOT bottom of sheet)!
  var targetRow = existingRowIdx > 0 ? existingRowIdx : (lastRealDataRowIdx + 1);

  // Check existing formulas in targetRow (Columns 1..44)
  var targetRange = sheet.getRange(targetRow, 1, 1, 44);
  var targetFormulas = targetRange.getFormulas()[0];

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
    parseSheetNumber(l.dealAmount || l["Deal Amount"]),
    parseSheetNumber(l.quotationAmount || l["Quotation Amount"]),
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
    parseSheetNumber(l.paymentReceived || l["Payment Received"]),
    parseSheetNumber(l.duePayment || l["Due Amount"]),
    l.notes || l["Remark"] || "",
    l.quotationFile || l["Quotation File"] || "",
    updatedBy || l.lastModifiedBy || l["Last Modified By"] || "",
    Utilities.formatDate(new Date(), "GMT+5:30", "M/d/yyyy HH:mm:ss"),
    l.firstPaymentMonth || l["First Payment Month"] || ""
  ];

  // Preserves existing formulas in targetRow OR auto-copies formula from row above if new row (AppSheet behavior)
  for (var c = 0; c < 44; c++) {
    if (targetFormulas && targetFormulas[c] && String(targetFormulas[c]).trim().indexOf("=") === 0) {
      // Cell already has a formula in the sheet — do not overwrite with static value
      rowData[c] = targetFormulas[c];
    } else if (existingRowIdx === -1 && targetRow > 2) {
      // If new row and cell has no formula, check if row above has a formula to auto-fill
      var aboveFormula = sheet.getRange(targetRow - 1, c + 1).getFormula();
      if (aboveFormula && aboveFormula.indexOf("=") === 0) {
        sheet.getRange(targetRow - 1, c + 1).copyTo(sheet.getRange(targetRow, c + 1), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
        rowData[c] = sheet.getRange(targetRow, c + 1).getFormula();
      }
    }
  }

  targetRange.setValues([rowData]);
  return targetRow;
}

// Writes Payment into the EXACT NEXT ROW right after the previous payment entry (AppSheet style),
// preserving formula cells and letting Google Sheets calculate formulas automatically.
function saveSinglePaymentToSheet(paySheet, p) {
  var leadIdStr = String(p.leadId || p["LeadID"] || "").trim();
  var payDateStr = String(p.paymentDate || p["Payment Date"] || "");
  var payTypeStr = String(p.paymentType || p["Payment Type"] || "UPI");
  var payAmt = parseSheetNumber(p.amount || p["Amount"]);
  var txnIdStr = String(p.transactionId || p["Transaction ID"] || "").trim();
  var receiptStr = String(p.receiptImage || p["Receipt Image"] || "");
  var remarkStr = String(p.remark || p["Remark"] || "");

  var maxScanRows = Math.max(paySheet.getLastRow(), 1);
  var scanData = paySheet.getRange(1, 1, maxScanRows, Math.min(paySheet.getLastColumn() || 7, 7)).getValues();
  
  var existingRowIdx = -1;
  var lastRealPaymentRowIdx = 1; // Header row 1

  for (var i = 1; i < scanData.length; i++) {
    var rowLeadId = String(scanData[i][0] || "").trim();
    var rowDate = scanData[i][1] ? String(scanData[i][1]).trim() : "";
    var rowAmt = parseSheetNumber(scanData[i][3]);
    var rowTxn = String(scanData[i][4] || "").trim();

    // Check if updating an existing payment record
    if (leadIdStr && txnIdStr && rowLeadId.toLowerCase() === leadIdStr.toLowerCase() && rowTxn.toLowerCase() === txnIdStr.toLowerCase()) {
      existingRowIdx = i + 1;
      break;
    }

    // A row is considered a real payment entry if it has LeadID, Date, Amount > 0, or Transaction ID
    if (rowLeadId !== "" || rowDate !== "" || rowAmt > 0 || rowTxn !== "") {
      lastRealPaymentRowIdx = i + 1;
    }
  }

  // Next row immediately after previous payment entry
  var targetRow = existingRowIdx > 0 ? existingRowIdx : (lastRealPaymentRowIdx + 1);

  var targetRange = paySheet.getRange(targetRow, 1, 1, 7);
  var targetFormulas = targetRange.getFormulas()[0];

  var payRowData = [
    leadIdStr,
    payDateStr,
    payTypeStr,
    payAmt,
    txnIdStr,
    receiptStr,
    remarkStr
  ];

  // Preserves existing formulas in targetRow OR auto-copies formula from row above
  for (var c = 0; c < 7; c++) {
    if (targetFormulas && targetFormulas[c] && String(targetFormulas[c]).trim().indexOf("=") === 0) {
      payRowData[c] = targetFormulas[c];
    } else if (existingRowIdx === -1 && targetRow > 2) {
      var prevCellFormula = paySheet.getRange(targetRow - 1, c + 1).getFormula();
      if (prevCellFormula && prevCellFormula.indexOf("=") === 0) {
        paySheet.getRange(targetRow - 1, c + 1).copyTo(paySheet.getRange(targetRow, c + 1), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
        payRowData[c] = paySheet.getRange(targetRow, c + 1).getFormula();
      }
    }
  }

  targetRange.setValues([payRowData]);
  return targetRow;
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

function updateLeadPaymentTotals(mainSheet, paySheet, leadId) {
  var normTargetId = String(leadId || "").trim().toLowerCase();
  if (!normTargetId) return;

  var pSheet = paySheet || getOrCreatePaymentSheet(SpreadsheetApp.getActiveSpreadsheet());
  var payData = pSheet.getDataRange().getValues();
  var totalForLead = 0;
  var matchCount = 0;

  for (var k = 1; k < payData.length; k++) {
    if (String(payData[k][0] || "").trim().toLowerCase() === normTargetId) {
      totalForLead += parseSheetNumber(payData[k][3]);
      matchCount++;
    }
  }

  if (matchCount === 0) return;

  var data = mainSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || "").trim().toLowerCase() === normTargetId) {
      var row = i + 1;
      var deal = parseSheetNumber(data[i][22]);
      var newDue = Math.max(0, deal - totalForLead);

      // Check if Col 38 or Col 39 already have formulas in Google Sheet
      var col38Formula = mainSheet.getRange(row, 38).getFormula();
      var col39Formula = mainSheet.getRange(row, 39).getFormula();

      // Only set static values if there are NO formulas, preserving user's formula processing
      if (!col38Formula || col38Formula.indexOf("=") !== 0) {
        mainSheet.getRange(row, 38).setValue(totalForLead); // Col 38: Payment Received
      }
      if (!col39Formula || col39Formula.indexOf("=") !== 0) {
        mainSheet.getRange(row, 39).setValue(newDue);       // Col 39: Due Amount
      }
      break;
    }
  }
}

function getOrCreateMainSheet(ss, preferredName) {
  var targetName = String(preferredName || MAIN_SHEET_NAME).trim();
  var names = [targetName, MAIN_SHEET_NAME, "Main Data", "Main Sheet", "Leads", "Sheet1"];
  var allSheets = ss.getSheets();
  for (var n = 0; n < names.length; n++) {
    if (!names[n]) continue;
    var existing = ss.getSheetByName(names[n]);
    if (existing) return existing;
    var lower = String(names[n]).toLowerCase();
    for (var sIdx = 0; sIdx < allSheets.length; sIdx++) {
      if (allSheets[sIdx].getName().trim().toLowerCase() === lower) {
        return allSheets[sIdx];
      }
    }
  }
  var s = ss.insertSheet(targetName || MAIN_SHEET_NAME);
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
  return s;
}

function getOrCreatePaymentSheet(ss, preferredName) {
  var targetName = String(preferredName || PAYMENT_SHEET_NAME).trim();
  var names = [targetName, PAYMENT_SHEET_NAME, "Payment Details", "Payment Data", "Payments", "Payment"];
  var allSheets = ss.getSheets();
  for (var n = 0; n < names.length; n++) {
    if (!names[n]) continue;
    var existing = ss.getSheetByName(names[n]);
    if (existing) return existing;
    var lower = String(names[n]).toLowerCase();
    for (var sIdx = 0; sIdx < allSheets.length; sIdx++) {
      if (allSheets[sIdx].getName().trim().toLowerCase() === lower) {
        return allSheets[sIdx];
      }
    }
  }
  var s = ss.insertSheet(targetName || PAYMENT_SHEET_NAME);
  s.appendRow([
    "LeadID", "Payment Date", "Payment Type", "Amount", "Transaction ID", "Receipt Image", "Remark"
  ]);
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
}

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
  const [mainSheetName, setMainSheetName] = useState(syncConfig.mainSheetName || 'Main Project Sheet');
  const [paymentSheetName, setPaymentSheetName] = useState(syncConfig.paymentSheetName || 'Payment Sheet');
  // STRICT: Only hold real sheet tabs detected from the connected Google Spreadsheet
  const [detectedSheets, setDetectedSheets] = useState<string[]>(
    Array.isArray(syncConfig.availableSheets)
      ? syncConfig.availableSheets.filter((s) => typeof s === 'string' && s.trim().length > 0 && s.toLowerCase() !== 'users')
      : []
  );
  const [customSheetInput, setCustomSheetInput] = useState('');
  const [isFetchingSheets, setIsFetchingSheets] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setWebAppUrl(syncConfig.webAppUrl || '');
      setMainSheetName(syncConfig.mainSheetName || 'Main Project Sheet');
      setPaymentSheetName(syncConfig.paymentSheetName || 'Payment Sheet');
      if (Array.isArray(syncConfig.availableSheets)) {
        const real = syncConfig.availableSheets.filter((s) => typeof s === 'string' && s.trim().length > 0 && s.toLowerCase() !== 'users');
        setDetectedSheets(real);
      }
    }
  }, [isOpen, syncConfig.webAppUrl, syncConfig.mainSheetName, syncConfig.paymentSheetName, syncConfig.availableSheets]);

  if (!isOpen) return null;

  const generatedAppsScriptCode = buildAppsScriptCode(
    mainSheetName.trim() || 'Main Project Sheet',
    paymentSheetName.trim() || 'Payment Sheet'
  );

  // Combined list of sheet options strictly derived from real detected tabs in Google Sheet
  const allSheetOptions = detectedSheets.length > 0
    ? detectedSheets
    : Array.from(new Set([mainSheetName.trim(), paymentSheetName.trim()].filter(Boolean)));

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedAppsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleFetchSheetsFromUrl = async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl ?? webAppUrl).trim();
    if (!targetUrl) {
      setStatusMessage('Please enter your Google Apps Script Web App URL first.');
      return;
    }
    setIsFetchingSheets(true);
    try {
      const res = await fetch('/api/sheet-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webAppUrl: targetUrl,
          method: 'GET',
          mainSheetName: mainSheetName.trim() || 'Main Project Sheet',
          paymentSheetName: paymentSheetName.trim() || 'Payment Sheet',
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const incomingTabs: string[] = Array.isArray(json.availableSheets)
          ? json.availableSheets
          : Array.isArray(json.sheets)
          ? json.sheets
          : [];

        if (incomingTabs.length > 0) {
          // Filter out internal system sheets like Users if desired, keep all actual user sheets
          const realTabs = incomingTabs.filter(s => s && s.toLowerCase() !== 'users');
          setDetectedSheets(realTabs);

          const resolvedMain = realTabs.includes(mainSheetName)
            ? mainSheetName
            : (json.mainSheetName && realTabs.includes(json.mainSheetName) ? json.mainSheetName : realTabs[0]);
          const resolvedPay = realTabs.includes(paymentSheetName)
            ? paymentSheetName
            : (json.paymentSheetName && realTabs.includes(json.paymentSheetName) ? json.paymentSheetName : (realTabs.length > 1 ? realTabs[1] : realTabs[0]));

          setMainSheetName(resolvedMain);
          setPaymentSheetName(resolvedPay);

          onSaveSyncConfig({
            ...syncConfig,
            webAppUrl: targetUrl,
            mainSheetName: resolvedMain,
            paymentSheetName: resolvedPay,
            availableSheets: realTabs,
            autoSync: true,
          });
          setStatusMessage(`Live Google Spreadsheet tabs detected (${realTabs.length}): ${realTabs.join(', ')}`);
        } else {
          setStatusMessage(`Connected! Main Sheet: "${mainSheetName}" | Payment Sheet: "${paymentSheetName}".`);
        }
      }
    } catch {
      setStatusMessage('Saved configuration. Select your Main Sheet and Payment Sheet below.');
    } finally {
      setIsFetchingSheets(false);
    }
  };

  const handleSaveUrl = () => {
    const cleanMain = mainSheetName.trim() || 'Main Project Sheet';
    const cleanPay = paymentSheetName.trim() || 'Payment Sheet';
    const updatedTabs = Array.from(new Set([cleanMain, cleanPay, ...detectedSheets]));
    setDetectedSheets(updatedTabs);
    onSaveSyncConfig({
      ...syncConfig,
      webAppUrl: webAppUrl.trim(),
      mainSheetName: cleanMain,
      paymentSheetName: cleanPay,
      availableSheets: updatedTabs,
      autoSync: true,
      lastSyncedAt: new Date().toISOString(),
    });
    setStatusMessage(`Saved! Main Sheet: "${cleanMain}" | Payment Sheet: "${cleanPay}".`);
    if (webAppUrl.trim()) {
      handleFetchSheetsFromUrl(webAppUrl.trim());
    }
  };

  const handleSelectMainSheet = (newMainName: string) => {
    setMainSheetName(newMainName);
    const cleanMain = newMainName.trim() || 'Main Project Sheet';
    const cleanPay = paymentSheetName.trim() || 'Payment Sheet';
    const updatedTabs = Array.from(new Set([cleanMain, cleanPay, ...detectedSheets]));
    setDetectedSheets(updatedTabs);
    onSaveSyncConfig({
      ...syncConfig,
      webAppUrl: webAppUrl.trim() || syncConfig.webAppUrl,
      mainSheetName: cleanMain,
      paymentSheetName: cleanPay,
      availableSheets: updatedTabs,
    });
    setStatusMessage(`Main Sheet set to "${cleanMain}". Click "Sync Now" to pull/push data with this sheet.`);
  };

  const handleSelectPaymentSheet = (newPayName: string) => {
    setPaymentSheetName(newPayName);
    const cleanMain = mainSheetName.trim() || 'Main Project Sheet';
    const cleanPay = newPayName.trim() || 'Payment Sheet';
    const updatedTabs = Array.from(new Set([cleanMain, cleanPay, ...detectedSheets]));
    setDetectedSheets(updatedTabs);
    onSaveSyncConfig({
      ...syncConfig,
      webAppUrl: webAppUrl.trim() || syncConfig.webAppUrl,
      mainSheetName: cleanMain,
      paymentSheetName: cleanPay,
      availableSheets: updatedTabs,
    });
    setStatusMessage(`Payment Sheet set to "${cleanPay}". Click "Sync Now" to pull/push payments with this sheet.`);
  };

  const handleAddCustomSheetTab = () => {
    const trimmed = customSheetInput.trim();
    if (!trimmed) return;
    const updatedTabs = Array.from(new Set([trimmed, ...detectedSheets]));
    setDetectedSheets(updatedTabs);
    onSaveSyncConfig({
      ...syncConfig,
      availableSheets: updatedTabs,
    });
    setCustomSheetInput('');
    setStatusMessage(`Added sheet tab "${trimmed}" to selector list. You can now assign it as Main Sheet or Payment Sheet.`);
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
                Main Sheet: <strong>{mainSheetName || 'Main Project Sheet'}</strong> (44 Cols) + Payment Sheet: <strong>{paymentSheetName || 'Payment Sheet'}</strong> (7 Cols)
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
                    Syncs <strong>{leads.length}</strong> project rows (<strong>{mainSheetName}</strong>) + <strong>{payments.length}</strong> payment transactions (<strong>{paymentSheetName}</strong>).
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
                  type="button"
                  onClick={handleSaveUrl}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer shrink-0"
                >
                  Save & Attach Sheet
                </button>
              </div>
              {statusMessage && (
                <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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
                    ? `Active — Automatically syncs with "${mainSheetName}" & "${paymentSheetName}" every ${syncConfig.syncIntervalMinutes || 1} min(s) and on every record change.`
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
                      mainSheetName: mainSheetName.trim() || 'Main Project Sheet',
                      paymentSheetName: paymentSheetName.trim() || 'Payment Sheet',
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
                        mainSheetName: mainSheetName.trim() || 'Main Project Sheet',
                        paymentSheetName: paymentSheetName.trim() || 'Payment Sheet',
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

            {/* Interactive Sheet Tabs Selection: Select which Sheet is Main Sheet & which Sheet is Payment Sheet */}
            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <ArrowDownUp className="w-4 h-4 text-indigo-600" />
                    <span>Select & Change Attached Sheets (Main Sheet & Payment Sheet Mapping)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Choose which sheet tab in your attached Google Spreadsheet is used for <strong>Main Project Data</strong> and which is used for <strong>Payment Data</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isFetchingSheets}
                  onClick={() => handleFetchSheetsFromUrl()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-semibold cursor-pointer shrink-0 shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingSheets ? 'animate-spin' : ''}`} />
                  <span>{isFetchingSheets ? 'Loading Sheet Tabs...' : 'Detect Tabs from Sheet'}</span>
                </button>
              </div>

              {/* Real Available Sheet Tabs from Google Spreadsheet */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Live Tabs from Attached Spreadsheet ({detectedSheets.length}):
                  </span>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Add custom tab name..."
                      value={customSheetInput}
                      onChange={(e) => setCustomSheetInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomSheetTab();
                        }
                      }}
                      className="px-2.5 py-1 text-[11px] bg-slate-50 border border-slate-300 rounded-lg w-40 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSheetTab}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-medium rounded-lg cursor-pointer"
                    >
                      + Add Tab
                    </button>
                  </div>
                </div>

                {detectedSheets.length === 0 ? (
                  <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Google Sheet ke real tabs dekhne ke liye upar URL enter karke <strong>"Detect Tabs from Sheet"</strong> par click karein.</span>
                    </div>
                    <button
                      type="button"
                      disabled={isFetchingSheets}
                      onClick={() => handleFetchSheetsFromUrl()}
                      className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-[11px] cursor-pointer shrink-0"
                    >
                      {isFetchingSheets ? 'Detecting...' : 'Detect Tabs'}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {detectedSheets.map((tabName) => {
                      const isMain = tabName === mainSheetName;
                      const isPay = tabName === paymentSheetName;
                      return (
                        <div
                          key={tabName}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all ${
                            isMain
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold shadow-2xs'
                              : isPay
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="font-mono">{tabName}</span>
                          {isMain && (
                            <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">
                              MAIN
                            </span>
                          )}
                          {isPay && (
                            <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">
                              PAYMENT
                            </span>
                          )}
                          {!isMain && (
                            <button
                              type="button"
                              onClick={() => handleSelectMainSheet(tabName)}
                              title="Set as Main Project Sheet"
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer ml-1"
                            >
                              [Use for Main]
                            </button>
                          )}
                          {!isPay && (
                            <button
                              type="button"
                              onClick={() => handleSelectPaymentSheet(tabName)}
                              title="Set as Payment Sheet"
                              className="text-[10px] text-emerald-600 hover:text-emerald-800 hover:underline cursor-pointer ml-0.5"
                            >
                              [Use for Pay]
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Main Project Sheet Selector Card */}
                <div className="p-3.5 bg-white rounded-xl border-2 border-indigo-200 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-indigo-950 font-bold text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-indigo-600 text-white inline-flex items-center justify-center text-[11px] font-bold">
                        1
                      </span>
                      <span>Main Data Sheet (44 Columns)</span>
                    </strong>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Active: {mainSheetName}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Select Sheet Tab for Main Project Data:
                    </label>
                    <select
                      value={allSheetOptions.includes(mainSheetName) ? mainSheetName : '__custom__'}
                      onChange={(e) => {
                        if (e.target.value !== '__custom__') {
                          handleSelectMainSheet(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-indigo-50/40 border border-indigo-300 rounded-lg text-xs font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {allSheetOptions.map((sheetOpt) => (
                        <option key={`main-${sheetOpt}`} value={sheetOpt}>
                          📄 {sheetOpt} {sheetOpt === paymentSheetName ? '(Currently Payment Sheet)' : ''}
                        </option>
                      ))}
                      <option value="__custom__">✏️ Type Custom Sheet Name Below...</option>
                    </select>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-500 shrink-0">Or Edit Tab Name:</span>
                      <input
                        type="text"
                        value={mainSheetName}
                        onChange={(e) => handleSelectMainSheet(e.target.value)}
                        placeholder="e.g. Main Project Sheet"
                        className="flex-1 px-2.5 py-1 text-[11px] font-mono bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Stores LeadID, Dates, Customer Details, Sales Person, Technical Specs, Deal Amount, Summed Payment Received & Due Amount.
                  </p>
                </div>

                {/* 2. Payment Sheet Selector Card */}
                <div className="p-3.5 bg-white rounded-xl border-2 border-emerald-200 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-emerald-950 font-bold text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-emerald-600 text-white inline-flex items-center justify-center text-[11px] font-bold">
                        2
                      </span>
                      <span>Payment Data Sheet (7 Columns)</span>
                    </strong>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active: {paymentSheetName}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Select Sheet Tab for Payment Details:
                    </label>
                    <select
                      value={allSheetOptions.includes(paymentSheetName) ? paymentSheetName : '__custom__'}
                      onChange={(e) => {
                        if (e.target.value !== '__custom__') {
                          handleSelectPaymentSheet(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-emerald-50/40 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {allSheetOptions.map((sheetOpt) => (
                        <option key={`pay-${sheetOpt}`} value={sheetOpt}>
                          💳 {sheetOpt} {sheetOpt === mainSheetName ? '(Currently Main Sheet)' : ''}
                        </option>
                      ))}
                      <option value="__custom__">✏️ Type Custom Sheet Name Below...</option>
                    </select>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-500 shrink-0">Or Edit Tab Name:</span>
                      <input
                        type="text"
                        value={paymentSheetName}
                        onChange={(e) => handleSelectPaymentSheet(e.target.value)}
                        placeholder="e.g. Payment Sheet"
                        className="flex-1 px-2.5 py-1 text-[11px] font-mono bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Stores LeadID, Payment Date, Payment Type (Cash, UPI, RTGS/NEFT, Loan), Amount (₹), Transaction ID, Receipt Image & Remark.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  Mapped: <strong className="text-indigo-700">{mainSheetName}</strong> (Main) &amp; <strong className="text-emerald-700">{paymentSheetName}</strong> (Payment)
                </span>
                <button
                  type="button"
                  onClick={handleManualSyncNow}
                  disabled={isSyncing}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  Save Sheet Selection &amp; Sync Now
                </button>
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
                  Configured for Main Sheet: <strong>"{mainSheetName}"</strong> + Payment Sheet: <strong>"{paymentSheetName}"</strong> + Google Drive uploads.
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
              {generatedAppsScriptCode}
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
