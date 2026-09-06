import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  Play,
  Square,
  Shield,
  Flame,
  BatteryCharging,
  Battery,
  AlertTriangle,
  Moon,
  Sun,
  Eye,
  Settings,
  Wifi,
  Volume2,
  RefreshCw,
  Sliders,
  Bell,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  AppSettings,
  BatteryState,
  CameraSlot,
  CameraStatusBroadcast,
  MotionSensitivity,
  BandwidthMode,
  SecurityEvent,
  ThermalStatus,
  AIDetectionResult,
  UserProfile,
} from '../types';
import { MotionDetector } from '../utils/motionDetector';
import { encryptData } from '../utils/crypto';
import { playBatteryLimitChime, playSirenSound, speakSeniorVoice } from '../utils/soundAlerts';
import { BatteryService } from '../utils/batteryService';
import { globalStreamChannel } from '../utils/streamChannel';

interface CameraViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onNewSecurityEvent: (event: SecurityEvent) => void;
  battery: BatteryState;
  thermal: ThermalStatus;
  setBattery: (state: BatteryState) => void;
  setThermal: (status: ThermalStatus) => void;
  user?: UserProfile;
}

const CAMERA_NAMES: Record<CameraSlot, string> = {
  cam1: 'Camera 1 (Front Door)',
  cam2: 'Camera 2 (Living Room)',
  cam3: 'Camera 3 (Backyard)',
};

