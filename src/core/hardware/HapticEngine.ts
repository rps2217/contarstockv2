import { getSettings } from '../../services/settings';

export interface IHapticEngine {
  vibrateKeypad(): void;
  vibrateFeedback(type: 'success' | 'success_new' | 'error' | 'error_critical' | 'delete' | 'warning' | 'not_found' | 'increment' | 'scan'): void;
}

export class HapticEngine implements IHapticEngine {
  public vibrateKeypad(): void {
    const settings = getSettings();
    if (settings.captureSettings?.keypadVibration && navigator.vibrate) {
      navigator.vibrate(15);
    }
  }

  public vibrateFeedback(type: 'success' | 'success_new' | 'error' | 'error_critical' | 'delete' | 'warning' | 'not_found' | 'increment' | 'scan'): void {
    const settings = getSettings();
    if (!settings.hapticsEnabled || !navigator.vibrate) return;

    switch (type) {
      case 'error_critical':
        navigator.vibrate([200, 100, 200, 100, 300]);
        break;
      case 'error':
      case 'not_found':
        navigator.vibrate([100, 50, 100]);
        break;
      case 'warning':
        navigator.vibrate([50, 50, 50, 50]);
        break;
      case 'success_new':
        navigator.vibrate([30, 50, 30]);
        break;
      case 'success':
        navigator.vibrate(40);
        break;
      default:
        navigator.vibrate(20);
        break;
    }
  }
}

export const haptics = new HapticEngine();
