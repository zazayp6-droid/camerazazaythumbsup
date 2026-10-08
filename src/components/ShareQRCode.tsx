/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ============================================================================
 * QR CODE GENERATION & SHARING COMPONENT
 * ============================================================================
 * 
 * --- How QR Generation Works ---
 * 1. QRCode.js (loaded via CDN) creates a matrix of black and white squares (2D barcode).
 * 2. It encodes the string into a Reed-Solomon error-corrected bitmap and renders
 *    either an HTML <canvas> or <img> element inside our specified container div.
 * 3. We pass `window.location.href` so scanning with any smartphone camera
 *    immediately navigates to this ThumbSnap Gallery instance.
 * 
 * --- Important Architectural Limitation ---
 * Since this application is purely a client-side prototype without a backend or
 * cloud database (no Firebase/Supabase), captured photos live strictly in the
 * origin's localStorage. Scanning this QR code opens the application on another phone,
 * allowing that device to use the camera and gesture recognition on its own local storage,
 * but will NOT synchronize or transfer photos between devices.
 */

import React, { useEffect, useRef, useState } from 'react';
import { QrCode, Copy, Check, ExternalLink, RefreshCw, AlertTriangle, Smartphone } from 'lucide-react';

declare global {
  interface Window {
    QRCode: any;
  }
}

export const ShareQRCode: React.FC = () => {
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [qrReady, setQrReady] = useState<boolean>(false);

  const retryTimerRef = useRef<any>(null);

  const renderQRCode = () => {
    if (!qrContainerRef.current) return;

    if (typeof window !== 'undefined' && window.QRCode) {
      try {
        qrContainerRef.current.innerHTML = '';
        new window.QRCode(qrContainerRef.current, {
          text: window.location.href,
          width: 180,
          height: 180,
          colorDark: '#0f172a',
          colorLight: '#ffffff',
          correctLevel: 2, // High error correction
        });
        setQrReady(true);
      } catch (err) {
        console.error('Failed to generate QR Code:', err);
      }
    } else {
      // Retry if CDN script is still downloading
      retryTimerRef.current = setTimeout(renderQRCode, 300);
    }
  };

  // Set URL and generate on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
      renderQRCode();
    }

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  const handleGenerateClick = () => {
    setQrReady(false);
    renderQRCode();
  };

  const copyUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = currentUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="glass-panel-glow rounded-3xl p-6 sm:p-8 mt-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -top-20 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Left Information column */}
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider">
            <Smartphone className="w-3.5 h-3.5 text-purple-400" />
            Mobile Access
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <span>📱 Share Gallery</span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Scan this QR code to open <strong>ThumbSnap Gallery</strong> directly on your mobile device or share the experience with a friend nearby.
          </p>

          {/* CRITICAL ARCHITECTURAL LIMITATION BANNER */}
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-amber-200/90 leading-relaxed space-y-1">
              <span className="font-bold text-amber-300 uppercase tracking-wide block">
                Prototype Notice: Device-Local Storage
              </span>
              <p>
                Prototype mode: photos are stored only on this device/browser. QR opens the website but does not transfer local photos to another device.
              </p>
            </div>
          </div>

          {/* URL Display with Copy Button */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs text-slate-400 font-medium block">Current App URL:</label>
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1.5 pl-3.5 max-w-xl">
              <span className="text-xs font-mono text-cyan-300 truncate flex-1 select-all">
                {currentUrl || 'https://...'}
              </span>
              <button
                onClick={copyUrlToClipboard}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                title="Copy URL"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action button: Generate QR */}
          <div className="pt-2">
            <button
              onClick={handleGenerateClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/80 hover:bg-indigo-600 active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-xl border border-indigo-400/40 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Generate QR
            </button>
          </div>
        </div>

        {/* Right QR Display column */}
        <div className="flex flex-col items-center text-center bg-slate-900/80 border border-purple-500/20 p-6 rounded-2xl shadow-2xl shrink-0">
          <div className="bg-white p-3 rounded-xl shadow-inner border border-slate-200">
            {/* Relative wrapper holding both the QR target and the loading state */}
            <div className="relative min-w-[180px] min-h-[180px] flex items-center justify-center bg-white rounded-lg overflow-hidden">
              {/* Dedicated target element for QRCode.js (MUST have zero React children) */}
              <div 
                ref={qrContainerRef} 
                className="w-[180px] h-[180px] flex items-center justify-center"
              />

              {/* Sibling loading overlay managed entirely by React, never touched by innerHTML */}
              {!qrReady && (
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center text-slate-500 text-xs gap-2 pointer-events-none">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="font-medium text-slate-600">Generating QR...</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3.5 text-center">
            <p className="text-xs font-semibold text-slate-200">
              Scan this QR code to open ThumbSnap Gallery
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Opens instant camera in any smartphone browser
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};
