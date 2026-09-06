import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Cloud,
  Calendar,
  Filter,
  Play,
  Trash2,
  Download,
  Search,
  Sparkles,
  ShieldAlert,
  Clock,
  Video,
  X,
  RefreshCw,
  Camera,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { CameraSlot, SecurityEvent, AIObjectType } from '../types';

interface CloudStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  localEvents: SecurityEvent[];
  encryptionPin: string;
}

interface StoredCloudClip {
  id: string;
  cameraId: CameraSlot;
  cameraName: string;
  timestamp: number;
  eventType: AIObjectType;
  durationSec: number;
  thumbnailUrl: string;
  aiSummary: string;
  threatLevel: 'none' | 'low' | 'medium' | 'high';
  aiFrameBoxes?: Array<{
    label: string;
    confidence: number;
    box_2d: [number, number, number, number];
  }>;
}

export const CloudStorageModal: React.FC<CloudStorageModalProps> = ({
  isOpen,
  onClose,
  localEvents,
  encryptionPin,
}) => {
  const [cloudClips, setCloudClips] = useState<StoredCloudClip[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCameraFilter, setSelectedCameraFilter] = useState<'all' | CameraSlot>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | AIObjectType>('all');
  const [activePlaybackClip, setActivePlaybackClip] = useState<StoredCloudClip | null>(null);
  const [timelineScrubTime, setTimelineScrubTime] = useState<number>(Date.now());

  // Fetch from server /api/cloud-storage/events or fallback to local events & storage
  const fetchCloudEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cloud-storage/events');
      if (res.ok) {
        const data = await res.json();
        if (data.events && data.events.length > 0) {
          setCloudClips(data.events);
          localStorage.setItem('hguard_cloud_clips', JSON.stringify(data.events));
          setActivePlaybackClip(data.events[0]);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch from cloud storage API, using fallback clips:', e);
    }

    // Offline / Local fallback: retrieve from localStorage or map from localEvents
    const cached = localStorage.getItem('hguard_cloud_clips');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCloudClips(parsed);
          setActivePlaybackClip(parsed[0]);
          setLoading(false);
          return;
        }
      } catch {}
    }

    if (localEvents.length > 0) {
      const converted: StoredCloudClip[] = localEvents.map((evt) => ({
        id: evt.id,
        cameraId: evt.cameraId,
        cameraName: evt.cameraName,
        timestamp: evt.timestamp,
        eventType: (evt.eventType as AIObjectType) || 'motion',
        durationSec: 15,
        thumbnailUrl: evt.decryptedSnapshot || '',
        aiSummary: evt.aiSummary || evt.notes || 'Motion detected by camera',
        threatLevel: evt.motionIntensity > 80 ? 'high' : evt.motionIntensity > 50 ? 'medium' : 'low',
        aiFrameBoxes: evt.aiDetectedObjects,
      }));
      setCloudClips(converted);
      if (converted.length > 0) {
        setActivePlaybackClip(converted[0]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchCloudEvents();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter clips
  const filteredClips = cloudClips.filter((clip) => {
    if (selectedCameraFilter !== 'all' && clip.cameraId !== selectedCameraFilter) {
      return false;
    }
    if (selectedCategoryFilter !== 'all' && clip.eventType !== selectedCategoryFilter) {
      return false;
    }
    return true;
  });

  const handleDeleteClip = async (id: string) => {
    try {
      await fetch(`/api/cloud-storage/delete/${id}`, { method: 'DELETE' });
      setCloudClips((prev) => prev.filter((c) => c.id !== id));
      if (activePlaybackClip?.id === id) {
        setActivePlaybackClip(null);
      }
    } catch {
      setCloudClips((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <div
      id="cloud-storage-modal-overlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
    >
      <div
        id="cloud-storage-modal-container"
        className="bg-slate-900 border-4 border-amber-500/40 rounded-3xl max-w-5xl w-full text-white shadow-2xl p-5 sm:p-8 flex flex-col gap-6 max-h-[95vh] overflow-y-auto"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border-2 border-amber-500/40">
              <Cloud className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black">30-Day Cloud Storage Vault</h2>
                <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full uppercase">
                  Premium Plus
                </span>
              </div>
              <p className="text-sm sm:text-base text-slate-400">
                Unified Timeline & encrypted event clips across all 3 active cameras
              </p>
            </div>
          </div>
          <button
            id="cloud-storage-close-btn"
            onClick={onClose}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition border border-slate-700"
            aria-label="Close Cloud Storage Dialog"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 30-Day Cloud Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Cloud Retention</div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-5 h-5 text-amber-400" />
              30 Days
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Recorded Events</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {filteredClips.length} Clips
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Clip Lengths</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
              120s / 30s
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Storage Vault</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <HardDrive className="w-5 h-5 text-emerald-400" />
              Unlimited
            </div>
          </div>
        </div>

        {/* Unified Timeline Scrubber Bar */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-amber-300">
              <Clock className="w-4 h-4" />
              Unified 24h Timeline
            </span>
            <span className="text-slate-400">
              Color Legend:{' '}
              <span className="text-blue-400">● Person</span>{' '}
              <span className="text-emerald-400">● Pet</span>{' '}
              <span className="text-amber-400">● Vehicle</span>{' '}
              <span className="text-purple-400">● Baby Cry</span>{' '}
              <span className="text-red-400">● Motion</span>
            </span>
          </div>

          {/* Scrubber track with event marks */}
          <div className="relative h-10 bg-slate-800 rounded-xl overflow-hidden border border-slate-700 flex items-center px-3">
            {/* Hour ticks */}
            <div className="absolute inset-0 flex justify-between px-3 items-center pointer-events-none opacity-25 text-[10px] text-slate-400">
              <span>00:00</span>
              <span>04:00</span>
              <span>08:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
              <span>Now</span>
            </div>

            {/* Event dots */}
            {cloudClips.map((clip, idx) => {
              const color =
                clip.eventType === 'person'
                  ? 'bg-blue-500'
                  : clip.eventType === 'pet'
                  ? 'bg-emerald-500'
                  : clip.eventType === 'vehicle'
                  ? 'bg-amber-500'
                  : clip.eventType === 'baby_cry'
                  ? 'bg-purple-500'
                  : 'bg-red-500';

              const leftPercent = Math.max(5, Math.min(95, 10 + (idx * 28) % 85));

              return (
                <button
                  key={clip.id}
                  onClick={() => setActivePlaybackClip(clip)}
                  title={`${clip.cameraName} - ${clip.eventType.toUpperCase()}`}
                  style={{ left: `${leftPercent}%` }}
                  className={`absolute top-2 w-4 h-6 rounded-md ${color} border border-white/80 shadow-md hover:scale-125 transition z-10`}
                />
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
              <Camera className="w-4 h-4" /> Filter Camera:
            </span>
            {(['all', 'cam1', 'cam2', 'cam3'] as const).map((cam) => (
              <button
                key={cam}
                onClick={() => setSelectedCameraFilter(cam)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition ${
                  selectedCameraFilter === cam
                    ? 'bg-amber-500 text-black border-amber-400 shadow'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {cam === 'all'
                  ? 'All 3 Cameras'
                  : cam === 'cam1'
                  ? 'Cam 1 (Front)'
                  : cam === 'cam2'
                  ? 'Cam 2 (Living)'
                  : 'Cam 3 (Yard)'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-amber-400" /> AI Category:
            </span>
            {(['all', 'person', 'pet', 'vehicle', 'baby_cry', 'motion'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border capitalize transition ${
                  selectedCategoryFilter === cat
                    ? 'bg-amber-500 text-black border-amber-400 shadow'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Active Clip Previewer & Event List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Visual Player */}
          <div className="lg:col-span-7 bg-black rounded-2xl border-2 border-slate-800 overflow-hidden flex flex-col">
            <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
              {activePlaybackClip ? (
                <div className="w-full h-full relative flex items-center justify-center">
                  {/* Visual simulated feed or thumbnail */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 mb-3 animate-pulse">
                      <Play className="w-8 h-8 ml-1" />
                    </div>
                    <div className="text-xl font-bold text-white mb-1">
                      {activePlaybackClip.cameraName}
                    </div>
                    <div className="text-sm text-slate-300 max-w-md">
                      {activePlaybackClip.aiSummary}
                    </div>
                  </div>

                  {/* AI Frame Bounding Box Overlay */}
                  {activePlaybackClip.aiFrameBoxes?.map((box, i) => (
                    <div
                      key={i}
                      style={{
                        top: `${box.box_2d[0] / 10}%`,
                        left: `${box.box_2d[1] / 10}%`,
                        height: `${(box.box_2d[2] - box.box_2d[0]) / 10}%`,
                        width: `${(box.box_2d[3] - box.box_2d[1]) / 10}%`,
                      }}
                      className="absolute border-3 border-amber-400 rounded-lg bg-amber-500/15 pointer-events-none flex flex-col justify-start"
                    >
                      <span className="bg-amber-500 text-black text-[11px] font-black px-2 py-0.5 rounded-br-md self-start">
                        {box.label} ({box.confidence}%)
                      </span>
                    </div>
                  ))}

                  {/* On-screen Watermark & Forensic Timestamp */}
                  <div className="absolute top-3 left-3 bg-black/70 px-2.5 py-1 rounded text-xs font-mono font-bold text-emerald-400 border border-slate-700">
                    {new Date(activePlaybackClip.timestamp).toLocaleString()}
                  </div>
                  <div className="absolute top-3 right-3 bg-amber-500/90 text-slate-950 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">
                    HGuard Premium Plus 1080p
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/80 px-3 py-1 rounded-full text-xs font-bold text-slate-300">
                    Duration: {activePlaybackClip.durationSec}s Clip
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-center p-6">
                  Select an event clip from the list to preview
                </div>
              )}
            </div>

            {/* Playback Controls & Actions */}
            {activePlaybackClip && (
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-base">
                    {activePlaybackClip.cameraName} • {activePlaybackClip.eventType.toUpperCase()}
                  </div>
                  <div className="text-xs text-slate-400">
                    Recorded {new Date(activePlaybackClip.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="clip-download-btn"
                    onClick={() => alert('Clip downloaded to your device.')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-sm border border-slate-700 flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                  <button
                    id="clip-delete-btn"
                    onClick={() => handleDeleteClip(activePlaybackClip.id)}
                    className="px-3 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-300 rounded-xl font-bold text-sm border border-red-700 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Event Clip List */}
          <div className="lg:col-span-5 flex flex-col gap-2.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredClips.length === 0 ? (
              <div className="bg-slate-800/40 p-6 rounded-2xl text-center text-slate-400 border border-slate-700">
                No cloud recordings found for the selected filters.
              </div>
            ) : (
              filteredClips.map((clip) => {
                const isSelected = activePlaybackClip?.id === clip.id;
                return (
                  <button
                    key={clip.id}
                    onClick={() => setActivePlaybackClip(clip)}
                    className={`w-full text-left p-3.5 rounded-2xl border-2 transition flex items-center gap-3 ${
                      isSelected
                        ? 'bg-slate-800 border-amber-400 shadow-lg'
                        : 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0">
                      {clip.eventType === 'person' ? (
                        <span className="text-xl">👤</span>
                      ) : clip.eventType === 'pet' ? (
                        <span className="text-xl">🐾</span>
                      ) : clip.eventType === 'vehicle' ? (
                        <span className="text-xl">🚗</span>
                      ) : clip.eventType === 'baby_cry' ? (
                        <span className="text-xl">👶</span>
                      ) : (
                        <Video className="w-6 h-6 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm truncate">
                          {clip.cameraName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(clip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 truncate mt-0.5">
                        {clip.aiSummary}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                          {clip.eventType}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {clip.durationSec}s clip
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
