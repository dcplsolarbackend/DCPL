import React, { useState } from 'react';
import { Lead, PaymentRecord, User } from '../types/crm';
import { exportPaymentsCsv, downloadCsv } from '../utils/storage';
import { 
  CreditCard, 
  Plus, 
  Download, 
  Search, 
  IndianRupee, 
  Receipt, 
  Calendar, 
  ExternalLink,
  CheckCircle2,
  Image,
  Upload
} from 'lucide-react';

interface PaymentSheetViewProps {
  payments: PaymentRecord[];
  leads: Lead[];
  onAddPayment: (record: PaymentRecord) => void;
  currentUser: User;
}

export const PaymentSheetView: React.FC<PaymentSheetViewProps> = ({
  payments,
  leads,
  onAddPayment,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New payment form state
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState('UPI');
  const [amount, setAmount] = useState<number | ''>('');
  const [transactionId, setTransactionId] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [remark, setRemark] = useState('');

  const filteredPayments = payments.filter((p) => {
    const lead = leads.find((l) => l.leadId === p.leadId);
    const query = searchTerm.toLowerCase();
    return (
      p.leadId.toLowerCase().includes(query) ||
      p.transactionId.toLowerCase().includes(query) ||
      p.paymentType.toLowerCase().includes(query) ||
      (p.remark && p.remark.toLowerCase().includes(query)) ||
      (lead && lead.customerName.toLowerCase().includes(query))
    );
  });

  const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const handleExportCsv = () => {
    const csv = exportPaymentsCsv(payments);
    downloadCsv(`payment_sheet_${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setReceiptImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !amount || amount <= 0) {
      alert('Please select a valid Lead and enter payment amount.');
      return;
    }

    const newPayment: PaymentRecord = {
      id: `PAY-${Date.now()}`,
      leadId: selectedLeadId,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      paymentType,
      amount: Number(amount),
      transactionId: transactionId || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      receiptImage: receiptImage || '',
      remark: remark || `Payment received by ${currentUser.name}`,
      createdAt: new Date().toISOString(),
    };

    onAddPayment(newPayment);
    setIsAddModalOpen(false);
    // Reset form
    setSelectedLeadId('');
    setAmount('');
    setTransactionId('');
    setReceiptImage('');
    setRemark('');
  };

  const selectedLeadObj = leads.find((l) => l.leadId === selectedLeadId);

  return (
    <div className="space-y-6">
      {/* Header Metric Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>Google Sheet: Payment Sheet Ledger</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Payment Details & Receipt Records</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Columns: LeadID · Payment Date · Payment Type · Amount · Transaction ID · Receipt Image · Remark
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Payments CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-medium text-emerald-800">Total Payments Recorded</span>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-950 mt-1">
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">
            Across {payments.length} verified transactions
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-600">Pending Project Dues</span>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 mt-1">
            ₹{leads.reduce((acc, l) => acc + (l.duePayment || 0), 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Auto-calculated as (Deal Amount - Payment Received)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-600">Total Project Bookings</span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            ₹{leads.reduce((acc, l) => acc + (l.dealAmount || 0), 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Total active pipeline contract value
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Lead ID, Customer, Txn ID, Type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Showing {filteredPayments.length} of {payments.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">LeadID</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Payment Type</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4 text-center">Receipt Image</th>
                <th className="py-3 px-4">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No payment records found. Click "Record Payment" to add one.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const lead = leads.find((l) => l.leadId === p.leadId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {p.leadId}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {lead ? lead.customerName : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {p.paymentDate}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium text-xs">
                          {p.paymentType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        ₹{p.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px] truncate max-w-[150px]">
                        {p.transactionId}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {p.receiptImage ? (
                          <a
                            href={p.receiptImage}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                          >
                            <Image className="w-3.5 h-3.5" />
                            <span>View</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {p.remark || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record New Client Payment</h3>
                <p className="text-[11px] text-slate-500">
                  Updates Payment Sheet & recalculates Due Amount automatically.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
              {/* Select Lead */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Project / Customer * (LeadID)
                </label>
                <select
                  required
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Choose Customer Lead --</option>
                  {leads.map((l) => (
                    <option key={l.leadId} value={l.leadId}>
                      {l.leadId} - {l.customerName} (Deal: ₹{l.dealAmount?.toLocaleString('en-IN') || 0} | Due: ₹{l.duePayment?.toLocaleString('en-IN') || 0})
                    </option>
                  ))}
                </select>
              </div>

              {selectedLeadObj && (
                <div className="p-2.5 bg-indigo-50/60 rounded-lg border border-indigo-100 text-[11px] flex items-center justify-between">
                  <div>
                    <strong className="text-slate-900">{selectedLeadObj.customerName}</strong>
                    <div className="text-slate-500">{selectedLeadObj.systemCapacity}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-rose-600 font-bold font-mono">
                      Due: ₹{selectedLeadObj.duePayment?.toLocaleString('en-IN') || 0}
                    </span>
                  </div>
                </div>
              )}

              {/* Date & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Type</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="UPI">UPI (PhonePe / GPay / Paytm)</option>
                    <option value="RTGS/NEFT">RTGS / NEFT / IMPS</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Loan">Bank Loan Disbursement</option>
                  </select>
                </div>
              </div>

              {/* Amount & Txn ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 50000"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || '')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transaction ID / Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI-98401928"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Receipt Image / Drive File */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Receipt Image / Google Drive Link
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Paste Google Drive file link or upload below..."
                    value={receiptImage}
                    onChange={(e) => setReceiptImage(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-[11px]"
                  />
                  <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer flex items-center gap-1 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Remark */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remark / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Milestone 2 payment received after structure dispatch"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg cursor-pointer shadow-xs"
                >
                  Save & Update Due Amount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
