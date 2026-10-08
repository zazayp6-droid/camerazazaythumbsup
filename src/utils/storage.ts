/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ============================================================================
 * LOCAL STORAGE CONTROLLER
 * ============================================================================
 * 
 * --- How LocalStorage Saves Photos ---
 * The Web Storage API (localStorage) is a synchronous key-value store available
 * in modern browsers. It persists data even after page reloads or closing the tab.
 * 
 * 1. Storage Format:
 *    localStorage only stores UTF-16 strings. Therefore, our array of photo objects:
 *    [ { id: "...", image: "data:image/jpeg;base64,...", date: "..." }, ... ]
 *    must be serialized to JSON with JSON.stringify() and parsed with JSON.parse().
 * 
 * 2. Storage Quota Limitation:
 *    Most desktop and mobile browsers enforce a quota of ~5MB to 10MB per origin.
 *    Capturing high-resolution uncompressed images would quickly throw a QuotaExceededError.
 *    To prevent this:
 *    - We compress photos to high-efficiency JPEG format with quality ~0.75-0.80.
 *    - We limit the gallery prototype to 30 photos (MAX_PHOTOS).
 *    - When the quota is exceeded, we catch the error gracefully and notify the user.
 */

import { CapturedPhoto } from '../types';

export const STORAGE_KEY = 'thumbsnapPhotos';
export const MAX_PHOTOS = 30;

export interface StorageResult {
  success: boolean;
  error?: string;
  isFull?: boolean;
}

/**
 * Loads saved photos from browser localStorage.
 */
export function getSavedPhotos(): CapturedPhoto[] {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) return [];
    const parsed = JSON.parse(rawData);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to parse photos from localStorage:', err);
    return [];
  }
}

/**
 * Saves a new photo to localStorage and enforces maximum limit of 30.
 * Also catches QuotaExceededError if browser storage runs out of memory.
 */
export function savePhotoToStorage(newPhoto: CapturedPhoto): StorageResult {
  try {
    const existing = getSavedPhotos();

    // Check if maximum prototype capacity is reached
    if (existing.length >= MAX_PHOTOS) {
      return {
        success: false,
        isFull: true,
        error: `Gallery limit reached (${MAX_PHOTOS}/${MAX_PHOTOS} photos). Please delete older photos or clear gallery to capture more.`
      };
    }

    // Insert new photo at the beginning (newest first)
    const updated = [newPhoto, ...existing];
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    return { success: true };
  } catch (err) {
    console.error('LocalStorage write error:', err);
    // Handle browser storage quota exceeded error
    const isQuota = (err as Error)?.name === 'QuotaExceededError' || 
                    (err as Error)?.message?.includes('quota');
    return {
      success: false,
      isFull: isQuota,
      error: isQuota 
        ? 'Browser storage is full! Please delete some photos to free up space.' 
        : 'Failed to save photo to local browser storage.'
    };
  }
}

/**
 * Deletes a single photo by ID from localStorage.
 */
export function deletePhotoFromStorage(id: string): boolean {
  try {
    const existing = getSavedPhotos();
    const filtered = existing.filter(photo => photo.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Failed to delete photo from localStorage:', err);
    return false;
  }
}

/**
 * Clears all photos from localStorage.
 */
export function clearAllPhotosFromStorage(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.error('Failed to clear photos from localStorage:', err);
    return false;
  }
}

/**
 * Calculates approximate storage size used in KB.
 */
export function getStorageUsageKb(): number {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) return 0;
    return Math.round((rawData.length * 2) / 1024); // UTF-16 = 2 bytes per char
  } catch {
    return 0;
  }
}
