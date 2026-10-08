/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CapturedPhoto {
  id: string;
  image: string; // Base64 data URL
  date: string;  // Formatted date string (e.g., "Oct 6, 2026, 9:15 PM")
  timestamp: number;
}

export type CameraState = 'idle' | 'requesting' | 'running' | 'error';

export interface GestureDetectionResult {
  isThumbsUp: boolean;
  confidence: number;
  message: string;
  handPresent: boolean;
}
