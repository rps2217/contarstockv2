
import { getSettings } from './settings';

class AudioService {
  private ctx: AudioContext | null = null;
  private synth: SpeechSynthesis | null = null;
  // SECURITY: Keep reference to prevent Garbage Collection from cutting audio short on Android/Chrome
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        this.synth = window.speechSynthesis;
    }
  }

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

  public speak(text: string) {
      const settings = getSettings();
      if (!settings.ttsEnabled || !this.synth) return;

      // Cancel previous utterance to avoid queue buildup
      this.synth.cancel();

      // Simple cleanup of product names for better speech
      const cleanText = text
        .toLowerCase()
        .replace(/beb\./g, 'bebida')
        .replace(/unid\./g, 'unidades')
        .replace(/\./g, ' punto ')
        .substring(0, 80); // Limit length

      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.1; // Slightly faster
      utterance.pitch = 1.0;
      utterance.lang = 'es-ES'; // Default Spanish

      // BINDING: Hold reference
      this.activeUtterance = utterance;

      // CLEANUP: Release reference when done
      utterance.onend = () => {
          this.activeUtterance = null;
      };
      utterance.onerror = (e) => {
          console.warn("TTS Error:", e);
          this.activeUtterance = null;
      };

      this.synth.speak(utterance);
  }

  public play(type: 'success' | 'error' | 'delete') {
    const settings = getSettings();
    
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
