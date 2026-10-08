/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Interactive Technical Guide explaining the system architecture for beginners.
 */

import React from 'react';
import { X, Code2, Camera, Hand, Database, QrCode, Cpu, ShieldCheck } from 'lucide-react';

interface TechExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TechExplainerModal: React.FC<TechExplainerModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="max-w-2xl w-full max-h-[85vh] glass-panel-glow rounded-3xl overflow-hidden flex flex-col border border-purple-500/30 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">How ThumbSnap Works</h3>
              <p className="text-xs text-slate-400">Under the hood technical architecture</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm text-slate-300 leading-relaxed">
          
          {/* Section 1: Camera Access */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <Camera className="w-4 h-4" />
              <span>1. Camera Streaming (getUserMedia)</span>
            </div>
            <p className="text-xs text-slate-300">
              Calls <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded font-mono">navigator.mediaDevices.getUserMedia()</code> requesting strictly video stream (<code className="text-cyan-300 font-mono">audio: false</code>). Mobile devices run with <code className="text-cyan-300 font-mono">playsinline</code> so video stays seamlessly embedded on iOS and Android.
            </p>
          </div>

          {/* Section 2: MediaPipe Hand Tracking */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-purple-400 font-bold">
              <Cpu className="w-4 h-4" />
              <span>2. MediaPipe Hands Neural Pipeline</span>
            </div>
            <p className="text-xs text-slate-300">
              An on-device machine learning pipeline extracts 21 3D coordinates (x, y, z) corresponding to wrist, knuckles, and fingertips at up to 60fps directly inside the browser using WebGL GPU acceleration.
            </p>
          </div>

          {/* Section 3: Thumbs-Up Detection Logic */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Hand className="w-4 h-4" />
              <span>3. Thumbs-Up Recognition & Edge Trigger</span>
            </div>
            <p className="text-xs text-slate-300">
              Analyzes joint geometry: thumb tip (landmark 4) must be raised above knuckles (y &lt; mcp.y), while the other four fingers (index, middle, ring, pinky) must be curled into a fist. To prevent rapid-fire duplicates, a <strong>Rising Edge Trigger</strong> only snaps when gesture transitions from <em>No Thumbs Up &rarr; Thumbs Up</em>, followed by a 2-second cooldown.
            </p>
          </div>

          {/* Section 4: Canvas Snapshot */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Camera className="w-4 h-4" />
              <span>4. Canvas Frame Extraction</span>
            </div>
            <p className="text-xs text-slate-300">
              Draws the live frame to an offscreen <code className="text-amber-300 font-mono">&lt;canvas&gt;</code>, mirrors horizontally if selfie mode is enabled, and converts to a high-fidelity compressed JPEG Data URL via <code className="text-amber-300 font-mono">canvas.toDataURL(&apos;image/jpeg&apos;, 0.82)</code>.
            </p>
          </div>

          {/* Section 5: LocalStorage Persistence */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-pink-400 font-bold">
              <Database className="w-4 h-4" />
              <span>5. LocalStorage (Zero Backend / Zero Cloud)</span>
            </div>
            <p className="text-xs text-slate-300">
              Serializes snaps to browser storage under key <code className="text-pink-300 font-mono">thumbsnapPhotos</code>. Enforces a 30-photo threshold and catches <code className="text-pink-300 font-mono">QuotaExceededError</code> gracefully to safeguard browser storage limits.
            </p>
          </div>

          {/* Section 6: QR Code Generation */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <QrCode className="w-4 h-4" />
              <span>6. QRCode.js Sharing Matrix</span>
            </div>
            <p className="text-xs text-slate-300">
              Generates a 2D QR matrix encoding the exact current URL (<code className="text-cyan-300 font-mono">window.location.href</code>), enabling instant mobile testing without requiring any account login.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 text-center">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-xs transition-opacity hover:opacity-90"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};
