export type DisplayMode = 'clock' | 'weather' | 'visualizer' | 'crypto' | 'custom';

export interface ClockState {
  timeStr: string;
  dateStr: string;
  temp: number;
  humidity: number;
  weatherCondition: 'sunny' | 'rainy' | 'cloudy' | 'snow';
  spotifyTrack: {
    title: string;
    artist: string;
    progress: number;
  };
  cryptoPrice: {
    symbol: string;
    price: string;
    change: string;
  };
}

export interface HardwareHotspot {
  id: string;
  name: string;
  specs: string;
  description: string;
  pins: string;
  x: number; // percentage
  y: number; // percentage
}

export interface FirmwareSnippet {
  id: string;
  title: string;
  lang: string;
  filename: string;
  code: string;
}
