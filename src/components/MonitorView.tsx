import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  Volume2,
  VolumeX,
  ShieldAlert,
  Battery,
  BatteryCharging,
  Flame,
  Wifi,
  FileText,
  Camera,
  RefreshCw,
  AlertTriangle,
  Mic,
  Sliders,
  CheckCircle2,
  Play,
  Lock,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Square,
  Sparkles,
  Cloud,
  Clock,
  Video,
  VideoOff,
  UserCheck,
  Dog,
  Car,
  ChevronRight,
} from 'lucide-react';
import {
  AppSettings,
  BatteryState,
  CameraSlot,
  CameraStatusBroadcast,
  ResolutionMode,
  SecurityEvent,
  ThermalStatus,
} from '../types';
import { globalStreamChannel } from '../utils/streamChannel';
import { playSirenSound, speakSeniorVoice } from '../utils/soundAlerts';
import { encryptData } from '../utils/crypto';

interface MonitorViewProps {
  settings: AppSettings;
  onOpenEvents: () => void;
  onOpenCloudStorage: () => void;
  onOpenAIExplainer: () => void;
  onNewSecurityEvent: (event: SecurityEvent) => void;
}

const CAMERA_SLOTS: Array<{ id: CameraSlot; name: string; location: string; defaultBg: string }> = [
  { id: 'cam1', name: 'Camera 1', location: 'Front Door / Porch', defaultBg: '#0f172a' },
  { id: 'cam2', name: 'Camera 2', location: 'Living Room / Indoor', defaultBg: '#1e1b4b' },
  { id: 'cam3', name: 'Camera 3', location: 'Backyard / Driveway', defaultBg: '#064e3b' },
];

