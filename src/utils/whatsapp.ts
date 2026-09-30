import { Lead } from '../types/crm';

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'followup' | 'quotation' | 'payment' | 'installation' | 'general';
  getMessage: (lead: Lead) => string;
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'followup_today',
    name: 'Scheduled Follow-Up / Meeting',
    category: 'followup',
    getMessage: (lead) =>
      `Hello ${lead.customerName},\n\nThis is ${lead.salesPerson} from DCPL Solar Customer Team. Following up as per our scheduled discussion regarding your solar project inquiry (${lead.projectType || 'Solar System'}).\n\nPlease let us know a convenient time to speak today!\n\nBest regards,\n${lead.salesPerson}`,
  },
  {
    id: 'quotation_ready',
    name: 'Quotation Prepared & Shared',
    category: 'quotation',
    getMessage: (lead) =>
      `Dear ${lead.customerName},\n\nGreeting from DCPL Solar! Your customized solar proposal and technical quotation for ${lead.projectType || 'your site'} has been prepared.\n\nWe have outlined the expected monthly generation, DISCOM subsidy eligibility, and payback period. Would you like us to walk you through the details?\n\nContact: ${lead.salesPerson} (${lead.salesEmail})`,
  },
  {
    id: 'due_payment_reminder',
    name: 'Payment Due Reminder',
    category: 'payment',
    getMessage: (lead) =>
      `Dear ${lead.customerName},\n\nThis is a polite reminder regarding the pending balance of ₹${lead.duePayment.toLocaleString('en-IN')} for your project (Lead Ref: ${lead.leadId}).\n\nKindly arrange the payment at your earliest convenience to proceed with the next milestone.\n\nThank you for your cooperation,\nDCPL Solar Accounts Team`,
  },
  {
    id: 'installation_update',
    name: 'Installation / Documentation Status',
    category: 'installation',
    getMessage: (lead) =>
      `Hello ${lead.customerName},\n\nWe have updated the status of your project (${lead.leadId}) to "${lead.status}". Our technical engineering team is preparing the necessary grid documentation and site logistics.\n\nFor any questions, feel free to reply directly here.\n\nRegards,\nDCPL Solar Team`,
  },
  {
    id: 'general_greeting',
    name: 'Quick Hello / Lead Connect',
    category: 'general',
    getMessage: (lead) =>
      `Hello ${lead.customerName},\n\nThank you for reaching out to us regarding solar power solutions. I am ${lead.salesPerson}, your dedicated project representative. When would be a good time for a brief 5-minute introductory call?\n\nWarm regards,\n${lead.salesPerson}`,
  },
];

export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  // Strip non-digits except +
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.length === 10) {
    // Standard 10-digit Indian mobile number
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

export function generateWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedMsg = encodeURIComponent(message);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  }
  return `https://wa.me/?text=${encodedMsg}`;
}
