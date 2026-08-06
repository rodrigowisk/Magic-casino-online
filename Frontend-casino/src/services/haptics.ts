import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const hapticsService = {
  isHapticsEnabled(): boolean {
    const settingsStr = localStorage.getItem('magic_global_settings');
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      return settings.haptics !== false;
    }
    return true;
  },

  async lightImpact() {
    if (!this.isHapticsEnabled()) return;
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if ('vibrate' in navigator) {
        navigator.vibrate(30); // 📱 Fallback garantido para Android Web
      }
    } catch (e) {}
  },

  async mediumImpact() {
    if (!this.isHapticsEnabled()) return;
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if ('vibrate' in navigator) {
        navigator.vibrate([80, 30, 80]); // 📱 BZZZ BZZZ!
      }
    } catch (e) {}
  },

  async heavyImpact() {
    if (!this.isHapticsEnabled()) return;
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if ('vibrate' in navigator) {
        navigator.vibrate([150, 50, 150]); 
      }
    } catch (e) {}
  }
};