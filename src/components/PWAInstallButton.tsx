import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { Smartphone, Download, Share, X, Check } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  // If already running inside standalone app, hide button
  if (isInstalled) {
    return (
      <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
        <Check className="w-3 h-3" />
        <span>Installed App</span>
      </span>
    );
  }

  return (
    <>
      {/* 1. Android/Desktop Chrome native install trigger */}
      {isInstallable ? (
        <button
          onClick={install}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install App (APK)</span>
        </button>
      ) : isIOS ? (
        // 2. iOS Safari step-by-step guidance button
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Smartphone className="w-3.5 h-3.5 text-slate-600" />
          <span>Install on iPhone</span>
        </button>
      ) : (
        // 3. Fallback guide button for Android / other browsers
        <button
          onClick={() => setShowAndroidGuide(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">Phone App</span>
        </button>
      )}

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <p>Safari browser me neeche <strong>Share</strong> icon (square with arrow ↑) par tap karein.</p>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <p>Neeche scroll karke <strong>"Add to Home Screen" (होम स्क्रीन पर जोड़ें)</strong> chunein.</p>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <p>Upar right me <strong>Add</strong> dabayein. Yeh bina App Store ke seedha phone me icon ban jayega!</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-xs cursor-pointer shadow-xs"
            >
              Theek hai (Done)
            </button>
          </div>
        </div>
      )}

      {/* Android Chrome Guide Modal */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Install on Android Phone</h3>
              </div>
              <button
                onClick={() => setShowAndroidGuide(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <p>Chrome browser me upar 3 dots (⋮ menu) par click karein.</p>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <p><strong>"Install app"</strong> ya <strong>"Add to Home screen"</strong> par click karein.</p>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <p>App phone ki home screen par ek native APK app ki tarah save ho jayegi!</p>
              </div>
            </div>

            <button
              onClick={() => setShowAndroidGuide(false)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs cursor-pointer shadow-xs"
            >
              Theek hai (Done)
            </button>
          </div>
        </div>
      )}
    </>
  );
};
