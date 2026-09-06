import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Crown,
  Check,
  HardDrive,
  Camera,
  Eye,
  Lock,
  Key,
  LogOut,
  Mail,
  Smartphone,
  Sparkles,
  X,
  RefreshCw,
  Github,
  ExternalLink,
  Copy,
  Terminal,
  Download,
  AlertCircle,
} from 'lucide-react';
import { UserProfile } from '../types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [emailInput, setEmailInput] = useState(user.email);
  const [nameInput, setNameInput] = useState(user.name);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState('https://github.com/sandipy/Hguard');
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedPagesUrl, setCopiedPagesUrl] = useState(false);

  if (!isOpen) return null;

  const gitPushCommand = `git remote add origin ${repoUrl.trim()}
git branch -M main
git push -u origin main`;

  const handleCopyCmd = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(gitPushCommand);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2500);
    }
  };

  const handleCopyPagesUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('https://sandipy.github.io/Hguard/');
      setCopiedPagesUrl(true);
      setTimeout(() => setCopiedPagesUrl(false), 2500);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      email: emailInput,
      name: nameInput,
      passPin: pinInput.length === 4 ? pinInput : user.passPin,
    });
    setFeedbackMsg('Account settings updated successfully!');
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  const handleToggleLogin = () => {
    onUpdateUser({ loggedIn: !user.loggedIn });
  };

  return (
    <div
      id="account-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div
        id="account-modal-container"
        className="bg-slate-900 border-4 border-amber-500/40 rounded-3xl max-w-2xl w-full text-white shadow-2xl p-6 sm:p-8 flex flex-col gap-6 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border-2 border-amber-500/40">
              <Crown className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black">User Account & Plan</h2>
                <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Premium Plus
                </span>
              </div>
              <p className="text-sm sm:text-base text-slate-400">
                Manage your credentials, 3-camera license, and cloud vault
              </p>
            </div>
          </div>
          <button
            id="account-close-btn"
            onClick={onClose}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition border border-slate-700"
            aria-label="Close Account Dialog"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {feedbackMsg && (
          <div className="bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300 p-4 rounded-2xl text-center font-bold text-lg">
            {feedbackMsg}
          </div>
        )}

        {/* Plan Feature Summary Card (HGuard Premium Plus) */}
        <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-2 border-amber-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-400" />
              <span className="text-lg font-black text-amber-300">
                HGuard: Premium Plus Tier
              </span>
            </div>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-bold border border-emerald-500/30">
              ACTIVE & VERIFIED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <Check className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="font-semibold text-slate-200">
                3 Active Cameras Allowed (Cam 1, 2, 3)
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <Check className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="font-semibold text-slate-200">
                1 Master Concurrent Viewer
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <Check className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="font-semibold text-slate-200">
                30-Day Cloud Storage Retention
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <Check className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="font-semibold text-slate-200">
                Full HD (1080p) & 4x Digital Zoom
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="font-semibold text-slate-200">
                Gemini Vision AI: Person, Pet, Vehicle
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="font-semibold text-slate-200">
                Lingering & Baby Cry Detection
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <Check className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="font-semibold text-slate-200">
                Continuous & 120s Clip Recording
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <Check className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="font-semibold text-slate-200">
                100% Ad-Free Experience
              </span>
            </div>
          </div>
        </div>

        {/* Account Profile Form */}
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-slate-200">
            <User className="w-5 h-5 text-amber-400" />
            Profile Credentials
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                Account Email
              </label>
              <div className="relative">
                <input
                  id="account-email-input"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-white focus:border-amber-400 focus:outline-none text-base"
                  required
                />
                <Mail className="w-5 h-5 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                Display Name
              </label>
              <input
                id="account-name-input"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-white focus:border-amber-400 focus:outline-none text-base"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                Senior Master PIN (4 digits)
              </label>
              <div className="relative">
                <input
                  id="account-pin-input"
                  type="password"
                  maxLength={4}
                  placeholder={`Current: ${user.passPin}`}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-white focus:border-amber-400 focus:outline-none text-base tracking-widest"
                />
                <Key className="w-5 h-5 text-slate-400 absolute right-3 top-3.5" />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Used for instant 1-tap unlock on senior monitors and viewing encrypted events.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                Cloud Sync Status
              </label>
              <button
                id="account-cloud-sync-btn"
                type="button"
                onClick={() => onUpdateUser({ cloudSyncEnabled: !user.cloudSyncEnabled })}
                className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-between border-2 transition ${
                  user.cloudSyncEnabled
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  <span>30-Day Cloud Backup</span>
                </div>
                <span className="text-xs uppercase px-2 py-0.5 rounded-full font-black bg-emerald-500/30 text-emerald-300">
                  {user.cloudSyncEnabled ? 'ENABLED' : 'OFFLINE ONLY'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              id="account-save-changes-btn"
              type="submit"
              className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-lg rounded-2xl shadow transition"
            >
              Save Account Changes
            </button>
            <button
              id="account-logout-btn"
              type="button"
              onClick={handleToggleLogin}
              className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-base rounded-2xl border border-slate-700 flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              {user.loggedIn ? 'Sign Out' : 'Sign In'}
            </button>
          </div>
        </form>

        {/* 3 Cameras & 1 Viewer Pairing Info */}
        <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl p-4 text-sm text-slate-300 flex flex-col gap-2">
          <div className="font-bold text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-400" />
            Device Topology (3 Cameras, 1 Viewer)
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Open this URL on up to 3 old smartphones and set each one as{' '}
            <strong className="text-amber-300">Camera 1 (Front Door)</strong>,{' '}
            <strong className="text-amber-300">Camera 2 (Living Room)</strong>, or{' '}
            <strong className="text-amber-300">Camera 3 (Backyard)</strong>. On your primary tablet or phone, select{' '}
            <strong className="text-amber-300">Viewer Mode</strong> to monitor all three cameras simultaneously on a multi-screen grid.
          </p>
        </div>

        {/* GitHub Repository Connection, Live GitHub.io Web App & Offline ZIP */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-indigo-500/50 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/40">
                <Github className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white flex items-center gap-2">
                  GitHub & Cloud Sync Hub
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    Connected: sandipy/Hguard
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  Live GitHub Pages hosting, repository code sync & offline standalone package
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                id="github-repo-link"
                href="https://github.com/sandipy/Hguard"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition shadow"
              >
                <span>View GitHub Repo</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* GitHub.io Live Web App Banner */}
          <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <strong className="text-sm font-black text-emerald-300">Live GitHub Pages Web URL:</strong>
              </div>
              <a
                href="https://sandipy.github.io/Hguard/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-emerald-400 hover:underline block mt-0.5"
              >
                https://sandipy.github.io/Hguard/
              </a>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Always live and accessible anywhere in the world on modern browsers.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyPagesUrl}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
              >
                {copiedPagesUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPagesUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
              <a
                id="open-github-pages-btn"
                href="https://sandipy.github.io/Hguard/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition shadow"
              >
                <span>Open App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Download Offline Standalone ZIP Card */}
          <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-sm font-black text-white block">
                  Download Offline Standalone App (.ZIP)
                </strong>
                <p className="text-xs text-slate-300 mt-0.5">
                  Complete client bundle with index.html and assets. Works 100% offline without internet.
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                  <span>hguard-offline.zip (~230 KB)</span>
                  <span>•</span>
                  <span>Battery 80% Guard</span>
                  <span>•</span>
                  <span>Motion & Audio Analysis</span>
                </div>
              </div>
            </div>
            <a
              id="download-offline-zip-btn"
              href="./hguard-offline.zip"
              download="hguard-offline.zip"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-black rounded-xl flex items-center gap-2 transition shadow shrink-0"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>Download Offline ZIP</span>
            </a>
          </div>

          {/* Quick Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-800/60 border border-slate-700 p-3 rounded-xl flex flex-col gap-1">
              <span className="text-amber-400 font-black">STEP 1</span>
              <strong className="text-slate-200">GitHub Repository</strong>
              <p className="text-slate-400">
                Synced to <span className="font-mono text-indigo-300">sandipy/Hguard</span> on the <span className="font-mono text-emerald-300">main</span> branch.
              </p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 p-3 rounded-xl flex flex-col gap-1">
              <span className="text-amber-400 font-black">STEP 2</span>
              <strong className="text-slate-200">GitHub Pages</strong>
              <p className="text-slate-400">
                Automated deployment enabled via GitHub Actions and the <span className="font-mono text-indigo-300">gh-pages</span> branch.
              </p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 p-3 rounded-xl flex flex-col gap-1">
              <span className="text-amber-400 font-black">STEP 3</span>
              <strong className="text-slate-200">Offline Standalone</strong>
              <p className="text-slate-400">
                Extract <span className="font-mono text-amber-300">hguard-offline.zip</span> to run anytime locally without an external web server.
              </p>
            </div>
          </div>

          {/* Command Copy Tool */}
          <div className="flex flex-col gap-2 pt-1">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Git CLI Command (Pre-configured for sandipy/Hguard):
            </label>
            <div className="flex gap-2">
              <input
                id="github-repo-url-input"
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/sandipy/Hguard"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 focus:border-indigo-400 focus:outline-none"
              />
              <button
                id="copy-git-cmd-btn"
                type="button"
                onClick={handleCopyCmd}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow shrink-0"
              >
                {copiedCmd ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Command</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl font-mono text-[11px] text-emerald-400/90 overflow-x-auto select-all whitespace-pre">
              {gitPushCommand}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
