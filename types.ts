
export interface User {
  id: string;
  username: string;
  password?: string; 
  role: 'ADMIN' | 'USER';
  displayName?: string;
  accessLevel: 1 | 2 | 3; 
  expiresAt?: number | null; 
}

export interface Subtitle {
  id: string;
  startTime: number; 
  endTime: number;   
  text: string;
}

export interface VideoChoice {
  id: string;
  text: string;
  targetSceneId: string;
  color?: string; 
  hidden?: boolean; // New: Hide choice from player
}

export interface Scene {
  id: string;
  name: string; 
  videoUrl: string;
  subtitles: Subtitle[];
  interactionTime: number; 
  choices: VideoChoice[];
}

export interface Story {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  projectSize?: string; 
  bgmUrl?: string; 
  showSubtitles: boolean; 
  scenes: Scene[];
  initialSceneId: string;
  createdAt: number;
  isPublished: boolean; 
  requiredAccessLevel: 1 | 2 | 3; 
}

export interface AppSettings {
  homeTitle: string;
  homeSubtitle: string; 
  homeDescription: string;
  footerText: string;
  loginBackgroundVideoUrl?: string;
  allowPublicRegistration: boolean;
  defaultRegistrationDays: number;
}

export type AppView = 'LOGIN' | 'HOME' | 'ADMIN_DASHBOARD' | 'PLAYER';
export type UserRole = 'ADMIN' | 'USER' | null;

export interface StoryScene {
  title?: string;
  backgroundDescription?: string;
  backgroundKeyword: string;
  characters?: {
    name: string;
    color?: string;
    expression?: string;
    position?: 'left' | 'center' | 'right';
  }[];
  dialogue: {
    speaker: string;
    text: string;
    emotion?: string;
  }[];
  choices: {
    label: string;
    intent: string;
  }[];
}
