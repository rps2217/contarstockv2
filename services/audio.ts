
import * as storage from './storage';

class AudioService {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtor) {
        this.ctx = new AudioCtor();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(console.error);
    }
    return this.ctx;
  }

  public play(type: 'success' | 'error' | 'delete') {
    const settings = storage.getSettings();
    
    // Haptics
    if (settings.hapticsEnabled && navigator.vibrate) {
        if (type === 'error') navigator.vibrate([50, 50, 50]);
        else navigator.vibrate(50);
    }

    // Audio check
    if (!settings.soundEnabled) return;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.connect(gain);
      gain.connect(ctx.destination);

      switch (type) {
        case 'success':
          osc.frequency.setValueAtTime(1200, now);
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        case 'delete':
          osc.frequency.setValueAtTime(600, now);
          osc.type = 'square';
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        case 'error':
          osc.frequency.setValueAtTime(150, now);
          osc.type = 'sawtooth';
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;
      }
    } catch (e) {
      console.warn("Audio playback error", e);
    }
  }
}

export const SoundFX = new AudioService();
