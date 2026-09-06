import React, { useState } from 'react';
import {
  X,
  Sliders,
  BatteryCharging,
  Flame,
  Wifi,
  Volume2,
  Lock,
  Moon,
  Smartphone,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Cloud,
  Video,
  Clock,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { AppSettings, BandwidthMode, MotionSensitivity, ResolutionMode } from '../types';
import { speakSeniorVoice } from '../utils/soundAlerts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [pin, setPin] = useState(settings.encryptionPin);
  const [webhook, setWebhook] = useState(settings.smartPlugWebhookUrl);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateSettings({
      encryptionPin: pin,
      smartPlugWebhookUrl: webhook,
    });
    speakSeniorVoice('Settings saved successfully.');
    onClose();
  };

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="bg-slate-900 border-4 border-slate-700 rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-white">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-950 border-b-2 border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white">HGUARD SETTINGS</h2>
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-black border border-amber-500/40 uppercase">
                HGuard Premium+
              </span>
            </div>
            <p className="text-sm sm:text-base text-slate-300 font-medium mt-0.5">
              Configure 3-camera monitoring, Gemini AI detection, 30-day cloud storage, and battery protection
            </p>
          </div>
          <button
            id="close-settings-modal-btn"
            onClick={onClose}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-2xl transition border border-slate-600"
            aria-label="Close"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {/* SECTION 1: RESOLUTION & FULL HD VIDEO QUALITY */}
          <div className="bg-slate-950 p-5 rounded-2xl border-2 border-slate-800 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                <Video className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Streaming Video Resolution</h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  HGuard Premium Plus supports Full HD 1080p recording and live playback.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(['1080p', '720p', '360p', '240p'] as ResolutionMode[]).map((res) => (
                <button
                  key={res}
                  id={`settings-res-${res}`}
                  onClick={() => onUpdateSettings({ resolutionMode: res })}
                  className={`py-3 px-2 rounded-xl font-black text-sm uppercase border-2 flex flex-col items-center gap-1 transition ${
                    settings.resolutionMode === res
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{res}</span>
                  <span className="text-[10px] font-normal opacity-90">
                    {res === '1080p'
                      ? 'Full HD'
                      : res === '720p'
                      ? 'Standard HD'
                      : res === '360p'
                      ? 'Balanced'
                      : 'Low Bandwidth'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 2: GEMINI AI DETECTION & AI FRAME */}
          <div className="bg-slate-950 p-5 rounded-2xl border-2 border-slate-800 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-500/30 to-amber-600/20 text-amber-300 rounded-xl border border-amber-500/40">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Gemini Vision AI Features</h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Smart recognition categorizes motion into person, pet, vehicle, baby cry, or lingering.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                id="toggle-ai-detection-checkbox"
                type="checkbox"
                checked={settings.aiDetectionEnabled}
                onChange={(e) => onUpdateSettings({ aiDetectionEnabled: e.target.checked })}
                className="w-6 h-6 rounded accent-amber-500 cursor-pointer"
              />
              <span className="text-base sm:text-lg font-bold text-slate-200">
                Enable Gemini Vision AI semantic classification
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                id="toggle-ai-frame-boxes-checkbox"
                type="checkbox"
                checked={settings.aiFrameBoxesVisible}
                onChange={(e) => onUpdateSettings({ aiFrameBoxesVisible: e.target.checked })}
                className="w-6 h-6 rounded accent-amber-500 cursor-pointer"
              />
              <span className="text-base sm:text-lg font-bold text-slate-200">
                Draw AI Frame bounding boxes on detected subjects
              </span>
            </label>
          </div>

          {/* SECTION 3: 30-DAY CLOUD STORAGE VAULT & CLIPS */}
          <div className="bg-slate-950 p-5 rounded-2xl border-2 border-slate-800 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl">
                <Cloud className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">30-Day Cloud Storage Vault</h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Automatically sync event clips to your secure cloud account with 30-day retention.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                id="toggle-cloud-storage-checkbox"
                type="checkbox"
                checked={settings.cloudStorageEnabled}
                onChange={(e) => onUpdateSettings({ cloudStorageEnabled: e.target.checked })}
                className="w-6 h-6 rounded accent-sky-500 cursor-pointer"
              />
              <span className="text-base sm:text-lg font-bold text-slate-200">
                Automatic Cloud Backup (30-day retention timeline)
              </span>
            </label>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <span className="text-sm font-bold text-slate-300">Recorded Clip Length:</span>
              <div className="flex items-center gap-2">
                {[30, 120].map((dur) => (
                  <button
                    key={dur}
                    onClick={() => onUpdateSettings({ recordingClipDuration: dur as 30 | 120 })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      settings.recordingClipDuration === dur
                        ? 'bg-sky-500 text-slate-950 border-sky-400'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                  >
                    {dur === 30 ? '30 Seconds' : '120 Seconds (Extended)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 4: BATTERY 80% GUARD (OLD PHONE HEALTH) */}
          <div className="bg-slate-950 p-5 rounded-2xl border-2 border-slate-800 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                <BatteryCharging className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Battery 80% Health Limit</h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Old phone lithium batteries swell if left charging at 100%. We alert you at 80% to stop charging.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <span className="text-base font-bold">Stop Charging Alert at:</span>
              <span className="text-2xl font-black text-amber-400">80% Cap</span>
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                id="toggle-battery-alarm-checkbox"
                type="checkbox"
                checked={settings.batteryAlarmEnabled}
                onChange={(e) => onUpdateSettings({ batteryAlarmEnabled: e.target.checked })}
                className="w-6 h-6 rounded accent-amber-500 cursor-pointer"
              />
              <span className="text-base sm:text-lg font-bold text-slate-200">
                Play loud warning chime & speech when battery reaches 80%
              </span>
            </label>

            {/* Smart Plug Webhook URL */}
            <div className="flex flex-col gap-2 pt-2">
              <label htmlFor="smart-plug-webhook-input" className="text-sm font-bold text-slate-300">
                Smart Plug Webhook URL (Optional — auto-cuts AC power when 80% is reached):
              </label>
              <input
                id="smart-plug-webhook-input"
                type="url"
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
                placeholder="https://maker.ifttt.com/use/... or Home Assistant webhook"
                className="bg-slate-900 border border-slate-700 text-slate-200 p-3 rounded-xl text-sm focus:border-amber-400 outline-none"
              />
            </div>
          </div>

          {/* SECTION 5: MOTION DETECTION & CPU SAVINGS */}
          <div className="bg-slate-950 p-5 rounded-2xl border-2 border-slate-800 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl">
                <Sliders className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Motion Detection Sensitivity</h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Lower sensitivity processes fewer frames per second, keeping older phone processors cool and smooth.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(['low', 'medium', 'high'] as MotionSensitivity[]).map((level) => (
                <button
                  key={level}
                  id={`settings-motion-sens-${level}`}
                  onClick={() => onUpdateSettings({ motionSensitivity: level })}
                  className={`py-4 px-3 rounded-2xl font-black text-base uppercase border-2 flex flex-col items-center gap-1 transition ${
                    settings.motionSensitivity === level
                      ? 'bg-cyan-600 border-cyan-300 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>{level}</span>
                  <span className="text-xs font-normal opacity-80">
                    {level === 'low' ? 'Saves CPU' : level === 'medium' ? 'Standard' : 'High Alert'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 6: OVERHEAT PREVENTION & ECO-COOL */}
          <div className="bg-slate-950 p-5 rounded-2xl border-2 border-slate-800 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <Moon className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Overheat Prevention: Eco-Cool Screen</h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Display screens produce 70% of phone heat. Eco-Cool turns the screen black while keeping the camera running.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                id="toggle-eco-cool-checkbox"
                type="checkbox"
                checked={settings.ecoCoolScreenEnabled}
                onChange={(e) => onUpdateSettings({ ecoCoolScreenEnabled: e.target.checked })}
                className="w-6 h-6 rounded accent-emerald-500 cursor-pointer"
              />
              <span className="text-base sm:text-lg font-bold text-slate-200">
                Automatically turn screen black during surveillance
              </span>
            </label>
          </div>

          {/* SECTION 7: SENIOR VOICE & AUDIO */}
          <div className="bg-slate-950 p-5 rounded-2xl border-2 border-slate-800 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl">
                <Volume2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Senior Voice & Audio Assist</h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Reads status and alerts out loud with slow, clear speech for elderly users.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                id="toggle-senior-voice-checkbox"
                type="checkbox"
                checked={settings.seniorVoiceAlerts}
                onChange={(e) => onUpdateSettings({ seniorVoiceAlerts: e.target.checked })}
                className="w-6 h-6 rounded accent-purple-500 cursor-pointer"
              />
              <span className="text-base sm:text-lg font-bold text-slate-200">
                Spoken Voice Announcements for Motion & Battery
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                id="toggle-alarm-sound-checkbox"
                type="checkbox"
                checked={settings.alarmSoundEnabled}
                onChange={(e) => onUpdateSettings({ alarmSoundEnabled: e.target.checked })}
                className="w-6 h-6 rounded accent-purple-500 cursor-pointer"
              />
              <span className="text-base sm:text-lg font-bold text-slate-200">
                Sound Siren Alarm upon Motion Detection
              </span>
            </label>
          </div>

          {/* SECTION 8: ENCRYPTION PIN */}
          <div className="bg-slate-950 p-5 rounded-2xl border-2 border-slate-800 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Event Log Encryption PIN</h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  4-digit PIN used to encrypt snapshots with AES-256. (Default: 8888)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="settings-pin-input"
                type="password"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-32 bg-slate-900 border-2 border-slate-700 text-white font-black text-center text-2xl py-3 px-4 rounded-xl focus:border-amber-400 outline-none"
              />
              <span className="text-xs text-slate-400">
                Remember this PIN to decrypt event logs offline.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-950 border-t-2 border-slate-800 flex items-center justify-end gap-4">
          <button
            id="cancel-settings-btn"
            onClick={onClose}
            className="py-4 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-lg rounded-2xl transition"
          >
            CANCEL
          </button>
          <button
            id="save-settings-btn"
            onClick={handleSave}
            className="py-4 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl rounded-2xl shadow-lg border-2 border-emerald-400 transition"
          >
            SAVE SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
};
