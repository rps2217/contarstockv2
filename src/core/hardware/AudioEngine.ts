import { getSettings } from '../../services/settings';

export type SoundType = 'success' | 'success_new' | 'error' | 'error_critical' | 'delete' | 'increment' | 'scan' | 'not_found' | 'warning';

export interface IAudioEngine {
  speak(text: string): void;
  playTone(type: SoundType): void;
}

export class AudioEngine implements IAudioEngine {
  private ctx: AudioContext | null = null;
  private synth: SpeechSynthesis | null = null;

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

  public speak(text: string): void {
    const settings = getSettings();
    if (!settings.ttsEnabled || !this.synth) return;
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text.substring(0, 60));
    utterance.rate = 1.3;
    utterance.pitch = 1.0;
    utterance.lang = 'es-ES';
    this.synth.speak(utterance);
  }

  public playTone(type: SoundType): void {
    const settings = getSettings();
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
        case 'scan':
        case 'success': 
          osc.type = 'square';
          osc.frequency.setValueAtTime(1400, now);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        case 'success_new':
          osc.type = 'square';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.setValueAtTime(1600, now + 0.1);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.setValueAtTime(0, now + 0.08);
          gain.gain.setValueAtTime(0.15, now + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        case 'increment':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        case 'delete':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(500, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        case 'error':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.linearRampToValueAtTime(80, now + 0.3);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;
        case 'error_critical':
          osc.type = 'square';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.setValueAtTime(600, now + 0.1);
          osc.frequency.setValueAtTime(400, now + 0.2);
          osc.frequency.setValueAtTime(600, now + 0.3);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
          break;
        case 'not_found':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        case 'warning':
          osc.type = 'square';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.setValueAtTime(1200, now + 0.1);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.setValueAtTime(0, now + 0.08);
          gain.gain.setValueAtTime(0.15, now + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
      }
    } catch (e) {
      console.warn("Audio error", e);
    }
  }
}

export const audio = new AudioEngine();
