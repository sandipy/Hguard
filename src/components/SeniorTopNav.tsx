import React from 'react';
import {
  Shield,
  Battery,
  BatteryCharging,
  Flame,
  Settings,
  FileText,
  Moon,
  Cloud,
  Sparkles,
  User,
  Crown,
} from 'lucide-react';
import { AppMode, BatteryState, ThermalStatus, UserProfile } from '../types';

interface SeniorTopNavProps {
  mode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  battery: BatteryState;
  thermal: ThermalStatus;
  unreadAlertsCount: number;
  user: UserProfile;
  onOpenEvents: () => void;
  onOpenSettings: () => void;
  onOpenCloudStorage: () => void;
  onOpenAIExplainer: () => void;
  onOpenAccount: () => void;
  onToggleEcoCool?: () => void;
  isEcoCoolActive?: boolean;
}

export const SeniorTopNav: React.FC<SeniorTopNavProps> = ({
  mode,
  onSelectMode,
  battery,
  thermal,
  unreadAlertsCount,
  user,
  onOpenEvents,
  onOpenSettings,
  onOpenCloudStorage,
  onOpenAIExplainer,
  onOpenAccount,
  onToggleEcoCool,
  isEcoCoolActive,
}) => {
  const isBattery80Warning = battery.charging && battery.level >= 80;

  return (
    <header className="bg-slate-900 border-b-4 border-slate-700 text-white select-none px-3 py-2.5 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <button
            id="nav-brand-btn"
            onClick={() => onSelectMode('select')}
            className="flex items-center gap-2.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl transition text-left focus:ring-4 focus:ring-amber-400 border border-slate-700"
          >
            <div className="p-2 bg-emerald-600 rounded-lg text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black tracking-wide text-amber-400 flex items-center gap-1.5">
                HGUARD
                <span className="text-[10px] bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                  Alfred Premium+
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-medium">3 Cameras • 1 Viewer • Cloud 30D</div>
            </div>
          </button>
        </div>

        {/* Center Hardware Health Badges */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Battery Status Badge */}
          <div
            id="nav-battery-badge"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm border-2 ${
              isBattery80Warning
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse'
                : battery.level <= 20
                ? 'bg-red-900/40 border-red-500 text-red-300'
                : 'bg-slate-800 border-slate-600 text-emerald-400'
            }`}
            title="Battery Health Guard: Stop charging at 80%"
          >
            {battery.charging ? (
              <BatteryCharging className={`w-4 h-4 sm:w-5 sm:h-5 ${isBattery80Warning ? 'text-amber-300' : 'text-emerald-400'}`} />
            ) : (
              <Battery className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span>{battery.level}%</span>
            {isBattery80Warning && (
              <span className="hidden lg:inline-block text-[10px] bg-amber-400 text-black px-1.5 py-0.5 rounded font-black">
                UNPLUG (80%)
              </span>
            )}
          </div>

          {/* Thermal Health Badge */}
          <div
            id="nav-thermal-badge"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm border-2 ${
              thermal === 'hot'
                ? 'bg-red-900/40 border-red-500 text-red-300 animate-bounce'
                : thermal === 'warm'
                ? 'bg-amber-900/40 border-amber-500 text-amber-300'
                : 'bg-slate-800 border-slate-600 text-cyan-300'
            }`}
            title="Overheat Protection for Old Phones"
          >
            <Flame className="w-4 h-4" />
            <span className="capitalize">{thermal === 'normal' ? 'Cool' : thermal}</span>
          </div>

          {/* Eco Screen Cool Mode (If in camera mode) */}
          {mode === 'camera' && onToggleEcoCool && (
            <button
              id="nav-eco-cool-toggle"
              onClick={onToggleEcoCool}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm border-2 transition ${
                isEcoCoolActive
                  ? 'bg-cyan-600 border-cyan-300 text-white'
                  : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
              title="Blackout screen to prevent old phone from heating up"
            >
              <Moon className="w-4 h-4" />
              <span className="hidden sm:inline">Eco-Cool</span>
            </button>
          )}
        </div>

        {/* Action Controls: Cloud Storage, AI Explainer, Account Login, Settings */}
        <div className="flex items-center gap-2">
          {/* AI Intelligence / How AI Works */}
          <button
            id="nav-ai-explainer-btn"
            onClick={onOpenAIExplainer}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600/30 to-amber-500/20 hover:from-amber-600/50 hover:to-amber-500/40 border-2 border-amber-500/60 px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm text-amber-300 transition"
            title="How Gemini AI detection works"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Gemini AI</span>
          </button>

          {/* 30-Day Cloud Storage Vault */}
          <button
            id="nav-cloud-storage-btn"
            onClick={onOpenCloudStorage}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm text-sky-300 transition"
            title="30-Day Cloud Storage & Unified Timeline"
          >
            <Cloud className="w-4 h-4 text-sky-400" />
            <span className="hidden md:inline">Cloud (30D)</span>
          </button>

          {/* Encrypted Event Logs */}
          <button
            id="nav-events-btn"
            onClick={onOpenEvents}
            className="relative flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm text-white transition"
            aria-label="View Encrypted Security Events"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Events</span>
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-slate-900 animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Account Profile & Login */}
          <button
            id="nav-account-btn"
            onClick={onOpenAccount}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border-2 border-amber-500/40 px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm text-amber-300 transition"
            title="User Account & Alfred Premium Plus status"
          >
            <User className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline truncate max-w-[110px]">{user.name.split(' ')[0]}</span>
          </button>

          {/* Settings */}
          <button
            id="nav-settings-btn"
            onClick={onOpenSettings}
            className="p-2 bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 rounded-xl text-slate-300 transition"
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