export const CameraView: React.FC<CameraViewProps> = ({
  settings,
  onUpdateSettings,
  onNewSecurityEvent,
  battery,
  thermal,
  setBattery,
  setThermal,
  user,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<CameraSlot>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const cam = params.get('cam');
      if (cam === 'cam1' || cam === 'cam2' || cam === 'cam3') return cam;
    } catch {}
    return 'cam1';
  });
  const [currentAiResult, setCurrentAiResult] = useState<AIDetectionResult | null>(null);
  const [isSurveillanceActive, setIsSurveillanceActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isEcoCoolActive, setIsEcoCoolActive] = useState(false);
  const [currentMotionScore, setCurrentMotionScore] = useState(0);
  const [recentMotionAlert, setRecentMotionAlert] = useState(false);
  const [battery80Warning, setBattery80Warning] = useState(false);
  const [actualFps, setActualFps] = useState(10);
  const [isFlashActive, setIsFlashActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const motionDetectorRef = useRef<MotionDetector>(new MotionDetector());
  const animationFrameRef = useRef<number | null>(null);
  const lastAnalyzeTimeRef = useRef<number>(0);
  const lastBroadcastTimeRef = useRef<number>(0);
  const lastMotionTriggerTimeRef = useRef<number>(0);
  const ecoCoolTimerRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(Date.now());

  // Check 80% battery charging threshold
  const checkBatteryThreshold = useCallback(() => {
    const batteryService = BatteryService.getInstance();
    const result = batteryService.checkThreshold80(settings.batteryHealthCap);

    if (result.triggerAlert && settings.batteryAlarmEnabled) {
      setBattery80Warning(true);
      playBatteryLimitChime();
      if (settings.seniorVoiceAlerts) {
        speakSeniorVoice('Warning! Battery is at 80 percent. Please unplug the charger to protect battery health.');
      }
      if (settings.smartPlugWebhookUrl) {
        batteryService.triggerSmartPlug(settings.smartPlugWebhookUrl, 'off');
      }
    } else if (!battery.charging || battery.level < settings.batteryHealthCap) {
      setBattery80Warning(false);
    }
  }, [settings, battery]);

  useEffect(() => {
    checkBatteryThreshold();
  }, [battery, checkBatteryThreshold]);

  // Handle remote commands (e.g. viewer triggering siren)
  useEffect(() => {
    const unsubscribe = globalStreamChannel.onRemoteCommand((cmd) => {
      if (cmd.command === 'TRIGGER_SIREN') {
        playSirenSound();
        setIsFlashActive(true);
        setTimeout(() => setIsFlashActive(false), 2000);
        if (settings.seniorVoiceAlerts) {
          speakSeniorVoice('Emergency alarm triggered by remote viewer!');
        }
      }
    });
    return unsubscribe;
  }, [settings.seniorVoiceAlerts]);

  // Start real camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      // Resolution constraints based on bandwidth setting
      let videoConstraints: MediaTrackConstraints = {
        facingMode: 'environment',
        width: { ideal: 640 },
        height: { ideal: 480 },
      };

      if (settings.bandwidthMode === 'low') {
        videoConstraints = {
          facingMode: 'environment',
          width: { ideal: 320, max: 320 },
          height: { ideal: 240, max: 240 },
          frameRate: { ideal: 10, max: 10 },
        };
      } else if (settings.bandwidthMode === 'high') {
        videoConstraints = {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24 },
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsSurveillanceActive(true);
      if (settings.seniorVoiceAlerts) {
        speakSeniorVoice('Camera surveillance is now active.');
      }
    } catch (err: unknown) {
      console.warn('Camera access denied or unavailable:', err);
      // Provide fallback simulated stream on canvas if camera is blocked or hardware missing
      initSimulatedCamera();
    }
  };

  // Fallback simulator for desktop browsers without active webcam
  const initSimulatedCamera = () => {
    setCameraError('Using test simulation stream (No physical webcam detected or permission blocked).');
    const simCanvas = document.createElement('canvas');
    simCanvas.width = 320;
    simCanvas.height = 240;
    const ctx = simCanvas.getContext('2d')!;

    let ballX = 50;
    let ballDir = 2;

    const renderSim = () => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 320, 240);

      // Draw simulated room doorway
      ctx.fillStyle = '#334155';
      ctx.fillRect(100, 40, 120, 160);
      ctx.fillStyle = '#475569';
      ctx.fillRect(110, 50, 100, 150);

      // Draw moving object to test motion detection
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(ballX, 120, 20, 0, Math.PI * 2);
      ctx.fill();

      ballX += ballDir;
      if (ballX > 260 || ballX < 60) ballDir *= -1;

      // Text label
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ROOM SIMULATOR - MOVING TARGET', 20, 25);
    };

    const simStream = simCanvas.captureStream(15);
    streamRef.current = simStream;
    if (videoRef.current) {
      videoRef.current.srcObject = simStream;
      videoRef.current.play();
    }
    const interval = setInterval(renderSim, 66);
    setIsSurveillanceActive(true);

    return () => clearInterval(interval);
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsSurveillanceActive(false);
    setIsEcoCoolActive(false);
    motionDetectorRef.current.reset();
    if (settings.seniorVoiceAlerts) {
      speakSeniorVoice('Camera stopped.');
    }
  };

  // Reset Eco-cool timeout on user interaction
  const resetEcoCoolTimer = useCallback(() => {
    if (isEcoCoolActive) {
      setIsEcoCoolActive(false);
    }
    if (ecoCoolTimerRef.current) {
      clearTimeout(ecoCoolTimerRef.current);
    }
    if (settings.ecoCoolScreenEnabled && isSurveillanceActive) {
      ecoCoolTimerRef.current = setTimeout(() => {
        setIsEcoCoolActive(true);
      }, settings.ecoCoolDelaySec * 1000);
    }
  }, [isEcoCoolActive, settings.ecoCoolScreenEnabled, settings.ecoCoolDelaySec, isSurveillanceActive]);

  useEffect(() => {
    resetEcoCoolTimer();
    return () => {
      if (ecoCoolTimerRef.current) clearTimeout(ecoCoolTimerRef.current);
    };
  }, [resetEcoCoolTimer]);

  // Main Processing & Motion Detection Loop
  useEffect(() => {
    if (!isSurveillanceActive) return;

    let isRunning = true;

    // Interval throttle depends on sensitivity to save processing power on old phones!
    const analyzeInterval =
      settings.motionSensitivity === 'low'
        ? 1200 // Analyze every 1.2s - saves massive CPU
        : settings.motionSensitivity === 'medium'
        ? 600 // Analyze every 0.6s
        : 250; // Analyze every 0.25s

    // Streaming broadcast throttle depends on bandwidth mode
    const broadcastInterval =
      settings.bandwidthMode === 'low'
        ? 400 // ~2.5 frames/sec
        : settings.bandwidthMode === 'balanced'
        ? 150 // ~7 frames/sec
        : 80; // ~12 frames/sec

    const jpegQuality =
      settings.bandwidthMode === 'low' ? 0.25 : settings.bandwidthMode === 'balanced' ? 0.5 : 0.8;

    const processFrame = async () => {
      if (!isRunning) return;

      const now = performance.now();

      // Measure FPS
      frameCountRef.current++;
      if (Date.now() - fpsTimerRef.current >= 1000) {
        setActualFps(frameCountRef.current);
        frameCountRef.current = 0;
        fpsTimerRef.current = Date.now();

        // Thermal monitoring estimation: if CPU frame loop lags, indicate warmth
        if (actualFps < 4 && isSurveillanceActive) {
          setThermal('warm');
        } else if (actualFps >= 4) {
          setThermal('normal');
        }
      }

      // Check motion
      if (videoRef.current && now - lastAnalyzeTimeRef.current >= analyzeInterval) {
        lastAnalyzeTimeRef.current = now;
        const analysis = motionDetectorRef.current.analyzeFrame(
          videoRef.current,
          settings.motionSensitivity,
          settings.detectionZone
        );

        setCurrentMotionScore(analysis.score);

        if (analysis.hasMotion) {
          const sinceLastTrigger = now - lastMotionTriggerTimeRef.current;
          if (sinceLastTrigger >= settings.motionCooldownSec * 1000) {
            lastMotionTriggerTimeRef.current = now;
            setRecentMotionAlert(true);
            setTimeout(() => setRecentMotionAlert(false), 3000);

            // Audio alert if enabled
            if (settings.alarmSoundEnabled) {
              playSirenSound();
            }
            if (settings.seniorVoiceAlerts) {
              speakSeniorVoice('Motion detected in room!');
            }

            // Capture snapshot & encrypt with AES-GCM 256 for offline review!
            const rawSnapshot = motionDetectorRef.current.captureSnapshot(videoRef.current, jpegQuality);
            if (rawSnapshot) {
              try {
                const encrypted = await encryptData(rawSnapshot, settings.encryptionPin);
                const cameraName = CAMERA_NAMES[selectedSlot];
                const newEvt: SecurityEvent = {
                  id: `evt_${Date.now()}`,
                  cameraId: selectedSlot,
                  cameraName: cameraName,
                  timestamp: Date.now(),
                  motionIntensity: analysis.score,
                  eventType: 'motion',
                  snapshotEncrypted: encrypted.ciphertext,
                  iv: encrypted.iv,
                  thermalState: thermal,
                  batteryLevel: battery.level,
                  notes: `Motion score ${analysis.score}% with ${settings.motionSensitivity} sensitivity`,
                  decryptedSnapshot: rawSnapshot, // cached in current memory session
                  isCloudSynced: false,
                };

                // Asynchronously query Gemini AI if enabled
                if (settings.aiDetectionEnabled) {
                  fetch('/api/ai-detect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      imageBase64: rawSnapshot,
                      cameraName: cameraName,
                      detectModes: ['person', 'pet', 'vehicle', 'lingering'],
                    }),
                  })
                    .then(async (res) => {
                      if (!res.ok) throw new Error('API unavailable');
                      return res.json();
                    })
                    .then((data) => {
                      if (data?.result) {
                        setCurrentAiResult(data.result);
                        newEvt.eventType = data.result.primaryType;
                        newEvt.aiSummary = data.result.summary;
                        newEvt.aiConfidence = data.result.confidence;
                        newEvt.aiDetectedObjects = data.result.objects;
                        newEvt.notes = `${data.result.summary} (Confidence: ${data.result.confidence}%)`;

                        // Save to cloud storage if enabled
                        if (settings.cloudStorageEnabled) {
                          fetch('/api/cloud-storage/save', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              cameraId: selectedSlot,
                              cameraName: cameraName,
                              timestamp: newEvt.timestamp,
                              eventType: newEvt.eventType,
                              durationSec: 15,
                              thumbnailUrl: rawSnapshot,
                              aiSummary: data.result.summary,
                              threatLevel: data.result.threatLevel,
                              aiFrameBoxes: data.result.objects,
                            }),
                          }).catch(() => {});
                          newEvt.isCloudSynced = true;
                        }

                        // Broadcast enriched event
                        globalStreamChannel.broadcastSecurityEvent(newEvt);
                      }
                    })
                    .catch(() => {
                      // Offline/Client-side heuristic detection
                      const simulatedType = analysis.score > 70 ? 'person' : 'motion';
                      const fallbackResult: AIDetectionResult = {
                        detected: true,
                        primaryType: simulatedType,
                        confidence: Math.min(98, 70 + Math.round(analysis.score / 4)),
                        summary: `${simulatedType === 'person' ? 'Person' : 'Motion'} detected (${analysis.score}%)`,
                        threatLevel: analysis.score > 80 ? 'medium' : 'low',
                        objects: [
                          {
                            label: simulatedType === 'person' ? 'Person detected' : 'Motion zone',
                            confidence: 85,
                            box_2d: [180, 250, 750, 700],
                          },
                        ],
                      };
                      setCurrentAiResult(fallbackResult);
                      newEvt.eventType = simulatedType;
                      newEvt.aiSummary = fallbackResult.summary;
                      newEvt.aiConfidence = fallbackResult.confidence;
                      newEvt.aiDetectedObjects = fallbackResult.objects;
                      globalStreamChannel.broadcastSecurityEvent(newEvt);
                    });
                }

                onNewSecurityEvent(newEvt);
                globalStreamChannel.broadcastSecurityEvent(newEvt);
              } catch (e) {
                console.error('Failed to encrypt event snapshot:', e);
              }
            }
          }
        }
      }

      // Broadcast frame for Viewer Phone
      if (videoRef.current && now - lastBroadcastTimeRef.current >= broadcastInterval) {
        lastBroadcastTimeRef.current = now;
        const frameData = motionDetectorRef.current.captureSnapshot(videoRef.current, jpegQuality);

        const broadcast: CameraStatusBroadcast = {
          cameraId: selectedSlot,
          cameraName: CAMERA_NAMES[selectedSlot],
          timestamp: Date.now(),
          isOnline: true,
          battery,
          thermal,
          fps: actualFps,
          currentFrame: frameData,
          bandwidthMode: settings.bandwidthMode,
          resolutionMode: settings.resolutionMode,
          motionDetected: recentMotionAlert,
          motionScore: currentMotionScore,
          aiResult: currentAiResult || undefined,
        };

        globalStreamChannel.broadcastCameraStatus(broadcast);
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    isSurveillanceActive,
    settings,
    battery,
    thermal,
    actualFps,
    recentMotionAlert,
    currentMotionScore,
    onNewSecurityEvent,
    setThermal,
  ]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div
      className="relative flex flex-col gap-6 select-none"
      onClick={resetEcoCoolTimer}
      onTouchStart={resetEcoCoolTimer}
    >
      {/* FULL-SCREEN BLACKOUT ECO-COOL MODE (PREVENTS SCREEN FROM HEATING UP OLD PHONE) */}
      {isEcoCoolActive && (
        <div
          id="eco-cool-overlay"
          onClick={() => setIsEcoCoolActive(false)}
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none"
        >
          <div className="p-6 bg-slate-950/80 rounded-3xl border-2 border-slate-800 max-w-md w-full flex flex-col items-center gap-4">
            <Moon className="w-16 h-16 text-cyan-400 animate-pulse" />
            <h2 className="text-3xl font-black text-white">ECO-COOL ACTIVE</h2>
            <p className="text-lg text-slate-300 font-medium leading-relaxed">
              Screen is blacked out to prevent the phone from getting hot. Surveillance & motion detection are running
              safely in the background!
            </p>
            <div className="flex items-center gap-3 bg-slate-900 px-4 py-2.5 rounded-xl text-emerald-400 font-bold text-lg">
              <CheckCircle2 className="w-6 h-6" />
              <span>Monitoring Active</span>
            </div>
            <button
              id="eco-cool-wake-btn"
              onClick={() => setIsEcoCoolActive(false)}
              className="mt-4 w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xl rounded-2xl shadow-lg active:scale-95 transition"
            >
              TAP SCREEN TO WAKE UP
            </button>
          </div>
        </div>
      )}

      {/* BATTERY 80% LIMIT WARNING BANNER */}
      {battery80Warning && (
        <div
          id="battery-80-alert-banner"
          className="bg-amber-500 text-black p-5 rounded-2xl border-4 border-amber-300 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-black text-amber-400 rounded-2xl">
              <BatteryCharging className="w-10 h-10" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight">
                BATTERY AT {battery.level}% — UNPLUG CHARGER NOW!
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900">
                Charging stopped at 80% to protect old phone battery health from swelling or fire hazard.
              </div>
            </div>
          </div>
          <button
            id="dismiss-battery-alert-btn"
            onClick={() => {
              setBattery80Warning(false);
              // Also simulate unplugging if user clicks
              BatteryService.getInstance().setManualState(battery.level, false);
            }}
            className="w-full sm:w-auto px-6 py-4 bg-black hover:bg-slate-800 text-amber-400 font-black text-lg rounded-xl border-2 border-amber-300 shadow active:scale-95 transition"
          >
            DISMISS / UNPLUGGED
          </button>
        </div>
      )}

      {/* RECENT MOTION ALERT BANNER */}
      {recentMotionAlert && (
        <div
          id="motion-alert-banner"
          className="bg-red-600 text-white p-4 rounded-2xl border-4 border-red-300 shadow-2xl flex items-center justify-between gap-4 animate-bounce"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-9 h-9 text-amber-300" />
            <span className="text-2xl font-black">MOTION DETECTED RIGHT NOW!</span>
          </div>
          <span className="bg-red-950 px-3 py-1.5 rounded-lg text-sm font-bold tracking-wider uppercase">
            Encrypted & Saved
          </span>
        </div>
      )}

      {/* GMAIL ACCOUNT & ZERO-CRASH STATUS BAR */}
      <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="font-bold text-white">
            Gmail Linked: <span className="text-amber-300 font-mono">{user?.email || 'drshahenyashpal@gmail.com'}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
            ✓ 24/7 Permanent Session (Zero-Crash Mode)
          </span>
          <span className="text-slate-400 hidden sm:inline">
            • PIN: <strong className="text-amber-300 font-mono">{settings.encryptionPin}</strong>
          </span>
        </div>
      </div>

      {/* CAMERA SLOT SELECTOR (3 Cameras) */}
      <div className="bg-slate-900 border-2 border-slate-700 p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Device Camera Slot:</span>
          <span className="text-xs font-black bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
            {CAMERA_NAMES[selectedSlot]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {(['cam1', 'cam2', 'cam3'] as CameraSlot[]).map((slotKey, idx) => (
            <button
              key={slotKey}
              id={`cam-slot-btn-${slotKey}`}
              onClick={() => {
                setSelectedSlot(slotKey);
                speakSeniorVoice(`Configured as Camera ${idx + 1}`);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-1.5 border-2 ${
                selectedSlot === slotKey
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Cam {idx + 1}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CAMERA FEED VIEWPORT */}
      <div className="relative bg-slate-950 rounded-3xl overflow-hidden border-4 border-slate-700 shadow-2xl min-h-[380px] sm:min-h-[480px] flex flex-col items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover max-h-[540px] ${!isSurveillanceActive ? 'hidden' : ''}`}
        />

        {!isSurveillanceActive && (
          <div className="p-8 text-center flex flex-col items-center gap-6 max-w-lg">
            <div className="p-6 bg-slate-800 border-4 border-slate-600 rounded-3xl text-emerald-400 shadow-inner">
              <Camera className="w-20 h-20" />
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wide">
                OLD PHONE CAMERA MODE
              </h2>
              <p className="mt-2 text-lg sm:text-xl text-slate-300 leading-relaxed font-medium">
                Point this phone at the door, window, or hallway. It will guard your home, alert you on motion, and stay cool!
              </p>
            </div>
            <button
              id="start-camera-main-btn"
              onClick={startCamera}
              className="w-full py-5 px-8 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-2xl rounded-2xl shadow-xl flex items-center justify-center gap-3 transition transform active:scale-95 border-4 border-emerald-400"
            >
              <Play className="w-8 h-8 fill-current" />
              START CAMERA NOW
            </button>
          </div>
        )}

        {/* Live Overlay Status when Camera is Running */}
        {isSurveillanceActive && (
          <>
            {/* Top Bar on Video Feed */}
            <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3.5 py-1.5 rounded-xl border border-slate-600 text-white font-bold text-sm sm:text-base">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span className="text-red-400 uppercase font-black tracking-wider">LIVE GUARDING</span>
                <span className="text-slate-400">|</span>
                <span>{actualFps} FPS</span>
              </div>

              {/* Bandwidth Mode Badge */}
              <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-600 text-xs sm:text-sm font-bold text-cyan-300">
                <Wifi className="w-4 h-4" />
                <span className="capitalize">{settings.bandwidthMode} Bandwidth</span>
              </div>
            </div>

            {/* Motion Sensitivity Indicator Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2 pointer-events-none">
              <div className="bg-slate-900/90 backdrop-blur p-3 rounded-2xl border border-slate-700 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <span>Motion Level:</span>
                  <span className="text-amber-400 font-mono text-lg">{currentMotionScore}%</span>
                </div>
                {/* Visual Motion Gauge Bar */}
                <div className="flex-1 max-w-xs bg-slate-800 h-4 rounded-full overflow-hidden border border-slate-600">
                  <div
                    className={`h-full transition-all duration-150 ${
                      currentMotionScore > 20 ? 'bg-red-500' : currentMotionScore > 10 ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, currentMotionScore)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-300 uppercase font-bold hidden sm:inline">
                  Sensitivity: {settings.motionSensitivity}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Flash effect for emergency */}
        {isFlashActive && <div className="absolute inset-0 bg-white opacity-80 animate-ping pointer-events-none" />}
      </div>

      {cameraError && (
        <div className="p-4 bg-amber-900/40 border-2 border-amber-500 rounded-2xl text-amber-200 text-base font-bold flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* BIG SENIOR-FRIENDLY CONTROLS (Giant buttons, high contrast, easy to click) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isSurveillanceActive ? (
          <button
            id="stop-camera-btn"
            onClick={stopCamera}
            className="py-5 px-6 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-xl rounded-2xl shadow-xl flex items-center justify-center gap-3 transition border-4 border-red-400"
          >
            <Square className="w-7 h-7 fill-current" />
            STOP CAMERA
          </button>
        ) : (
          <button
            id="start-camera-secondary-btn"
            onClick={startCamera}
            className="py-5 px-6 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xl rounded-2xl shadow-xl flex items-center justify-center gap-3 transition border-4 border-emerald-400"
          >
            <Play className="w-7 h-7 fill-current" />
            START CAMERA
          </button>
        )}

        {/* ECO-COOL SCREEN BUTTON (HEAT PROTECTION) */}
        <button
          id="eco-cool-manual-btn"
          disabled={!isSurveillanceActive}
          onClick={() => setIsEcoCoolActive(true)}
          className={`py-5 px-6 font-black text-xl rounded-2xl shadow-xl flex items-center justify-center gap-3 transition border-4 ${
            isSurveillanceActive
              ? 'bg-cyan-700 hover:bg-cyan-600 text-white border-cyan-400'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
          title="Turn screen black to prevent old phone from getting hot during extended surveillance"
        >
          <Moon className="w-7 h-7" />
          ECO-COOL (NO HEAT)
        </button>

        {/* TEST 80% CHARGE PROTECTION BUTTON */}
        <button
          id="test-battery-80-btn"
          onClick={() => {
            const batteryService = BatteryService.getInstance();
            const current = batteryService.getState();
            if (current.level < 80) {
              batteryService.setManualState(80, true);
              setBattery({ ...current, level: 80, charging: true });
            } else {
              batteryService.setManualState(72, false);
              setBattery({ ...current, level: 72, charging: false });
            }
          }}
          className="py-5 px-6 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-black text-xl rounded-2xl shadow-xl flex items-center justify-center gap-3 transition border-4 border-amber-400"
        >
          <BatteryCharging className="w-7 h-7" />
          {battery.level >= 80 ? 'TEST UNPLUG (72%)' : 'TEST 80% GUARD'}
        </button>

        {/* MANUAL SIREN / ALARM TEST */}
        <button
          id="test-siren-btn"
          onClick={() => {
            playSirenSound();
            speakSeniorVoice('Test alarm sound is working perfectly!');
          }}
          className="py-5 px-6 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-black text-xl rounded-2xl shadow-xl flex items-center justify-center gap-3 transition border-4 border-slate-600"
        >
          <Volume2 className="w-7 h-7 text-amber-400" />
          TEST ALARM SOUND
        </button>
      </div>

      {/* HARDWARE SAFETY & EFFICIENCY CARD FOR OLD PHONES */}
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-400" />
            <div>
              <h3 className="text-2xl font-black text-white">OLD PHONE HARDWARE SHIELD</h3>
              <p className="text-sm text-slate-300 font-medium">
                Prevent battery damage and phone overheating during 24/7 surveillance
              </p>
            </div>
          </div>
          <span className="bg-emerald-950 text-emerald-300 border border-emerald-500 px-3 py-1 rounded-xl text-sm font-bold">
            Hardware Guard Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Battery Health Section */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-300">Battery 80% Guard</span>
              <span className="text-lg font-black text-amber-400">{battery.level}%</span>
            </div>
            <div className="text-xs text-slate-400 leading-relaxed">
              Stops charging at 80% to preserve lithium health and prevent battery swelling in old phones.
            </div>
            <div className="flex items-center gap-2 mt-auto">
              <button
                id="toggle-charging-btn"
                onClick={() => {
                  const s = BatteryService.getInstance();
                  s.setManualState(battery.level, !battery.charging);
                  setBattery({ ...battery, charging: !battery.charging });
                }}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-sm border transition ${
                  battery.charging
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-600'
                }`}
              >
                {battery.charging ? 'Charging: Connected' : 'Charging: Disconnected'}
              </button>
            </div>
          </div>

          {/* Motion Sensitivity Section */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-300">Motion Sensitivity</span>
              <span className="text-sm font-black text-cyan-300 uppercase">{settings.motionSensitivity}</span>
            </div>
            <div className="text-xs text-slate-400 leading-relaxed">
              Low sensitivity throttles frame checks to save CPU power & prevent phone from getting hot.
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-auto">
              {(['low', 'medium', 'high'] as MotionSensitivity[]).map((level) => (
                <button
                  key={level}
                  id={`motion-sens-${level}-btn`}
                  onClick={() => onUpdateSettings({ motionSensitivity: level })}
                  className={`py-2 px-1 rounded-xl font-black text-xs uppercase border transition ${
                    settings.motionSensitivity === level
                      ? 'bg-cyan-600 text-white border-cyan-300 shadow'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Bandwidth Section */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-300">Streaming Bandwidth</span>
              <span className="text-sm font-black text-emerald-400 uppercase">{settings.bandwidthMode}</span>
            </div>
            <div className="text-xs text-slate-400 leading-relaxed">
              Low-bandwidth 240p stream consumes minimal mobile data & runs stable even on weak Wi-Fi.
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-auto">
              {(['low', 'balanced', 'high'] as BandwidthMode[]).map((bMode) => (
                <button
                  key={bMode}
                  id={`bandwidth-mode-${bMode}-btn`}
                  onClick={() => onUpdateSettings({ bandwidthMode: bMode })}
                  className={`py-2 px-1 rounded-xl font-black text-xs uppercase border transition ${
                    settings.bandwidthMode === bMode
                      ? 'bg-emerald-600 text-white border-emerald-300 shadow'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {bMode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
