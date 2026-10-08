/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ============================================================================
 * CAMERA VIEW & GESTURE AUTO-CAPTURE ENGINE
 * ============================================================================
 * 
 * --- How Camera Access Works ---
 * 1. navigator.mediaDevices.getUserMedia():
 *    Requests user permission for live video feed. We strictly request
 *    `{ video: { facingMode }, audio: false }` to NEVER ask for microphone access.
 * 2. Mobile Compatibility:
 *    The <video> element requires `playsinline`, `muted`, and `autoplay` so it
 *    runs inline inside iOS Safari and Android Chrome without full-screening.
 * 3. Graceful Denial Handling:
 *    If the user denies permission, DOMException (NotAllowedError) is caught and
 *    displays a polite instruction prompt.
 * 
 * --- How MediaPipe Detects the Hand ---
 * 1. MediaPipe Hands analyzes each frame and computes 21 3D landmarks for any hand.
 * 2. We pass the landmarks to `isThumbsUpGesture(landmarks)` in `gestureDetector.ts`.
 * 
 * --- How Auto-Capture Works (Edge Detection & Cooldown) ---
 * 1. Continuous holding of thumbs-up does NOT take endless pictures.
 * 2. We track state: `wasThumbsUpRef`. Only when `!wasThumbsUp && isThumbsUpNow`
 *    does a capture event fire (Rising Edge Trigger).
 * 3. After capture, a 2-second cooldown begins to give the user time to relax.
 * 
 * --- How Photos Are Captured ---
 * An HTML5 <canvas> is instantiated at native camera resolution (e.g. 1280x720).
 * If mirrored selfie mode is active, the canvas applies `ctx.scale(-1, 1)`
 * so the saved photo matches the user's mirror view, then serializes to JPEG base64.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Camera, 
  CameraOff, 
  Video, 
  Volume2, 
  VolumeX, 
  FlipHorizontal, 
  SwitchCamera, 
  Zap, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  Sparkles,
  Layers
} from 'lucide-react';
import { CapturedPhoto, CameraState } from '../types';
import { isThumbsUpGesture, Landmark } from '../utils/gestureDetector';
import { soundFx } from '../utils/audio';

interface CameraViewProps {
  onPhotoCaptured: (photo: CapturedPhoto) => void;
  maxLimitReached: boolean;
}

