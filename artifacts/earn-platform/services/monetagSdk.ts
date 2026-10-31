import { api } from './api.ts';
import { MONETAG_DIRECT_LINKS } from '../data/defaultCatalog.ts';

declare global {
  interface Window {
    [key: string]: any;
    show_9537184?: () => Promise<any> | void;
  }
}

export class MonetagService {
  private static scriptLoaded = false;
  private static directLinkIndex = 0;

  public static loadScript(zoneId = '9537184', sdkTagUrl = '//libtl.com/sdk.js'): void {
    if (typeof window === 'undefined') return;
    if (this.scriptLoaded || window[`show_${zoneId}`]) return;

    try {
      const existing = document.querySelector(`script[data-zone="${zoneId}"]`);
      if (existing) {
        this.scriptLoaded = true;
        return;
      }
      const script = document.createElement('script');
      script.src = sdkTagUrl;
      script.dataset.zone = zoneId;
      script.dataset.sdk = `show_${zoneId}`;
      script.async = true;
      script.onload = () => {
        console.log(`[Monetag] SDK script loaded successfully for zone ${zoneId}`);
        this.scriptLoaded = true;
      };
      script.onerror = () => {
        console.warn(`[Monetag] Script load blocked by client or network`);
      };
      document.head.appendChild(script);
    } catch (e) {
      console.error('[Monetag] Failed to inject script:', e);
    }
  }

  /**
   * Opens one of the user's Monetag direct links in a new tab
   */
  public static openDirectLink(): string {
    const url = MONETAG_DIRECT_LINKS[this.directLinkIndex % MONETAG_DIRECT_LINKS.length];
    this.directLinkIndex++;
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('Failed to open Monetag direct link:', e);
    }
    return url;
  }

  /**
   * Triggers the Monetag SDK ad flow via show_9537184()
   * With fallback to publisher's direct link if blocked
   */
  public static async showRewardedAd(zoneId = '9537184'): Promise<boolean> {
    const fnName = `show_${zoneId}`;

    // 1. Check if Monetag SDK method is present
    if (typeof window[fnName] === 'function') {
      try {
        console.log(`[Monetag] Invoking SDK function ${fnName}`);
        const result = window[fnName]();
        if (result && typeof result.then === 'function') {
          await result;
        }
        return true;
      } catch (err) {
        console.warn('[Monetag] SDK function error, falling back:', err);
      }
    }

    // 2. Check window.show_rewarded
    if (typeof window.show_rewarded === 'function') {
      try {
        await window.show_rewarded();
        return true;
      } catch (err) {
        console.warn('[Monetag] show_rewarded error:', err);
      }
    }

    // 3. Fallback: If ad SDK could not pop up, trigger direct link to ensure ad click
    this.openDirectLink();

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 2000);
    });
  }

  public static async claimReward(): Promise<{ success: boolean; rewardAmount: number; message: string; user?: any }> {
    return api.claimMonetagReward();
  }
}
