import { BatteryState } from '../types';

interface BatteryManagerPolyfill extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  onchargingchange: ((this: BatteryManagerPolyfill, ev: Event) => void) | null;
  onlevelchange: ((this: BatteryManagerPolyfill, ev: Event) => void) | null;
}

export class BatteryService {
  private static instance: BatteryService;
  private batteryManager: BatteryManagerPolyfill | null = null;
  private state: BatteryState = {
    level: 75,
    charging: true,
    supported: false,
  };
  private listeners: ((state: BatteryState) => void)[] = [];
  private lastAlerted80At: number = 0;

  private constructor() {
    this.init();
  }

  public static getInstance(): BatteryService {
    if (!BatteryService.instance) {
      BatteryService.instance = new BatteryService();
    }
    return BatteryService.instance;
  }

  private async init() {
    try {
      const nav = navigator as unknown as { getBattery?: () => Promise<BatteryManagerPolyfill> };
      if (nav.getBattery) {
        this.batteryManager = await nav.getBattery();
        this.updateFromManager();
        this.state.supported = true;

        this.batteryManager.addEventListener('chargingchange', () => {
          this.updateFromManager();
        });
        this.batteryManager.addEventListener('levelchange', () => {
          this.updateFromManager();
        });
      } else {
        // Fallback simulation mode
        this.state.supported = false;
        this.state.level = 78;
        this.state.charging = true;
      }
    } catch {
      this.state.supported = false;
    }
    this.notify();
  }

  private updateFromManager() {
    if (!this.batteryManager) return;
    this.state = {
      level: Math.round(this.batteryManager.level * 100),
      charging: this.batteryManager.charging,
      chargingTime: this.batteryManager.chargingTime,
      dischargingTime: this.batteryManager.dischargingTime,
      supported: true,
    };
    this.notify();
  }

  public subscribe(cb: (state: BatteryState) => void): () => void {
    this.listeners.push(cb);
    cb(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  public getState(): BatteryState {
    return { ...this.state };
  }

  // Allow manual override for demonstration and old devices lacking Battery API
  public setManualState(level: number, charging: boolean) {
    this.state = {
      ...this.state,
      level: Math.max(0, Math.min(100, level)),
      charging,
    };
    this.notify();
  }

  /**
   * Check if battery reached 80% ceiling while charging
   */
  public checkThreshold80(cap: number = 80): { triggerAlert: boolean; message: string } {
    const isOverCap = this.state.level >= cap;
    const isCharging = this.state.charging;

    if (isOverCap && isCharging) {
      const now = Date.now();
      // Cooldown 20 seconds between alerts
      if (now - this.lastAlerted80At > 20000) {
        this.lastAlerted80At = now;
        return {
          triggerAlert: true,
          message: `Battery reached ${this.state.level}%. Unplug charger now to protect battery health!`,
        };
      }
    }
    return { triggerAlert: false, message: '' };
  }

  /**
   * Trigger optional Smart Plug webhook to cut AC power at 80%
   */
  public async triggerSmartPlug(webhookUrl: string, action: 'off' | 'on'): Promise<boolean> {
    if (!webhookUrl || !webhookUrl.startsWith('http')) return false;
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ power: action, timestamp: Date.now(), reason: 'battery_80_guard' }),
        mode: 'no-cors',
      });
      return true;
    } catch (e) {
      console.warn('Smart plug webhook failed:', e);
      return false;
    }
  }
}