export const CameraView: React.FC<CameraViewProps> = ({
  onPhotoCaptured,
  maxLimitReached,
}) => {
  // DOM element references
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera & stream state
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Gesture state
  const [gestureStatus, setGestureStatus] = useState<string>('Show 👍 to capture');
  const [isThumbsUpDetected, setIsThumbsUpDetected] = useState<boolean>(false);
  const [isCooldown, setIsCooldown] = useState<boolean>(false);
  const [cooldownPercent, setCooldownPercent] = useState<number>(0);

  // Capture flash visual feedback
  const [showCapturedFlash, setShowCapturedFlash] = useState<boolean>(false);

  // Internal refs to handle camera loop & avoid stale closures
  const streamRef = useRef<MediaStream | null>(null);
  const mediaPipeHandsRef = useRef<any>(null);
  const mediaPipeCameraRef = useRef<any>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Gesture transition edge tracker & cooldown controller
  const wasThumbsUpRef = useRef<boolean>(false);
  const isCooldownRef = useRef<boolean>(false);
  const isCapturingRef = useRef<boolean>(false);

  // Keep soundFx in sync with toggle
  useEffect(() => {
    soundFx.enabled = soundEnabled;
  }, [soundEnabled]);

  /**
   * Captures a still snapshot from the live video stream.
   */
  const captureSnapshot = useCallback((isAuto: boolean = false) => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    if (maxLimitReached) {
      setErrorMessage('Storage limit reached (30/30). Please delete some photos first.');
      return;
    }

    try {
      // Create offscreen canvas for snapshot
      const captureCanvas = document.createElement('canvas');
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      captureCanvas.width = width;
      captureCanvas.height = height;

      const ctx = captureCanvas.getContext('2d');
      if (!ctx) return;

      // Handle mirroring (selfie flip)
      if (isMirrored) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, width, height);

      // Compress to high-efficiency JPEG data URL (~80% quality)
      const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.82);

      // Format current timestamp
      const now = new Date();
      const dateFormatted = now.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const photo: CapturedPhoto = {
        id: (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        image: dataUrl,
        date: dateFormatted,
        timestamp: Date.now(),
      };

      // Trigger shutter audio
      soundFx.playShutter();

      // Trigger flash animation
      setShowCapturedFlash(true);
      setTimeout(() => setShowCapturedFlash(false), 500);

      // Pass photo up to parent for LocalStorage persistence
      onPhotoCaptured(photo);
    } catch (err) {
      console.error('Failed to capture snapshot:', err);
    }
  }, [isMirrored, maxLimitReached, onPhotoCaptured]);

  /**
   * Starts a 2-second cooldown period after an auto-capture.
   */
  const triggerCooldown = useCallback(() => {
    isCooldownRef.current = true;
    setIsCooldown(true);
    setCooldownPercent(100);

    const cooldownDuration = 2000; // 2 seconds cooldown
    const intervalStep = 50;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += intervalStep;
      const remainingPercent = Math.max(0, 100 - (elapsed / cooldownDuration) * 100);
      setCooldownPercent(remainingPercent);

      if (elapsed >= cooldownDuration) {
        clearInterval(timer);
        isCooldownRef.current = false;
        setIsCooldown(false);
        setCooldownPercent(0);
      }
    }, intervalStep);
  }, []);

  /**
   * Callback invoked whenever MediaPipe Hands analyzes a video frame.
   */
  const onHandResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas display resolution with video intrinsic resolution
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    // Clear previous landmark drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let thumbsUpInThisFrame = false;

    // Check if hands were detected
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (const landmarks of results.multiHandLandmarks) {
        // Run our thumbs-up classifier
        const evaluation = isThumbsUpGesture(landmarks as Landmark[]);
        if (evaluation.isThumbsUp) {
          thumbsUpInThisFrame = true;
        }

        // Draw visual landmarks on canvas if wireframe display is enabled
        if (showLandmarks && typeof window !== 'undefined') {
          // If thumbs up detected, draw with emerald glow; otherwise cyan/violet
          const strokeColor = evaluation.isThumbsUp ? '#10b981' : '#a855f7';
          const fillColor = evaluation.isThumbsUp ? '#34d399' : '#38bdf8';

          if ((window as any).drawConnectors && (window as any).HAND_CONNECTIONS) {
            (window as any).drawConnectors(ctx, landmarks, (window as any).HAND_CONNECTIONS, {
              color: strokeColor,
              lineWidth: 3,
            });
          }

          if ((window as any).drawLandmarks) {
            (window as any).drawLandmarks(ctx, landmarks, {
              color: fillColor,
              lineWidth: 1,
              radius: 4,
            });
          }

          // Special highlight over thumb tip (Landmark 4)
          const thumbTip = landmarks[4];
          if (thumbTip) {
            ctx.beginPath();
            ctx.arc(thumbTip.x * canvas.width, thumbTip.y * canvas.height, 9, 0, 2 * Math.PI);
            ctx.fillStyle = evaluation.isThumbsUp ? '#fbbf24' : '#60a5fa';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }
    }

    // Update gesture state display
    if (thumbsUpInThisFrame) {
      setIsThumbsUpDetected(true);
      setGestureStatus('👍 THUMBS UP DETECTED!');

      // EDGE TRIGGER CHECK:
      // Capture only when transitioning from: No thumbs up -> Thumbs up
      // and only if cooldown is not active!
      if (!wasThumbsUpRef.current && !isCooldownRef.current && !isCapturingRef.current) {
        isCapturingRef.current = true;
        soundFx.playThumbsUpChime();
        captureSnapshot(true);
        triggerCooldown();
        setTimeout(() => {
          isCapturingRef.current = false;
        }, 300);
      }
    } else {
      setIsThumbsUpDetected(false);
      setGestureStatus('Show 👍 to capture');
    }

    // Record previous state for edge detection
    wasThumbsUpRef.current = thumbsUpInThisFrame;
  }, [captureSnapshot, showLandmarks, triggerCooldown]);

  /**
   * Initializes MediaPipe Hands instance.
   */
  const initMediaPipeHands = useCallback(async () => {
    if (typeof window === 'undefined' || !(window as any).Hands) {
      console.warn('MediaPipe Hands script not ready yet.');
      return null;
    }

    try {
      const hands = new (window as any).Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.65,
      });

      hands.onResults(onHandResults);
      mediaPipeHandsRef.current = hands;
      return hands;
    } catch (err) {
      console.error('Error initializing MediaPipe Hands:', err);
      return null;
    }
  }, [onHandResults]);

  /**
   * Starts the camera feed and binds it to MediaPipe.
   */
  const startCamera = async () => {
    setErrorMessage(null);
    setCameraState('requesting');

    // Make sure previous stream is stopped
    stopCamera();

    try {
      // 1. Request video stream (audio strictly false)
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false, // Security: Never request mic
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (!videoRef.current) {
        setCameraState('error');
        return;
      }

      videoRef.current.srcObject = stream;

      // Play video directly without hanging on metadata event
      try {
        await videoRef.current.play();
      } catch (playErr) {
        console.warn('Direct video play call interrupted, will play on metadata:', playErr);
      }

      setCameraState('running');

      // 2. Initialize MediaPipe Hands if not already created
      let hands = mediaPipeHandsRef.current;
      if (!hands) {
        hands = await initMediaPipeHands();
      }

      // 3. Process video frames smoothly using requestAnimationFrame
      // We directly feed the video frames to MediaPipe Hands
      let isProcessing = false;
      const processLoop = async () => {
        if (!streamRef.current) return; // Stopped

        const videoEl = videoRef.current;
        if (videoEl && videoEl.readyState >= 2 && mediaPipeHandsRef.current && !isProcessing) {
          isProcessing = true;
          try {
            await mediaPipeHandsRef.current.send({ image: videoEl });
          } catch (sendErr) {
            // Ignore transient frame send errors during resolution changes
          } finally {
            isProcessing = false;
          }
        }

        if (streamRef.current) {
          animFrameIdRef.current = requestAnimationFrame(processLoop);
        }
      };

      animFrameIdRef.current = requestAnimationFrame(processLoop);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraState('error');

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access was denied. Please allow camera permission and try again.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera device detected on this system.');
      } else {
        setErrorMessage(err.message || 'Failed to start camera. Please check your browser permissions.');
      }
    }
  };

  /**
   * Stops the camera and clears tracks.
   */
  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (mediaPipeCameraRef.current) {
      try {
        mediaPipeCameraRef.current.stop();
      } catch {
        // ignore
      }
      mediaPipeCameraRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Clear overlay canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    setCameraState('idle');
    setIsThumbsUpDetected(false);
    setGestureStatus('Show 👍 to capture');
    wasThumbsUpRef.current = false;
  };

  // Flip facing mode (front / rear camera on mobile)
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    // If user flips to environment (rear camera), disable mirror by default
    setIsMirrored(nextMode === 'user');
    if (cameraState === 'running') {
      setTimeout(() => startCamera(), 100);
    }
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="glass-panel-glow rounded-3xl p-4 sm:p-6 lg:p-8 space-y-6 relative overflow-hidden">
      {/* Top Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        
        {/* Left: Camera State & Gesture State Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Camera Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-semibold">
            <span className="text-slate-400">Camera:</span>
            {cameraState === 'running' ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold">● Running</span>
              </span>
            ) : cameraState === 'requesting' ? (
              <span className="text-amber-400">Connecting...</span>
            ) : (
              <span className="text-slate-400">● Stopped</span>
            )}
          </div>

          {/* Gesture Detection Badge */}
          <div 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 border ${
              isThumbsUpDetected 
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-lg shadow-emerald-500/20 detected-glow' 
                : 'bg-slate-900/90 text-slate-300 border-slate-700/80'
            }`}
          >
            <span className="text-slate-400 font-normal">Gesture:</span>
            <span>{gestureStatus}</span>
          </div>

          {/* Cooldown progress indicator */}
          {isCooldown && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-[11px] text-indigo-300 animate-pulse">
              <span>⏱️ Cooldown (2s)</span>
              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-400 transition-all duration-75"
                  style={{ width: `${cooldownPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Camera Accessory Controls (Sound, Mirror, Wireframe, Camera Switch) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
            }`}
            title={soundEnabled ? 'Mute Shutter Sound' : 'Unmute Shutter Sound'}
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Mirror / Flip Preview Toggle */}
          <button
            onClick={() => setIsMirrored(!isMirrored)}
            className={`p-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              isMirrored
                ? 'bg-slate-800/80 hover:bg-slate-700 text-purple-300 border-purple-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
            }`}
            title="Mirror / Flip Selfie Feed"
            aria-label="Toggle Mirror View"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>

          {/* Hand Skeleton Overlay Toggle */}
          <button
            onClick={() => setShowLandmarks(!showLandmarks)}
            className={`p-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              showLandmarks
                ? 'bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
            }`}
            title={showLandmarks ? 'Hide Hand Skeleton Overlay' : 'Show Hand Skeleton Overlay'}
            aria-label="Toggle Skeleton Overlay"
          >
            {showLandmarks ? <Layers className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Mobile Camera Switcher (Front/Back) */}
          <button
            onClick={toggleFacingMode}
            className="p-2 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title={`Switch to ${facingMode === 'user' ? 'Back' : 'Front'} Camera`}
            aria-label="Switch Camera Facing"
          >
            <SwitchCamera className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      </div>

      {/* Main Viewfinder Frame */}
      <div className="relative w-full aspect-16/10 sm:aspect-16/9 bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
        
        {/* Live Camera Video (playsinline for mobile compatibility) */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover transition-transform duration-200 ${
            isMirrored ? 'scale-x-[-1]' : ''
          } ${cameraState === 'running' ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* MediaPipe Hand Landmarks Overlay Canvas */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-200 ${
            isMirrored ? 'scale-x-[-1]' : ''
          } ${cameraState === 'running' ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Viewfinder HUD Target Reticle (Futuristic Photography Theme) */}
        {cameraState === 'running' && (
          <div className="absolute inset-4 pointer-events-none border border-white/10 rounded-2xl">
            {/* Viewfinder Corners */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400/80 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400/80 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400/80 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400/80 rounded-br-lg" />

            {/* Central Target Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none opacity-40">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/60 -translate-y-1/2" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/60 -translate-x-1/2" />
            </div>

            {/* Gesture Prompt Watermark */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs sm:text-sm font-medium text-slate-200 flex items-center gap-2 shadow-lg">
              <span className="text-base">👍</span>
              <span>Pose with thumbs up to snap</span>
            </div>
          </div>
        )}

        {/* Camera Inactive State Graphic */}
        {cameraState !== 'running' && (
          <div className="text-center p-6 space-y-4 max-w-md mx-auto z-10">
            <div className="w-20 h-20 rounded-3xl bg-slate-900/90 border border-purple-500/30 flex items-center justify-center mx-auto shadow-2xl text-purple-400">
              {cameraState === 'requesting' ? (
                <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-10 h-10" />
              )}
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                {cameraState === 'requesting' ? 'Requesting Camera Access...' : 'Camera is Stopped'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {cameraState === 'requesting' 
                  ? 'Please click "Allow" in your browser prompt to activate your camera.' 
                  : 'Start camera to activate real-time MediaPipe thumbs-up detection.'}
              </p>
            </div>

            {cameraState !== 'requesting' && (
              <button
                onClick={startCamera}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:via-purple-700 hover:to-pink-600 text-white font-bold text-sm shadow-xl shadow-purple-900/40 hover:shadow-purple-900/60 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Video className="w-4 h-4" />
                Start Camera
              </button>
            )}
          </div>
        )}

        {/* Camera Permission Error Notice */}
        {errorMessage && (
          <div className="absolute bottom-4 left-4 right-4 z-20 p-4 rounded-2xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs sm:text-sm flex items-start gap-3 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-bottom-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <span className="font-bold text-rose-100 block">Camera Notice</span>
              <p>{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-300 hover:text-white p-1 text-xs underline font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* PHOTO CAPTURED FLASH & CELEBRATION OVERLAY */}
        {showCapturedFlash && (
          <div className="absolute inset-0 z-30 pointer-events-none animate-shutter-flash flex items-center justify-center">
            <div className="px-6 py-3 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 text-white font-black text-xl sm:text-2xl flex items-center gap-3 shadow-2xl scale-110 transform transition-transform">
              <span className="text-3xl">📸</span>
              <span className="tracking-wide bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400 bg-clip-text text-transparent">
                Captured!
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Main Action Buttons */}
      <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          {cameraState === 'running' ? (
            <button
              onClick={stopCamera}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <CameraOff className="w-4 h-4 text-rose-400" />
              Stop Camera
            </button>
          ) : (
            <button
              onClick={startCamera}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-purple-900/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Video className="w-4 h-4" />
              Start Camera
            </button>
          )}

          {/* Manual Capture Button */}
          <button
            onClick={() => captureSnapshot(false)}
            disabled={cameraState !== 'running' || maxLimitReached}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              cameraState === 'running' && !maxLimitReached
                ? 'bg-purple-600/80 hover:bg-purple-600 active:scale-95 text-white border border-purple-400/40 shadow-lg shadow-purple-900/30'
                : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
            title="Take manual picture without gesture"
          >
            <Camera className="w-4 h-4" />
            Manual Capture
          </button>
        </div>

        {/* Live Tips Badge */}
        <div className="text-xs text-slate-400 flex items-center gap-2 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Keep your hand steady within camera view</span>
        </div>
      </div>
    </div>
  );
};
