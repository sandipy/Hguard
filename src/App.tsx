/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera,
  Eye,
  Shield,
  BatteryCharging,
  Flame,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Cloud,
  User,
  Crown,
  Lock,
  Video,
} from 'lucide-react';
import { AppMode, AppSettings, BatteryState, SecurityEvent, ThermalStatus, UserProfile } from './types';
import { SeniorTopNav } from './components/SeniorTopNav';
import { CameraView } from './components/CameraView';
import { MonitorView } from './components/MonitorView';
import { EventLogModal } from './components/EventLogModal';
import { SettingsModal } from './components/SettingsModal';
import { AccountModal } from './components/AccountModal';
import { CloudStorageModal } from './components/CloudStorageModal';
import { AIExplainerModal } from './components/AIExplainerModal';
import { BatteryService } from './utils/batteryService';
import { encryptData } from './utils/crypto';
import { speakSeniorVoice } from './utils/soundAlerts';

const DEFAULT_SETTINGS: AppSettings = {
  motionSensitivity: 'medium',
  detectionZone: 'full',
  motionCooldownSec: 5,
  aiDetectionEnabled: true,
  aiPersonDetection: true,
  aiPetDetection: true,
  aiVehicleDetection: true,
  aiLingeringDetection: true,
  aiBabyCryDetection: true,
  aiFrameBoxesVisible: true,
  continuousRecording: false,
  recordingClipDuration: 30,
  cloudStorageEnabled: true,
  showWatermark: true,
  showTimestamp: true,
  resolutionMode: '1080p',
  bandwidthMode: 'low',
  batteryHealthCap: 80,
  batteryAlarmEnabled: true,
  smartPlugWebhookUrl: '',
  ecoCoolScreenEnabled: true,
  ecoCoolDelaySec: 25,
  thermalThrottleFps: true,
  seniorVoiceAlerts: true,
  highContrast: true,
  largeFonts: true,
  alarmSoundEnabled: true,
  encryptionPin: '8888',
};