export const MonitorView: React.FC<MonitorViewProps> = ({
  settings,
  onOpenEvents,
  onOpenCloudStorage,
  onOpenAIExplainer,
  onNewSecurityEvent,
}) => {
  // Multi-camera state map
  const [camerasState, setCamerasState] = useState<Record<CameraSlot, CameraStatusBroadcast | null>>({
    cam1: null,
    cam2: null,
    cam3: null,
  });

  const [activeCameraId, setActiveCameraId] = useState<CameraSlot>('cam1');
  const [viewLayout, setViewLayout] = useState<'grid' | 'single'>('grid');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 1.0x to 4.0x (Alfred Premium Plus)
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isAudioListening, setIsAudioListening] = useState(true);
  const [isTalking, setIsTalking] = useState(false);
  const [sirenActive, setSirenActive] = useState(false);
  const [isSnapshotSaving, setIsSnapshotSaving] = useState(false);
  const [isManualRecording, setIsManualRecording] = useState(false);
  const [recordTimerSec, setRecordTimerSec] = useState(0);
  const [aiFrameVisible, setAiFrameVisible] = useState(settings.aiFrameBoxesVisible);
  const [lastMotionAlert, setLastMotionAlert] = useState<{
    cameraId: CameraSlot;
    cameraName: string;
    time: number;
    score: number;
    type?: string;
  } | null>(null);

  // Simulation frame clock for offline camera demo
  const [simClock, setSimClock] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSimClock((c) => c + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to camera broadcasts from stream channel
  useEffect(() => {
    const unsubAll = globalStreamChannel.onAllCameras((map) => {
      setCamerasState((prev) => ({
        cam1: map.cam1 || prev.cam1,
        cam2: map.cam2 || prev.cam2,
        cam3: map.cam3 || prev.cam3,
      }));
    });

    const unsubSingle = globalStreamChannel.onCameraStatus((status) => {
      setCamerasState((prev) => ({
        ...prev,
        [status.cameraId]: status,
      }));

      if (status.motionDetected) {
        setLastMotionAlert({
          cameraId: status.cameraId,
          cameraName: status.cameraName,
          time: Date.now(),
          score: status.motionScore,
          type: status.aiResult?.primaryType || 'motion',
        });
      }
    });

    const unsubEvent = globalStreamChannel.onSecurityEvent((evt) => {
      setLastMotionAlert({
        cameraId: evt.cameraId,
        cameraName: evt.cameraName,
        time: evt.timestamp,
        score: evt.motionIntensity,
        type: evt.eventType,
      });
      if (settings.alarmSoundEnabled) {
        playSirenSound();
      }
      if (settings.seniorVoiceAlerts) {
        speakSeniorVoice(`Alert! ${evt.eventType.toUpperCase()} detected at ${evt.cameraName}.`);
      }
    });

    return () => {
      unsubAll();
      unsubSingle();
      unsubEvent();
    };
  }, [settings.alarmSoundEnabled, settings.seniorVoiceAlerts]);

  // Handle Recording Timer
  useEffect(() => {
    let interval: any;
    if (isManualRecording) {
      interval = setInterval(() => {
        setRecordTimerSec((s) => {
          if (s + 1 >= settings.recordingClipDuration) {
            // Auto stop after 30s or 120s
            stopManualRecording();
            return 0;
          }
          return s + 1;
        });
      }, 1000);
    } else {
      setRecordTimerSec(0);
    }
    return () => clearInterval(interval);
  }, [isManualRecording, settings.recordingClipDuration]);

  // Remote Siren trigger
  const triggerRemoteSiren = (target: CameraSlot | 'all' = 'all') => {
    setSirenActive(true);
    playSirenSound();
    globalStreamChannel.sendRemoteCommand('TRIGGER_SIREN', target);
    if (settings.seniorVoiceAlerts) {
      speakSeniorVoice('Sounding emergency siren on home cameras!');
    }
    setTimeout(() => setSirenActive(false), 2500);
  };

  // Start manual recording
  const startManualRecording = () => {
    setIsManualRecording(true);
    setRecordTimerSec(0);
    if (settings.seniorVoiceAlerts) {
      speakSeniorVoice(`Recording ${settings.recordingClipDuration} second clip.`);
    }
  };

  // Stop manual recording & save to cloud vault
  const stopManualRecording = async () => {
    setIsManualRecording(false);
    const cam = camerasState[activeCameraId];
    const cameraConfig = CAMERA_SLOTS.find((c) => c.id === activeCameraId);

    // Save to Cloud Storage
    try {
      await fetch('/api/cloud-storage/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cameraId: activeCameraId,
          cameraName: cameraConfig?.name || 'Home Camera',
          timestamp: Date.now(),
          eventType: cam?.aiResult?.primaryType || 'manual',
          durationSec: settings.recordingClipDuration,
          thumbnailUrl: cam?.currentFrame || '',
          aiSummary: `Manual recorded clip (${settings.recordingClipDuration}s) by Master Viewer.`,
          threatLevel: 'none',
          aiFrameBoxes: cam?.aiResult?.objects || [],
        }),
      });
      if (settings.seniorVoiceAlerts) {
        speakSeniorVoice('Recording saved to 30-day cloud vault.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Manual Snapshot
  const takeManualSnapshot = async () => {
    const cam = camerasState[activeCameraId];
    const cameraConfig = CAMERA_SLOTS.find((c) => c.id === activeCameraId);
    const frame = cam?.currentFrame;

    setIsSnapshotSaving(true);
    try {
      let dataUrl = frame;
      if (!dataUrl) {
        // Generate simulated snapshot
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 24px sans-serif';
          ctx.fillText(`${cameraConfig?.name} (${cameraConfig?.location})`, 80, 220);
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '18px sans-serif';
          ctx.fillText(`Timestamp: ${new Date().toLocaleString()}`, 80, 260);
          dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        }
      }

      if (dataUrl) {
        const encrypted = await encryptData(dataUrl, settings.encryptionPin);
        const newEvt: SecurityEvent = {
          id: `snapshot_${Date.now()}`,
          cameraId: activeCameraId,
          cameraName: cameraConfig?.name || 'Camera',
          timestamp: Date.now(),
          motionIntensity: 0,
          eventType: 'manual',
          snapshotEncrypted: encrypted.ciphertext,
          iv: encrypted.iv,
          thermalState: cam?.thermal || 'normal',
          batteryLevel: cam?.battery?.level || 80,
          notes: `Snapshot captured by Viewer from ${cameraConfig?.name}`,
          decryptedSnapshot: dataUrl,
          durationSec: 0,
          isCloudSynced: true,
        };

        onNewSecurityEvent(newEvt);
        if (settings.seniorVoiceAlerts) {
          speakSeniorVoice('Snapshot encrypted and saved.');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSnapshotSaving(false);
    }
  };

  // Run instant AI scan on current active camera
  const handleScanWithGeminiAI = async () => {
    const cam = camerasState[activeCameraId];
    speakSeniorVoice('Running Gemini AI Vision scan on camera feed.');

    try {
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = 640;
      dummyCanvas.height = 480;
      const ctx = dummyCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = '#f59e0b';
        ctx.font = '24px sans-serif';
        ctx.fillText(`AI Scan Target: ${CAMERA_SLOTS.find(c => c.id === activeCameraId)?.location}`, 70, 240);
      }
      const base64 = cam?.currentFrame || dummyCanvas.toDataURL('image/jpeg', 0.7);

      const res = await fetch('/api/ai-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          cameraName: CAMERA_SLOTS.find(c => c.id === activeCameraId)?.name || 'Home Camera',
          detectModes: ['person', 'pet', 'vehicle', 'lingering'],
        }),
      });
      const data = await res.json();
      if (data?.result) {
        // Broadcast updated AI status
        const updatedStatus: CameraStatusBroadcast = {
          cameraId: activeCameraId,
          cameraName: CAMERA_SLOTS.find(c => c.id === activeCameraId)?.name || 'Camera',
          timestamp: Date.now(),
          isOnline: true,
          battery: cam?.battery || { level: 82, charging: true, supported: true },
          thermal: cam?.thermal || 'normal',
          fps: 15,
          currentFrame: base64,
          bandwidthMode: settings.bandwidthMode,
          resolutionMode: settings.resolutionMode,
          motionDetected: true,
          motionScore: 85,
          aiResult: data.result,
        };
        globalStreamChannel.broadcastCameraStatus(updatedStatus);
        speakSeniorVoice(`AI detected ${data.result.primaryType}. ${data.result.summary}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const activeCamStatus = camerasState[activeCameraId];
  const activeCamConfig = CAMERA_SLOTS.find((c) => c.id === activeCameraId);

  return (
    <div className="flex flex-col gap-5 select-none">
      {/* REAL-TIME MOTION & AI ALERT BANNER */}
      {lastMotionAlert && Date.now() - lastMotionAlert.time < 12000 && (
        <div
          id="monitor-motion-alert-banner"
          className="bg-red-600 text-white p-4 sm:p-5 rounded-3xl border-4 border-red-300 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-bounce"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-900 rounded-2xl text-amber-300">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black">
                ALERT: {lastMotionAlert.type?.toUpperCase()} DETECTED AT {lastMotionAlert.cameraName}!
              </div>
              <div className="text-sm sm:text-base font-bold text-red-100">
                Movement intensity: {lastMotionAlert.score}%. Check camera feed or activate siren below.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="alert-switch-camera-btn"
              onClick={() => {
                setActiveCameraId(lastMotionAlert.cameraId);
                setViewLayout('single');
              }}
              className="px-5 py-3 bg-white text-slate-950 font-black text-base rounded-xl shadow"
            >
              FOCUS CAM
            </button>
            <button
              id="alert-siren-quick-btn"
              onClick={() => triggerRemoteSiren(lastMotionAlert.cameraId)}
              className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-black font-black text-base rounded-xl shadow"
            >
              SOUND SIREN
            </button>
          </div>
        </div>
      )}

      {/* TOP MONITOR HEADER & 3-CAMERA SELECTOR BAR */}
      <div className="bg-slate-900 border-3 border-slate-700 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping" />
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Master Surveillance Viewer
            </h2>
            <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-1 rounded-full font-black border border-amber-500/40 uppercase">
              Alfred Premium Plus (3 Cams)
            </span>
          </div>
          <p className="text-slate-300 text-sm font-medium mt-1">
            Monitoring 3 active cameras simultaneously • 1 Concurrent Master Viewer
          </p>
        </div>

        {/* Layout & Control Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            id="layout-grid-btn"
            onClick={() => setViewLayout('grid')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 border-2 transition ${
              viewLayout === 'grid'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>3-Camera Split</span>
          </button>
          <button
            id="layout-single-btn"
            onClick={() => setViewLayout('single')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 border-2 transition ${
              viewLayout === 'single'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Square className="w-4 h-4" />
            <span>Focused View</span>
          </button>
        </div>
      </div>

      {/* 3 CAMERAS SELECTOR TABS (Alfred Premium Plus 3-Camera Topology) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CAMERA_SLOTS.map((slot) => {
          const cam = camerasState[slot.id];
          const isSelected = activeCameraId === slot.id;
          const battery = cam?.battery || { level: 80, charging: true, supported: true };
          const thermal = cam?.thermal || 'normal';
          const isOnline = !!cam?.isOnline;

          return (
            <button
              key={slot.id}
              onClick={() => {
                setActiveCameraId(slot.id);
                if (viewLayout === 'grid') {
                  // Keep grid or allow focusing
                }
              }}
              className={`p-4 rounded-2xl border-3 text-left transition flex items-center justify-between ${
                isSelected
                  ? 'bg-slate-800/90 border-amber-400 shadow-xl ring-2 ring-amber-400/50'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                    isSelected ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-white text-base flex items-center gap-1.5">
                    {slot.name}
                    {isSelected && (
                      <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.2 rounded font-black">
                        SELECTED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{slot.location}</div>
                </div>
              </div>

              {/* Hardware stats */}
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                  <BatteryCharging className="w-3.5 h-3.5" />
                  <span>{battery.level}%</span>
                </div>
                <div className="text-[10px] font-mono uppercase text-slate-400">
                  {thermal === 'normal' ? 'Cool' : thermal} • {cam?.fps || 12} FPS
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* VIEWPORT: MULTI-SCREEN 3-GRID OR SINGLE FOCUSED */}
      {viewLayout === 'grid' ? (
        /* MULTI-SCREEN 3-CAMERA GRID (Alfred Premium Plus Multi-Screen Monitoring) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CAMERA_SLOTS.map((slot) => {
            const cam = camerasState[slot.id];
            const isSelected = activeCameraId === slot.id;

            return (
              <div
                key={slot.id}
                onClick={() => {
                  setActiveCameraId(slot.id);
                  setViewLayout('single');
                }}
                className={`relative bg-slate-950 rounded-3xl overflow-hidden border-4 cursor-pointer group transition transform hover:scale-[1.01] ${
                  isSelected ? 'border-amber-400 shadow-2xl' : 'border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="aspect-video relative flex items-center justify-center bg-slate-900 overflow-hidden">
                  {cam?.currentFrame ? (
                    <img
                      src={cam.currentFrame}
                      alt={slot.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    /* Simulated Video Feed with Room Atmosphere */
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-900 to-slate-950 relative">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-amber-400 mb-2">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div className="text-base font-bold text-white">{slot.name}</div>
                      <div className="text-xs text-slate-400">{slot.location}</div>
                      <div className="text-[11px] font-mono text-emerald-400 mt-2 bg-slate-950/80 px-2 py-0.5 rounded">
                        Live • {10 + (simClock % 5)} FPS • 1080p Full HD
                      </div>
                    </div>
                  )}

                  {/* AI Frame overlay in mini-grid */}
                  {aiFrameVisible && cam?.aiResult?.objects && (
                    <div className="absolute inset-0 pointer-events-none">
                      {cam.aiResult.objects.map((obj, i) => (
                        <div
                          key={i}
                          style={{
                            top: `${obj.box_2d[0] / 10}%`,
                            left: `${obj.box_2d[1] / 10}%`,
                            height: `${(obj.box_2d[2] - obj.box_2d[0]) / 10}%`,
                            width: `${(obj.box_2d[3] - obj.box_2d[1]) / 10}%`,
                          }}
                          className="absolute border-2 border-amber-400 bg-amber-400/20 rounded"
                        >
                          <span className="text-[9px] font-black bg-amber-500 text-black px-1 rounded-br">
                            {obj.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-black text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>{slot.name}</span>
                  </div>

                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur px-2 py-1 rounded text-[11px] font-bold text-amber-300">
                    Click to Focus
                  </div>
                </div>

                <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold">{slot.location}</span>
                  <span className="text-emerald-400 font-mono">Battery: {cam?.battery?.level || 80}%</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* SINGLE FOCUSED CAMERA VIEW WITH 4X DIGITAL ZOOM & AI FRAME */
        <div className="flex flex-col gap-4">
          <div className="relative bg-slate-950 rounded-3xl overflow-hidden border-4 border-slate-700 shadow-2xl min-h-[360px] sm:min-h-[480px] flex items-center justify-center">
            {/* Live Camera View with 4x Zoom transform */}
            <div
              className="w-full h-full flex items-center justify-center overflow-hidden"
              style={{
                transform: `scale(${zoomLevel}) translate(${panPosition.x}px, ${panPosition.y}px)`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
              }}
            >
              {activeCamStatus?.currentFrame ? (
                <img
                  src={activeCamStatus.currentFrame}
                  alt={activeCamConfig?.name || 'Surveillance Feed'}
                  className="w-full h-full object-cover max-h-[560px]"
                />
              ) : (
                <div className="w-full h-full min-h-[460px] flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
                  <div className="p-5 bg-slate-800/80 border-2 border-slate-700 rounded-3xl text-amber-400 mb-3 animate-pulse">
                    <Eye className="w-16 h-16" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    {activeCamConfig?.name} • {activeCamConfig?.location}
                  </h3>
                  <p className="text-slate-300 text-sm sm:text-base max-w-md mt-1">
                    Streaming in Full HD (1080p). Ready for 4x Digital Zoom, Gemini Vision AI detection, and two-way talkback.
                  </p>
                </div>
              )}
            </div>

            {/* AI Frame Bounding Box Overlay (Alfred Premium Plus Feature) */}
            {aiFrameVisible && activeCamStatus?.aiResult?.objects && (
              <div className="absolute inset-0 pointer-events-none">
                {activeCamStatus.aiResult.objects.map((obj, i) => (
                  <div
                    key={i}
                    style={{
                      top: `${obj.box_2d[0] / 10}%`,
                      left: `${obj.box_2d[1] / 10}%`,
                      height: `${(obj.box_2d[2] - obj.box_2d[0]) / 10}%`,
                      width: `${(obj.box_2d[3] - obj.box_2d[1]) / 10}%`,
                    }}
                    className="absolute border-3 border-amber-400 rounded-lg bg-amber-500/20 flex flex-col justify-start"
                  >
                    <span className="bg-amber-500 text-black text-xs font-black px-2 py-0.5 rounded-br-md self-start">
                      {obj.label} ({obj.confidence}%)
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Top Live Status Bar */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3.5 py-1.5 rounded-xl border border-slate-700 text-white font-black text-xs sm:text-sm">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <span>LIVE • {activeCamConfig?.name}</span>
              <span className="text-slate-400">|</span>
              <span className="text-amber-400">{activeCamStatus?.fps || 15} FPS</span>
              <span className="text-slate-400">|</span>
              <span className="text-cyan-300 font-mono">1080p Full HD</span>
            </div>

            {/* Top Right Zoom & AI Frame Badges */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 text-amber-300 font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <ZoomIn className="w-4 h-4" />
                <span>Zoom: {zoomLevel.toFixed(1)}x</span>
              </div>
              {settings.showTimestamp && (
                <div className="hidden sm:flex bg-black/80 font-mono text-emerald-400 px-3 py-1.5 rounded-xl text-xs border border-slate-800">
                  {new Date().toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* Recording Indicator */}
            {isManualRecording && (
              <div className="absolute bottom-4 left-4 bg-red-600 text-white font-black text-sm px-4 py-2 rounded-xl flex items-center gap-2 animate-pulse shadow-lg border-2 border-white">
                <span className="w-3 h-3 rounded-full bg-white" />
                <span>RECORDING CLIP ({recordTimerSec}s / {settings.recordingClipDuration}s)</span>
              </div>
            )}
          </div>

          {/* 4X ZOOM & CAMERA CONTROLS BAR (Alfred Premium Plus) */}
          <div className="bg-slate-900 border-2 border-slate-700 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            {/* 4x Digital Zoom Slider */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1">
                <ZoomIn className="w-4 h-4 text-amber-400" /> 4x Zoom:
              </span>
              <input
                id="viewer-zoom-slider"
                type="range"
                min="1.0"
                max="4.0"
                step="0.2"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="w-36 sm:w-48 accent-amber-400 cursor-pointer"
              />
              <span className="font-mono text-sm font-black text-amber-400 w-10">
                {zoomLevel.toFixed(1)}x
              </span>
              {zoomLevel > 1.0 && (
                <button
                  id="reset-zoom-btn"
                  onClick={() => {
                    setZoomLevel(1.0);
                    setPanPosition({ x: 0, y: 0 });
                  }}
                  className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-300 font-bold border border-slate-600"
                >
                  Reset 1x
                </button>
              )}
            </div>

            {/* AI Frame & Scan Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="toggle-ai-frame-btn"
                onClick={() => setAiFrameVisible(!aiFrameVisible)}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition flex items-center gap-1.5 ${
                  aiFrameVisible
                    ? 'bg-amber-500 text-black border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Frame {aiFrameVisible ? 'ON' : 'OFF'}</span>
              </button>

              <button
                id="run-gemini-scan-btn"
                onClick={handleScanWithGeminiAI}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black text-xs sm:text-sm rounded-xl shadow border border-amber-400 flex items-center gap-1.5 hover:brightness-110 transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Scan with Gemini AI</span>
              </button>

              <button
                id="back-to-grid-btn"
                onClick={() => setViewLayout('grid')}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm rounded-xl border border-slate-700 flex items-center gap-1.5"
              >
                <Grid className="w-4 h-4" />
                <span>All 3 Cams</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GIANT SENIOR-FRIENDLY CONTROLS (EASY TO SEE, EASY TO CLICK) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* BIG EMERGENCY SIREN BUTTON */}
        <button
          id="viewer-sound-siren-btn"
          onClick={() => triggerRemoteSiren(activeCameraId)}
          className={`py-5 px-6 font-black text-xl sm:text-2xl rounded-2xl shadow-2xl flex items-center justify-center gap-3 transition transform active:scale-95 border-4 ${
            sirenActive
              ? 'bg-red-700 text-white border-white animate-ping'
              : 'bg-red-600 hover:bg-red-500 text-white border-red-400'
          }`}
        >
          <ShieldAlert className="w-8 h-8" />
          <span>SOUND SIREN</span>
        </button>

        {/* TWO-WAY TALK / INTERCOM BUTTON */}
        <button
          id="viewer-talk-intercom-btn"
          onMouseDown={() => {
            setIsTalking(true);
            speakSeniorVoice(`Speaking to ${activeCamConfig?.name}.`);
          }}
          onMouseUp={() => setIsTalking(false)}
          onTouchStart={() => {
            setIsTalking(true);
            speakSeniorVoice(`Speaking to ${activeCamConfig?.name}.`);
          }}
          onTouchEnd={() => setIsTalking(false)}
          className={`py-5 px-6 font-black text-xl sm:text-2xl rounded-2xl shadow-2xl flex items-center justify-center gap-3 transition transform active:scale-95 border-4 ${
            isTalking
              ? 'bg-emerald-500 text-white border-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
          }`}
        >
          <Mic className="w-8 h-8" />
          <span>{isTalking ? 'TALKING...' : 'HOLD TO TALK'}</span>
        </button>

        {/* RECORD VIDEO CLIP BUTTON (30s / 120s) */}
        <button
          id="viewer-record-clip-btn"
          onClick={isManualRecording ? stopManualRecording : startManualRecording}
          className={`py-5 px-6 font-black text-xl sm:text-2xl rounded-2xl shadow-2xl flex items-center justify-center gap-3 transition transform active:scale-95 border-4 ${
            isManualRecording
              ? 'bg-red-600 text-white border-white animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600'
          }`}
        >
          <Video className="w-8 h-8 text-amber-400" />
          <span>{isManualRecording ? `STOP (${recordTimerSec}s)` : 'RECORD CLIP'}</span>
        </button>

        {/* 30-DAY CLOUD VAULT BUTTON */}
        <button
          id="viewer-open-cloud-btn"
          onClick={onOpenCloudStorage}
          className="py-5 px-6 bg-gradient-to-r from-sky-700 to-sky-600 hover:from-sky-600 hover:to-sky-500 active:bg-sky-800 text-white font-black text-xl sm:text-2xl rounded-2xl shadow-2xl flex items-center justify-center gap-3 transition transform active:scale-95 border-4 border-sky-400"
        >
          <Cloud className="w-8 h-8 text-sky-200" />
          <span>CLOUD (30D)</span>
        </button>
      </div>

      {/* QUICK STATUS CARD FOR SENIOR COMFORT & AUDIO TOGGLE */}
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-emerald-950 text-emerald-400 rounded-2xl border border-emerald-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-xl sm:text-2xl font-black text-white">
              ALL 3 CAMERAS GUARDED & ENCRYPTED
            </h4>
            <p className="text-slate-300 text-sm sm:text-base font-medium mt-0.5">
              Zero-knowledge AES-256 GCM encryption active. Thermal throttle protects older phones.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            id="toggle-audio-listen-btn"
            onClick={() => {
              setIsAudioListening(!isAudioListening);
              speakSeniorVoice(isAudioListening ? 'Audio muted' : 'Audio listening turned on');
            }}
            className={`w-full md:w-auto py-3.5 px-5 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 border-2 transition ${
              isAudioListening
                ? 'bg-slate-800 text-emerald-400 border-emerald-500'
                : 'bg-slate-800 text-slate-400 border-slate-600'
            }`}
          >
            {isAudioListening ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            <span>{isAudioListening ? 'Audio: ON' : 'Audio: MUTED'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
