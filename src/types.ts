export type AppMode = 'select' | 'camera' | 'viewer';

export type CameraSlot = 'cam1' | 'cam2' | 'cam3';

export type MotionSensitivity = 'low' | 'medium' | 'high';

export type BandwidthMode = 'low' | 'balanced' | 'high';

export type ResolutionMode = '1080p' | '720p' | '360p' | '240p';

export type ThermalStatus = 'normal' | 'warm' | 'hot';

export type AIObjectType = 'person' | 'pet' | 'vehicle' | 'baby_cry' | 'lingering' | 'motion' | 'package' | 'manual';

export interface AIFrameBox {
  label: string;
  confidence: number;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000 scale
  lingeringDetected?: boolean;
}

export interface AIDetectionResult {
  detected: boolean;
  primaryType: AIObjectType;
  threatLevel: 'none' | 'low' | 'medium' | 'high';
  summary: string;
  audioAnomalyDetected?: boolean;
  lingeringDetected?: boolean;
  objects: AIFrameBox[];
}

export interface BatteryState {
  level: number; // 0 to 100
  charging: boolean;
  chargingTime?: number;
  dischargingTime?: number;
  supported: boolean;
}

export interface SecurityEvent {
  id: string;
  cameraId: CameraSlot;
  cameraName: string;
  timestamp: number;
  motionIntensity: number; // 0 - 100
  eventType: AIObjectType;
  snapshotEncrypted: string; // Base64 encrypted string (AES-GCM)
  iv: string; // Initialization vector for AES-GCM
  thermalState: ThermalStatus;
  batteryLevel: number;
  notes?: string;
  durationSec?: number;
  isCloudSynced?: boolean;
  aiResult?: AIDetectionResult;
  aiSummary?: string;
  aiConfidence?: number;
  aiDetectedObjects?: AIFrameBox[];
  // Non-encrypted preview cached in session if unlocked
  decryptedSnapshot?: string;
}

export interface UserProfile {
  email: string;
  name: string;
  plan: 'Free' | 'Premium Standard' | 'Premium Plus';
  activeCamerasAllowed: number; // 3 in our plan (or unlimited)
  concurrentViewersAllowed: number; // 1 viewer
  cloudRetentionDays: number; // 30 days in Premium Plus
  loggedIn: boolean;
  passPin: string;
  cloudSyncEnabled: boolean;
}

export interface AppSettings {
  // Motion & Detection Settings
  motionSensitivity: MotionSensitivity;
  detectionZone: 'full' | 'center';
  motionCooldownSec: number;
  
  // Premium Plus AI Features
  aiDetectionEnabled: boolean;
  aiPersonDetection: boolean;
  aiPetDetection: boolean;
  aiVehicleDetection: boolean;
  aiLingeringDetection: boolean;
  aiBabyCryDetection: boolean;
  aiFrameBoxesVisible: boolean;
  
  // Recording & Storage
  continuousRecording: boolean;
  recordingClipDuration: 30 | 120;
  cloudStorageEnabled: boolean;
  showWatermark: boolean;
  showTimestamp: boolean;

  // Video resolution & Zoom
  resolutionMode: ResolutionMode;
  bandwidthMode: BandwidthMode;
  
  // Hardware & Battery protection for old phones
  batteryHealthCap: number; // default 80
  batteryAlarmEnabled: boolean;
  smartPlugWebhookUrl: string; // Optional URL to auto-cut power at 80%
  ecoCoolScreenEnabled: boolean; // Turn screen black during surveillance to prevent heating
  ecoCoolDelaySec: number; // Seconds of inactivity before screen turns black
  thermalThrottleFps: boolean;
  
  // Accessibility & Alerts
  seniorVoiceAlerts: boolean;
  highContrast: boolean;
  largeFonts: boolean;
  alarmSoundEnabled: boolean;
  
  // Encryption
  encryptionPin: string;
}

export interface CameraStatusBroadcast {
  cameraId: CameraSlot;
  cameraName: string;
  timestamp: number;
  isOnline: boolean;
  battery: BatteryState;
  thermal: ThermalStatus;
  fps: number;
  currentFrame?: string; // compressed data URL for live preview
  bandwidthMode: BandwidthMode;
  resolutionMode: ResolutionMode;
  motionDetected: boolean;
  motionScore: number;
  aiResult?: AIDetectionResult;
  isRecording?: boolean;
}

