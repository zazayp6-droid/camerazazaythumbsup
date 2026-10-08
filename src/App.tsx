/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ============================================================================
 * THUMBSNAP GALLERY - MAIN APPLICATION ROOT
 * ============================================================================
 * 
 * A futuristic gesture-activated camera prototype powered by:
 * - HTML5 / Modern Responsive CSS / React
 * - MediaPipe Hands (via CDN) for real-time 3D landmark hand tracking
 * - QRCode.js (via CDN) for instant mobile web sharing
 * - Browser LocalStorage for persistent client-side photo storage (Key: thumbsnapPhotos)
 * 
 * Zero backend, zero Firebase, zero external database requirements.
 */

import React, { useState, useEffect } from 'react';
import { Camera, Sparkles, HelpCircle, Shield, HardDrive, Smartphone, RefreshCw } from 'lucide-react';
import { CameraView } from './components/CameraView';
import { PhotoGallery } from './components/PhotoGallery';
import { ShareQRCode } from './components/ShareQRCode';
import { TechExplainerModal } from './components/TechExplainerModal';
import { CapturedPhoto } from './types';
import { 
  getSavedPhotos, 
  savePhotoToStorage, 
  deletePhotoFromStorage, 
  clearAllPhotosFromStorage,
  MAX_PHOTOS,
  getStorageUsageKb
} from './utils/storage';

export default function App() {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [techModalOpen, setTechModalOpen] = useState<boolean>(false);
  const [storageKb, setStorageKb] = useState<number>(0);

  // Load existing photos from LocalStorage on mount
  useEffect(() => {
    refreshPhotos();
  }, []);

  const refreshPhotos = () => {
    const saved = getSavedPhotos();
    setPhotos(saved);
    setStorageKb(getStorageUsageKb());
  };

  // Handle a new photo captured from camera
  const handlePhotoCaptured = (newPhoto: CapturedPhoto) => {
    const result = savePhotoToStorage(newPhoto);

    if (result.success) {
      setStorageError(null);
      refreshPhotos();
    } else {
      setStorageError(result.error || 'Failed to save photo.');
    }
  };

  // Handle deleting a single photo
  const handleDeletePhoto = (id: string) => {
    deletePhotoFromStorage(id);
    refreshPhotos();
  };

  // Handle clearing all photos
  const handleClearAll = () => {
    clearAllPhotosFromStorage();
    refreshPhotos();
    setStorageError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white">
      {/* Ambient background glow effects */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-10 w-80 h-80 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Main Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex items-center justify-between gap-4">
          
          {/* Logo & Brand Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-purple-900/30">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-xl sm:text-2xl">
                👍
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>ThumbSnap</span>
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40 uppercase tracking-widest">
                  Prototype
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Give a thumbs up and capture the moment.
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setTechModalOpen(true)}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="See how gesture detection works"
            >
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">How It Works</span>
              <span className="sm:hidden">Guide</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10">
        
        {/* Hero Banner with Subtitle */}
        <section className="text-center max-w-3xl mx-auto space-y-2 pt-2 sm:pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            AI Gesture Photo Booth • MediaPipe Hands
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Give a thumbs up and{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              capture the moment.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            No hands on the keyboard required. Just point your thumb upwards at the camera to automatically snap instant photos.
          </p>
        </section>

        {/* 1. Camera & Gesture Auto-Capture View */}
        <CameraView
          onPhotoCaptured={handlePhotoCaptured}
          maxLimitReached={photos.length >= MAX_PHOTOS}
        />

        {/* 2. Photo Gallery & LocalStorage Section */}
        <PhotoGallery
          photos={photos}
          onDeletePhoto={handleDeletePhoto}
          onClearAll={handleClearAll}
          storageError={storageError}
          onDismissError={() => setStorageError(null)}
          onStartCamera={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        {/* 3. Share QR Code Section */}
        <ShareQRCode />
      </main>

      {/* App Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 mt-16 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              100% Client-Side Privacy
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              LocalStorage: {photos.length}/{MAX_PHOTOS} Snaps (~{storageKb} KB)
            </span>
            <span>•</span>
            <span>No Backend / No Firebase Required</span>
          </div>

          <p className="text-slate-500 text-[11px]">
            ThumbSnap Gallery prototype • Built with MediaPipe Hands &amp; QRCode.js
          </p>
        </div>
      </footer>

      {/* Interactive Tech Architecture Modal */}
      <TechExplainerModal
        isOpen={techModalOpen}
        onClose={() => setTechModalOpen(false)}
      />
    </div>
  );
}
