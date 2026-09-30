import React, { useState, useEffect } from 'react';
import { Lead } from '../types/crm';
import { 
  WHATSAPP_TEMPLATES, 
  generateWhatsAppUrl, 
  cleanPhoneNumber 
} from '../utils/whatsapp';
import { X, Send, Copy, Check, MessageSquare } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  lead,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('followup_today');
  const [messageText, setMessageText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (lead) {
      // Pick suitable default template
      let defaultId = 'followup_today';
      if ((lead.duePayment || 0) > 0) {
        defaultId = 'due_payment_reminder';
      } else if (lead.status === 'Quotation') {
        defaultId = 'quotation_ready';
      } else if (lead.status === 'Installation' || lead.status === 'Documentation') {
        defaultId = 'installation_update';
      }
      setSelectedTemplateId(defaultId);
      const tmpl = WHATSAPP_TEMPLATES.find((t) => t.id === defaultId) || WHATSAPP_TEMPLATES[0];
      setMessageText(tmpl.getMessage(lead));
    }
  }, [lead, isOpen]);

  if (!isOpen || !lead) return null;

  const handleTemplateChange = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = WHATSAPP_TEMPLATES.find((t) => t.id === tmplId);
    if (tmpl) {
      setMessageText(tmpl.getMessage(lead));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const url = generateWhatsAppUrl(lead.phone, messageText);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 text-white rounded-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                WhatsApp Connect
              </h3>
              <p className="text-xs text-emerald-800">
                To: <span className="font-semibold">{lead.customerName}</span> ({lead.phone})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Template choices */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Choose Quick Template
            </label>
            <div className="grid grid-cols-2 gap-2">
              {WHATSAPP_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleTemplateChange(tmpl.id)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                    selectedTemplateId === tmpl.id
                      ? 'border-emerald-600 bg-emerald-50/50 font-semibold text-emerald-900 shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="truncate">{tmpl.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Editable text message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Message Preview & Customize
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={7}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500">
            Formatted phone destination: <span className="font-mono font-semibold text-slate-700">+{cleanPhoneNumber(lead.phone)}</span>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Launch WhatsApp Chat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
