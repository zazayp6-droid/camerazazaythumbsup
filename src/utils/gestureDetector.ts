/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ============================================================================
 * GESTURE DETECTION ENGINE FOR MEDIAPIPE HANDS
 * ============================================================================
 * 
 * --- How MediaPipe Detects the Hand ---
 * MediaPipe uses a machine learning pipeline comprising two models:
 * 1. Palm Detector: Operates on the full image and computes an oriented bounding box around any hands.
 * 2. Hand Landmark Model: Crops the hand region and outputs 21 3D keypoints (x, y, z):
 *    - Landmark 0: Wrist
 *    - Landmark 1-4: Thumb (CMC, MCP, IP, TIP)
 *    - Landmark 5-8: Index Finger (MCP, PIP, DIP, TIP)
 *    - Landmark 9-12: Middle Finger (MCP, PIP, DIP, TIP)
 *    - Landmark 13-16: Ring Finger (MCP, PIP, DIP, TIP)
 *    - Landmark 17-20: Pinky Finger (MCP, PIP, DIP, TIP)
 * 
 * Coordinate System:
 * - x: Normalized horizontal coordinate in [0.0, 1.0] (0 = left, 1 = right)
 * - y: Normalized vertical coordinate in [0.0, 1.0] (0 = top, 1 = bottom)
 *      IMPORTANT: A lower 'y' value corresponds to a HIGHER position on the screen!
 * - z: Depth relative to the wrist.
 * 
 * --- How Thumbs-Up Detection Works ---
 * A thumbs up requires two distinct physical gestures simultaneously:
 * 1. The Thumb is extended upwards:
 *    - The Thumb Tip (4) is higher than the Thumb IP joint (3) -> (tip.y < ip.y)
 *    - The Thumb IP joint (3) is higher than the Thumb MCP joint (2) -> (ip.y < mcp.y)
 *    - The Thumb Tip is clearly above the wrist and the knuckles.
 * 
 * 2. The other 4 fingers (Index, Middle, Ring, Pinky) are curled/folded into a fist:
 *    - Each finger's tip is folded towards the palm/wrist.
 *    - In screen coordinates for an upright hand, tip.y > pip.y (tip is lower than the second knuckle)
 *      or the Euclidean distance from fingertip to wrist is noticeably shorter than when extended.
 * 
 * When both conditions are met, we register a valid 👍 Thumbs Up!
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

/**
 * Calculates Euclidean distance between two 2D/3D points.
 */
export function getDistance(p1: Landmark, p2: Landmark): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Evaluates whether a set of 21 hand landmarks represents a 👍 Thumbs-Up gesture.
 * 
 * @param landmarks Array of 21 landmarks provided by MediaPipe Hands
 * @returns boolean true if thumbs-up gesture is recognized
 */
export function isThumbsUpGesture(landmarks: Landmark[]): { isThumbsUp: boolean; reason: string } {
  if (!landmarks || landmarks.length < 21) {
    return { isThumbsUp: false, reason: 'Incomplete hand landmarks' };
  }

  // Key landmark aliases for readability:
  const wrist = landmarks[0];

  const thumbCmc = landmarks[1];
  const thumbMcp = landmarks[2];
  const thumbIp = landmarks[3];
  const thumbTip = landmarks[4];

  const indexMcp = landmarks[5];
  const indexPip = landmarks[6];
  const indexDip = landmarks[7];
  const indexTip = landmarks[8];

  const middleMcp = landmarks[9];
  const middlePip = landmarks[10];
  const middleTip = landmarks[12];

  const ringMcp = landmarks[13];
  const ringPip = landmarks[14];
  const ringTip = landmarks[16];

  const pinkyMcp = landmarks[17];
  const pinkyPip = landmarks[18];
  const pinkyTip = landmarks[20];

  // -------------------------------------------------------------
  // Step 1: Verify Thumb is extended and pointing UP
  // In screen coordinates: lower y means higher up!
  // -------------------------------------------------------------
  const thumbPointingUp = thumbTip.y < thumbIp.y && thumbIp.y < thumbMcp.y;
  
  // Thumb tip should also be distinctly higher than the index knuckle (MCP)
  const thumbHigherThanKnuckles = thumbTip.y < indexMcp.y - 0.04;

  // Thumb tip should be higher than the wrist
  const thumbAboveWrist = thumbTip.y < wrist.y - 0.12;

  // Thumb vertical length should be significant (not curled)
  const thumbSpan = thumbMcp.y - thumbTip.y;
  const thumbExtended = thumbSpan > 0.08;

  if (!thumbPointingUp || !thumbHigherThanKnuckles || !thumbAboveWrist || !thumbExtended) {
    return { isThumbsUp: false, reason: 'Thumb not extended upright' };
  }

  // -------------------------------------------------------------
  // Step 2: Verify the other 4 fingers are folded / curled (fist)
  // For each finger, we check if the tip is folded inward.
  // Method A: Tip is lower than PIP (second joint), i.e., tip.y > pip.y
  // Method B: Tip distance to wrist is close to MCP distance to wrist
  // -------------------------------------------------------------
  
  const isIndexFolded = 
    indexTip.y > indexPip.y || 
    getDistance(indexTip, wrist) < getDistance(indexPip, wrist) * 1.15;

  const isMiddleFolded = 
    middleTip.y > middlePip.y || 
    getDistance(middleTip, wrist) < getDistance(middlePip, wrist) * 1.15;

  const isRingFolded = 
    ringTip.y > ringPip.y || 
    getDistance(ringTip, wrist) < getDistance(ringPip, wrist) * 1.15;

  const isPinkyFolded = 
    pinkyTip.y > pinkyPip.y || 
    getDistance(pinkyTip, wrist) < getDistance(pinkyPip, wrist) * 1.15;

  // Count how many fingers are curled
  const foldedFingersCount = 
    (isIndexFolded ? 1 : 0) +
    (isMiddleFolded ? 1 : 0) +
    (isRingFolded ? 1 : 0) +
    (isPinkyFolded ? 1 : 0);

  // Index, middle, and ring should firmly be curled.
  // We require at least 3 out of 4 fingers to be folded (allowing slight pinky variation)
  // AND definitely not open palm (where all 4 are open).
  const fingersCurled = foldedFingersCount >= 3 && isIndexFolded && isMiddleFolded;

  if (!fingersCurled) {
    return { isThumbsUp: false, reason: 'Fingers are not curled into a fist' };
  }

  // Ensure index and middle tips are not extended upwards (avoid peace sign or open palm)
  if (indexTip.y < indexMcp.y || middleTip.y < middleMcp.y) {
    return { isThumbsUp: false, reason: 'Fingers extended upright' };
  }

  return { isThumbsUp: true, reason: 'Thumbs up detected!' };
}
