/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Synthesized audio sound effects using the Web Audio API.
 * This avoids requiring external audio files and works offline reliably.
 */

class SoundController {
  private audioCtx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Plays a realistic dual-click mechanical camera shutter sound.
   */
  public playShutter(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Part 1: Quick high-frequency blade snap
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(800, now);
      osc1.frequency.exponentialRampToValueAtTime(80, now + 0.045);

      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.05);

      // Part 2: Mechanical mirror click slightly delayed
      setTimeout(() => {
        if (!this.audioCtx) return;
        const now2 = this.audioCtx.currentTime;
        const osc2 = this.audioCtx.createOscillator();
        const gain2 = this.audioCtx.createGain();

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(450, now2);
        osc2.frequency.exponentialRampToValueAtTime(60, now2 + 0.06);

        gain2.gain.setValueAtTime(0.35, now2);
        gain2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.06);

        osc2.connect(gain2);
        gain2.connect(this.audioCtx.destination);
        osc2.start(now2);
        osc2.stop(now2 + 0.07);
      }, 55);
    } catch {
      // Audio playback failed or blocked by autoplay policy
    }
  }

  /**
   * Plays a pleasant chime when thumbs up is detected.
   */
  public playThumbsUpChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Audio playback failed
    }
  }
}

export const soundFx = new SoundController();
