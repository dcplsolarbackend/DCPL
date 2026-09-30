import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Globe, 
  Smartphone, 
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Rocket
} from 'lucide-react';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicUrl: string;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  isOpen,
  onClose,
  publicUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'public' | 'current'>('public');
  const [currentBrowserUrl, setCurrentBrowserUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentBrowserUrl(window.location.origin || window.location.href);
    }
  }, []);

  if (!isOpen) return null;

  const effectiveUrl = activeTab === 'public' ? publicUrl : (currentBrowserUrl || publicUrl);

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `DCPL Solar CRM App Link:\n${effectiveUrl}\n\n📱 Android / iPhone par open karein aur "Install App" / "Add to Home Screen" karein.\nApni registered Google email se login karein.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(effectiveUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Public Share & Mobile App Setup</span>
                <span className="px-2 py-0.5 text-[10px] bg-indigo-100 text-indigo-700 font-semibold rounded-full">
                  PWA Ready
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Share with sales team, install on Android & iOS, fix 404 Page Not Found
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">

          {/* CRITICAL NOTICE: Page Not Found Solution Banner */}
          <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2 text-amber-950">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-amber-900">
                  ⚠️ "Page Not Found" (404) Error Kyun Aata Hai & Kaise Theek Karein:
                </h4>
                <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                  Google AI Studio me app jab tak <strong>Deploy / Publish</strong> nahi hoti, tab tak public preview link activate nahi hoti. Neeche diye gaye 2 steps follow karein:
                </p>
              </div>
            </div>

            <div className="mt-2.5 pl-7 space-y-2 text-[11px] text-slate-800">
              <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-amber-200">
                <Rocket className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Step 1 (Zaroori):</strong> AI Studio ke sabse upar top-right corner me <strong>"Share" / "Deploy"</strong> button par click karein aur deployment publish karein.
                </div>
              </div>
              <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-amber-200">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Step 2 (Backend Fixed):</strong> Server me <code>npm start</code> aur SPA fallback configuration fix kar di gayi hai, taaki deploy hone ke baad link bina kisi error ke 24x7 chale!
                </div>
              </div>
            </div>
          </div>

          {/* URL Switcher Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">Select Link to Share:</label>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                <button
                  onClick={() => setActiveTab('public')}
                  className={`px-3 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                    activeTab === 'public'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Official Public Link
                </button>
                <button
                  onClick={() => setActiveTab('current')}
                  className={`px-3 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                    activeTab === 'current'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Current Browser URL
                </button>
              </div>
            </div>

            {/* Input & Copy Box */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={effectiveUrl}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-[11px] text-slate-800 select-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => handleCopy(effectiveUrl)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-xs"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons: WhatsApp & Direct Test */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={handleShareWhatsApp}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Share on WhatsApp</span>
            </button>
            <a
              href={effectiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl flex items-center justify-center gap-2 border border-indigo-200 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in New Tab</span>
            </a>
          </div>

          {/* QR Code & Mobile App Installation (Side by Side) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
            <div className="shrink-0 flex flex-col items-center bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <img 
                src={qrCodeUrl} 
                alt="QR Code to App" 
                className="w-32 h-32 object-contain rounded-lg"
                loading="lazy"
              />
              <span className="text-[10px] text-slate-500 font-medium mt-1.5 flex items-center gap-1">
                <QrCode className="w-3 h-3 text-indigo-600" />
                Scan to Open on Mobile
              </span>
            </div>

            <div className="space-y-2.5 text-slate-700 text-[11px] leading-relaxed flex-1">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span>Mobile App (Android / iPhone) Par Kaise Install Karein:</span>
              </h4>
              
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900">📱 Android (Chrome):</div>
                <div>Link ko Chrome me open karein ➔ Upar 3 dots (⋮) dabayein ➔ <strong>"Install app"</strong> ya <strong>"Add to Home Screen"</strong> par click karein. Yeh bina Play Store ke proper app ban jayegi!</div>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900">🍏 iPhone / iPad (Safari):</div>
                <div>Link ko Safari browser me open karein ➔ Neeche Share button (↑) dabayein ➔ <strong>"Add to Home Screen"</strong> chunein.</div>
              </div>
            </div>
          </div>

          {/* Role Based Access Protection */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-[11px] text-emerald-950 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Role-Based Access Protected:</strong> Only users with active Google email configured in <strong>Team & Permissions</strong> can log in and view data. Column-level edit permissions are strictly enforced according to each user's assigned role.
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">DCPL Solar Enterprise CRM</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs cursor-pointer transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
