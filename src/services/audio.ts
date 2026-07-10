import { audio, SoundType } from '../core/hardware/AudioEngine';
import { haptics } from '../core/hardware/HapticEngine';

class SharedAudioFacade {
  public speak(text: string) {
    audio.speak(text);
  }

  public vibrateKeypad() {
    haptics.vibrateKeypad();
  }

  public play(type: SoundType) {
    haptics.vibrateFeedback(type);
    audio.playTone(type);
  }
}

export const SoundFX = new SharedAudioFacade();
