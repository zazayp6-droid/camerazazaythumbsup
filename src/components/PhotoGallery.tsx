/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ============================================================================
 * PHOTO GALLERY COMPONENT
 * ============================================================================
 * 
 * Features:
 * - Responsive Grid: Mobile 2 columns, Desktop 3-5 columns
 * - Displays capture date and timestamp
 * - Individual photo deletion with feedback
 * - "Clear Gallery" button with safety confirmation dialog
 * - Prototype storage capacity meter (X / 30 photos)
 * - Lightbox full-size photo preview with download option
 */

import React, { useState } from 'react';
import { 
  Trash2, 
  Download, 
  Eye, 
  AlertCircle, 
  HardDrive, 
  CheckCircle2, 
  X, 
  ExternalLink,
  Sparkles,
  Camera
} from 'lucide-react';
import { CapturedPhoto } from '../types';
import { MAX_PHOTOS } from '../utils/storage';

interface PhotoGalleryProps {
  photos: CapturedPhoto[];
  onDeletePhoto: (id: string) => void;
  onClearAll: () => void;
  storageError?: string | null;
  onDismissError?: () => void;
  onStartCamera?: () => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onDeletePhoto,
  onClearAll,
  storageError,
  onDismissError,
  onStartCamera,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Download photo to user's device
  const handleDownload = (photo: CapturedPhoto) => {
    const link = document.createElement('a');
    link.href = photo.image;
    const cleanDate = photo.date.replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `thumbsnap_${cleanDate}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="space-y-6 mt-10">
      {/* Storage Error Alert Banner */}
      {storageError && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-between gap-3 text-rose-200 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-sm font-medium">{storageError}</p>
          </div>
          {onDismissError && (
            <button
              onClick={onDismissError}
              className="p-1 hover:bg-rose-900/60 rounded-lg text-rose-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Header with Title, Stats & Clear Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              <span>🖼️ Snap Gallery</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
              {photos.length} / {MAX_PHOTOS}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Instant thumbs-up snaps saved safely in browser LocalStorage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Storage Meter */}
          <div className="hidden sm:flex flex-col items-end text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-mono">
              <HardDrive className="w-3.5 h-3.5 text-purple-400" />
              {photos.length} / {MAX_PHOTOS} slots
            </span>
            <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  photos.length >= MAX_PHOTOS ? 'bg-rose-500' : 'bg-purple-500'
                }`}
                style={{ width: `${Math.min(100, (photos.length / MAX_PHOTOS) * 100)}%` }}
              />
            </div>
          </div>

          {/* Clear Gallery Button */}
          {photos.length > 0 && (
            <button
              onClick={() => setConfirmClearOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 border border-rose-500/30 hover:border-rose-500/50 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Gallery
            </button>
          )}
        </div>
      </div>

      {/* Gallery Grid */}
      {photos.length === 0 ? (
        /* Empty State */
        <div className="glass-panel rounded-3xl p-10 sm:p-14 text-center flex flex-col items-center justify-center border-dashed border-2 border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center text-3xl mb-4 shadow-lg shadow-indigo-950">
            👍
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-200">
            No Snaps Yet!
          </h3>
          <p className="text-slate-400 text-sm max-w-md mt-1 mb-6">
            Start the camera above, pose, and give a clear thumbs up gesture. Your photo will appear here automatically!
          </p>
          {onStartCamera && (
            <button
              onClick={onStartCamera}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-purple-900/30 transition-transform active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Start Camera Now
            </button>
          )}
        </div>
      ) : (
        /* Responsive Grid: 2 columns on mobile, 3-5 columns on larger screens */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 md:gap-5">
          {photos.map((photo, index) => (
            <div
              key={photo.id || index}
              className="group relative glass-panel rounded-2xl overflow-hidden border border-slate-800 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-950/40 flex flex-col"
            >
              {/* Photo Image Aspect Container */}
              <div 
                className="relative aspect-4/3 w-full bg-slate-900 overflow-hidden cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.image}
                  alt={`Snap from ${photo.date}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Hover overlay with action icons */}
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 backdrop-blur-[2px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhoto(photo);
                    }}
                    className="p-2 rounded-full bg-indigo-600/90 text-white hover:bg-indigo-500 transition-transform hover:scale-110 shadow-md"
                    title="View Full Size"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(photo);
                    }}
                    className="p-2 rounded-full bg-slate-800/90 text-white hover:bg-slate-700 transition-transform hover:scale-110 shadow-md"
                    title="Download Photo"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* New badge on the newest snap */}
                {index === 0 && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/90 text-white shadow-sm flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Latest
                  </span>
                )}
              </div>

              {/* Photo Card Footer */}
              <div className="p-2.5 sm:p-3 flex items-center justify-between gap-1.5 bg-slate-950/80 border-t border-slate-800/80">
                <span className="text-[11px] sm:text-xs text-slate-400 font-mono truncate" title={photo.date}>
                  {photo.date}
                </span>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePhoto(photo.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                  title="Delete this photo"
                  aria-label="Delete photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedPhoto(null)}
        >
          <div 
            className="relative max-w-4xl w-full max-h-[90vh] glass-panel-glow rounded-3xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-950/70">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Captured Snap</span>
                <span className="text-xs text-slate-400 font-mono">({selectedPhoto.date})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedPhoto)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Display */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-slate-950">
              <img
                src={selectedPhoto.image}
                alt="Captured Snapshot"
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Saved in Browser LocalStorage</span>
              <button
                onClick={() => {
                  onDeletePhoto(selectedPhoto.id);
                  setSelectedPhoto(null);
                }}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1.5 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clear Gallery */}
      {confirmClearOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmClearOpen(false)}
        >
          <div 
            className="max-w-md w-full glass-panel rounded-3xl p-6 border border-rose-500/40 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">Clear All Photos?</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Are you sure you want to delete all <strong>{photos.length}</strong> photos from your gallery? This action cannot be undone as photos are only stored on this device.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearAll();
                  setConfirmClearOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950 cursor-pointer transition-colors"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