export default function App() {
  const [mode, setMode] = useState<AppMode>('select');
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('HGUARD_SETTINGS_V2');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('HGUARD_USER_PROFILE_V1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      email: 'senior.homeguard@gmail.com',
      name: 'Grandparent Home Guard',
      plan: 'Premium Plus',
      activeCamerasAllowed: 3,
      concurrentViewersAllowed: 1,
      cloudRetentionDays: 30,
      loggedIn: true,
      passPin: '8888',
      cloudSyncEnabled: true,
    };
  });

  const [battery, setBattery] = useState<BatteryState>({
    level: 78,
    charging: true,
    supported: false,
  });

  const [thermal, setThermal] = useState<ThermalStatus>('normal');
  const [events, setEvents] = useState<SecurityEvent[]>(() => {
    try {
      const saved = localStorage.getItem('HGUARD_ENCRYPTED_EVENTS_V1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [isEventsOpen, setIsEventsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isCloudStorageOpen, setIsCloudStorageOpen] = useState(false);
  const [isAIExplainerOpen, setIsAIExplainerOpen] = useState(false);

  // Initialize Battery Service
  useEffect(() => {
    const batteryService = BatteryService.getInstance();
    const unsub = batteryService.subscribe((state) => {
      setBattery(state);
    });
    return unsub;
  }, []);

  // Seed an initial encrypted event if none exists
  useEffect(() => {
    if (events.length === 0) {
      const seedEvent = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 300;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 400, 300);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(50, 50, 300, 200);
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText('Camera 1 (Front Door)', 70, 130);
            ctx.fillStyle = '#10b981';
            ctx.font = '16px sans-serif';
            ctx.fillText('Gemini AI: Person Detected (96%)', 70, 165);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '14px sans-serif';
            ctx.fillText('AES-256 Encrypted • Cloud Synced', 70, 195);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

            const encrypted = await encryptData(dataUrl, settings.encryptionPin);
            const initialEvt: SecurityEvent = {
              id: 'initial_demo_evt',
              cameraId: 'cam1',
              cameraName: 'Camera 1 (Front Door)',
              timestamp: Date.now() - 3600000,
              motionIntensity: 85,
              eventType: 'person',
              snapshotEncrypted: encrypted.ciphertext,
              iv: encrypted.iv,
              thermalState: 'normal',
              batteryLevel: 79,
              notes: 'Person detected near doorstep with 96% confidence',
              decryptedSnapshot: dataUrl,
              aiSummary: 'Person detected near doorstep with 96% confidence',
              aiConfidence: 96,
              isCloudSynced: true,
            };
            setEvents([initialEvt]);
          }
        } catch {
          // ignore
        }
      };
      seedEvent();
    }
  }, [events.length, settings.encryptionPin]);

  // Persist settings
  const handleUpdateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('HGUARD_SETTINGS_V2', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // Persist user profile
  const handleUpdateUser = useCallback((updatedUser: Partial<UserProfile>) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedUser };
      try {
        localStorage.setItem('HGUARD_USER_PROFILE_V1', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // Save new security event
  const handleNewSecurityEvent = useCallback((event: SecurityEvent) => {
    setEvents((prev) => {
      const updated = [event, ...prev].slice(0, 80);
      try {
        const storageSafe = updated.map(({ decryptedSnapshot, ...rest }) => rest);
        localStorage.setItem('HGUARD_ENCRYPTED_EVENTS_V1', JSON.stringify(storageSafe));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const handleClearEvents = useCallback(() => {
    setEvents([]);
    try {
      localStorage.removeItem('HGUARD_ENCRYPTED_EVENTS_V1');
    } catch {
      // ignore
    }
  }, []);

  const handleImportEvents = useCallback((imported: SecurityEvent[]) => {
    setEvents((prev) => {
      const combined = [...imported, ...prev].slice(0, 80);
      try {
        const storageSafe = combined.map(({ decryptedSnapshot, ...rest }) => rest);
        localStorage.setItem('HGUARD_ENCRYPTED_EVENTS_V1', JSON.stringify(storageSafe));
      } catch {
        // ignore
      }
      return combined;
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-black">
      {/* SENIOR TOP NAVIGATION */}
      <SeniorTopNav
        mode={mode}
        onSelectMode={(m) => {
          setMode(m);
          if (settings.seniorVoiceAlerts) {
            speakSeniorVoice(
              m === 'camera'
                ? 'Old Phone Camera mode active.'
                : m === 'viewer'
                ? 'Master Viewer Monitor active with 3 cameras.'
                : 'Role selector'
            );
          }
        }}
        battery={battery}
        thermal={thermal}
        unreadAlertsCount={events.length}
        user={user}
        onOpenEvents={() => setIsEventsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCloudStorage={() => setIsCloudStorageOpen(true)}
        onOpenAIExplainer={() => setIsAIExplainerOpen(true)}
        onOpenAccount={() => setIsAccountOpen(true)}
      />

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* MODE SELECTOR (ROLE CHOOSER) */}
        {mode === 'select' && (
          <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full py-4">
            {/* Senior-friendly Big Hero Introduction */}
            <div className="text-center flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-emerald-500/20 border border-amber-400/50 px-4 py-1.5 rounded-full text-amber-300 font-black text-sm tracking-wide uppercase">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>HGuard Premium Plus Enabled • 3 Cameras • 1 Viewer • Cloud 30D</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                WHAT ROLE FOR THIS DEVICE?
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 font-medium max-w-2xl">
                Choose how you want to use this phone or computer today:
              </p>
            </div>

            {/* TWO GIANT SELECTION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CARD 1: CAMERA (OLD PHONE) */}
              <button
                id="select-camera-role-btn"
                onClick={() => {
                  setMode('camera');
                  if (settings.seniorVoiceAlerts) {
                    speakSeniorVoice('Starting old phone camera mode.');
                  }
                }}
                className="group relative bg-slate-900 hover:bg-slate-800/90 active:bg-slate-800 border-4 border-emerald-500 rounded-3xl p-6 sm:p-8 text-left transition transform hover:-translate-y-1 shadow-2xl flex flex-col justify-between gap-6 cursor-pointer focus:ring-8 focus:ring-emerald-500/30"
              >
                <div className="flex flex-col gap-4">
                  <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition">
                    <Camera className="w-12 h-12" />
                  </div>
                  <div>
                    <span className="text-xs bg-emerald-900 text-emerald-200 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                      Transmitter
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                      OLD PHONE CAMERA
                    </h2>
                    <p className="text-lg text-emerald-300 font-bold mt-1">
                      (Place in room: Camera 1, 2, or 3)
                    </p>
                  </div>
                  <ul className="text-base text-slate-300 space-y-2 font-medium">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span><strong>Eco-Cool screen:</strong> Blackout display prevents heating.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span><strong>80% Battery Guard:</strong> Chimes & halts charging swelling.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span><strong>Gemini AI Vision:</strong> Edge motion + smart server detection.</span>
                    </li>
                  </ul>
                </div>

                <div className="w-full py-4 bg-emerald-600 group-hover:bg-emerald-500 text-white font-black text-xl rounded-2xl flex items-center justify-center gap-2 shadow transition">
                  <span>USE AS CAMERA</span>
                  <ChevronRight className="w-6 h-6" />
                </div>
              </button>

              {/* CARD 2: MASTER VIEWER (MY PHONE / TABLET / PC) */}
              <button
                id="select-viewer-role-btn"
                onClick={() => {
                  setMode('viewer');
                  if (settings.seniorVoiceAlerts) {
                    speakSeniorVoice('Opening master viewer with 3 cameras.');
                  }
                }}
                className="group relative bg-slate-900 hover:bg-slate-800/90 active:bg-slate-800 border-4 border-cyan-500 rounded-3xl p-6 sm:p-8 text-left transition transform hover:-translate-y-1 shadow-2xl flex flex-col justify-between gap-6 cursor-pointer focus:ring-8 focus:ring-cyan-500/30"
              >
                <div className="flex flex-col gap-4">
                  <div className="w-20 h-20 bg-cyan-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition">
                    <Eye className="w-12 h-12" />
                  </div>
                  <div>
                    <span className="text-xs bg-cyan-900 text-cyan-200 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                      Master Receiver
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                      MASTER VIEWER MONITOR
                    </h2>
                    <p className="text-lg text-cyan-300 font-bold mt-1">
                      (Watch 3 Cameras Simultaneously)
                    </p>
                  </div>
                  <ul className="text-base text-slate-300 space-y-2 font-medium">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                      <span><strong>Multi-Screen 3-Camera:</strong> Live split grid or single view.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                      <span><strong>4x Digital Zoom:</strong> Smooth zoom slider & pan inspection.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                      <span><strong>Siren & 2-Way Audio:</strong> Loud deterrent & intercom.</span>
                    </li>
                  </ul>
                </div>

                <div className="w-full py-4 bg-cyan-600 group-hover:bg-cyan-500 text-white font-black text-xl rounded-2xl flex items-center justify-center gap-2 shadow transition">
                  <span>WATCH ALL 3 CAMS</span>
                  <ChevronRight className="w-6 h-6" />
                </div>
              </button>
            </div>

            {/* QUICK FEATURE TILES (PREMIUM PLUS CAPABILITIES) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Tile 1: 30-Day Cloud Storage */}
              <button
                id="home-open-cloud-btn"
                onClick={() => setIsCloudStorageOpen(true)}
                className="p-5 bg-slate-900 border-2 border-slate-800 hover:border-sky-500/60 rounded-2xl text-left transition group shadow-lg flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl group-hover:scale-105 transition">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs bg-sky-950 text-sky-300 px-2 py-0.5 rounded font-black">
                    30-Day Vault
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-black text-white group-hover:text-sky-300 transition">
                    Cloud Storage & Timeline
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Unified timeline playback with 30-day recorded cloud retention.
                  </p>
                </div>
              </button>

              {/* Tile 2: Gemini AI Detection */}
              <button
                id="home-open-ai-explainer-btn"
                onClick={() => setIsAIExplainerOpen(true)}
                className="p-5 bg-slate-900 border-2 border-slate-800 hover:border-amber-500/60 rounded-2xl text-left transition group shadow-lg flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl group-hover:scale-105 transition">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <span className="text-xs bg-amber-950 text-amber-300 px-2 py-0.5 rounded font-black">
                    Gemini Vision
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-black text-white group-hover:text-amber-300 transition">
                    How AI Detection Works
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Person, pet, vehicle, baby cry, and lingering identification.
                  </p>
                </div>
              </button>

              {/* Tile 3: User Account & Premium Plus */}
              <button
                id="home-open-account-btn"
                onClick={() => setIsAccountOpen(true)}
                className="p-5 bg-slate-900 border-2 border-slate-800 hover:border-emerald-500/60 rounded-2xl text-left transition group shadow-lg flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl group-hover:scale-105 transition">
                    <User className="w-6 h-6" />
                  </div>
                  <span className="text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-black">
                    {user.loggedIn ? 'Logged In' : 'Sign In'}
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-black text-white group-hover:text-emerald-300 transition">
                    Account & Device Pairing
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage 3 paired cameras, 1 viewer limit, and AES PIN.
                  </p>
                </div>
              </button>
            </div>

            {/* Hardware Safety Information Note */}
            <div className="p-5 bg-slate-900 border-2 border-slate-800 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Flame className="w-8 h-8 text-amber-400 flex-shrink-0" />
                <p className="text-sm sm:text-base text-slate-300 font-medium">
                  <strong>Designed for older smartphones:</strong> Built-in thermal throttling, 80% battery charging cut-off, and low bandwidth streaming ensure old devices run 24/7 safely without swelling batteries or overheating.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE CAMERA VIEW (OLD PHONE) */}
        {mode === 'camera' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-2xl sm:text-3xl font-black text-white">CAMERA UNIT (OLD PHONE)</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="switch-to-viewer-btn"
                  onClick={() => setMode('viewer')}
                  className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-black text-sm rounded-xl border border-slate-700 transition"
                >
                  Switch to Viewer Mode
                </button>
                <button
                  id="back-to-select-btn"
                  onClick={() => setMode('select')}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition"
                >
                  Roles
                </button>
              </div>
            </div>

            <CameraView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onNewSecurityEvent={handleNewSecurityEvent}
              battery={battery}
              thermal={thermal}
              setBattery={setBattery}
              setThermal={setThermal}
            />
          </div>
        )}

        {/* ACTIVE MASTER VIEWER MONITOR (3 CAMERAS & 1 VIEWER) */}
        {mode === 'viewer' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 animate-pulse" />
                <h2 className="text-2xl sm:text-3xl font-black text-white">MASTER VIEWER MONITOR</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="switch-to-camera-btn"
                  onClick={() => setMode('camera')}
                  className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-black text-sm rounded-xl border border-slate-700 transition"
                >
                  Switch to Camera Mode
                </button>
                <button
                  id="back-to-select-viewer-btn"
                  onClick={() => setMode('select')}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition"
                >
                  Roles
                </button>
              </div>
            </div>

            <MonitorView
              settings={settings}
              onOpenEvents={() => setIsEventsOpen(true)}
              onOpenCloudStorage={() => setIsCloudStorageOpen(true)}
              onOpenAIExplainer={() => setIsAIExplainerOpen(true)}
              onNewSecurityEvent={handleNewSecurityEvent}
            />
          </div>
        )}
      </main>

      {/* ACCOUNT PROFILE & LOGIN MODAL */}
      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        user={user}
        onUpdateUser={handleUpdateUser}
      />

      {/* 30-DAY CLOUD STORAGE VAULT & TIMELINE MODAL */}
      <CloudStorageModal
        isOpen={isCloudStorageOpen}
        onClose={() => setIsCloudStorageOpen(false)}
        localEvents={events}
        encryptionPin={settings.encryptionPin}
      />

      {/* AI EXPLAINER & LIVE PLAYGROUND MODAL */}
      <AIExplainerModal
        isOpen={isAIExplainerOpen}
        onClose={() => setIsAIExplainerOpen(false)}
      />

      {/* ENCRYPTED EVENT LOG MODAL */}
      <EventLogModal
        isOpen={isEventsOpen}
        onClose={() => setIsEventsOpen(false)}
        events={events}
        onClearEvents={handleClearEvents}
        onImportEvents={handleImportEvents}
        currentPin={settings.encryptionPin}
      />

      {/* SETTINGS MODAL */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
