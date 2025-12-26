export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface LocationInfo {
  city?: string;
  state?: string;
  country?: string;
  displayName: string;
}

export interface ExifDetails {
  make?: string;
  model?: string;
  exposureTime?: number;
  fNumber?: number;
  iso?: number;
  focalLength?: number;
  lensModel?: string;
}

export interface ProcessedImage {
  file: File;
  previewUrl: string;
  exifLocation?: GeoLocation;
  exifDate?: Date;
  exifDetails?: ExifDetails;
  locationInfo?: LocationInfo;
  gpsFound: boolean;
  aiGuessed?: boolean;
  aiConfidence?: number;
  aiReasoning?: string;
}

export interface AIAnalysisResult {
  locationName: string;
  lat?: number;
  lng?: number;
  confidence: number;
  reasoning: string;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}