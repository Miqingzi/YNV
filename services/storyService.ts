import { Story, User, AppSettings } from '../types';

const STORY_STORAGE_KEY = 'vn_maker_stories_v5'; 
const USER_STORAGE_KEY = 'vn_maker_users_v1';
const SETTINGS_STORAGE_KEY = 'vn_maker_settings_v2';

// --- Settings Management ---

const DEFAULT_SETTINGS: AppSettings = {
  homeTitle: '视觉小说',
  homeSubtitle: '可选性视觉高潮',
  homeDescription: '沉浸式互动体验。每一个决定都将改变故事的走向。',
  footerText: '© 2024 Visual Novel Engine. All Rights Reserved.',
  loginBackgroundVideoUrl: '',
  allowPublicRegistration: true, // Default to true for easy onboarding, admin can disable
  defaultRegistrationDays: 0 // 0 means permanent
};

export const getAppSettings = (): AppSettings => {
  const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
  const settings = data ? JSON.parse(data) : DEFAULT_SETTINGS;
  // Merge to ensure new properties exist if loading old settings
  return { ...DEFAULT_SETTINGS, ...settings };
};

export const saveAppSettings = (settings: AppSettings): void => {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

// --- Story Management ---

export const getStories = (): Story[] => {
  const data = localStorage.getItem(STORY_STORAGE_KEY);
  if (!data) {
    return []; 
  }
  return JSON.parse(data);
};

export const saveStory = (story: Story): void => {
  const stories = getStories();
  const index = stories.findIndex(s => s.id === story.id);
  if (index >= 0) {
    stories[index] = story;
  } else {
    stories.push(story);
  }
  localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(stories));
};

export const deleteStory = (id: string): void => {
  const stories = getStories().filter(s => s.id !== id);
  localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(stories));
};

export const createEmptyStory = (): Story => {
  return {
    id: crypto.randomUUID(),
    title: '新视觉小说',
    author: 'Admin',
    description: '在此处输入剧情简介...',
    coverUrl: 'https://via.placeholder.com/800x600?text=Visual+Novel',
    projectSize: '0 MB', 
    createdAt: Date.now(),
    initialSceneId: 'start',
    isPublished: false,
    bgmUrl: '',
    showSubtitles: true,
    requiredAccessLevel: 1,
    scenes: [
      {
        id: 'start',
        name: '序章',
        videoUrl: '',
        subtitles: [
            { id: crypto.randomUUID(), startTime: 0, endTime: 3, text: '序幕开启...' }
        ],
        interactionTime: -1, 
        choices: []
      }
    ]
  };
};

// --- User Management ---

export const getUsers = (): User[] => {
  const data = localStorage.getItem(USER_STORAGE_KEY);
  if (!data) {
    const defaultAdmin: User = {
      id: 'admin-1',
      username: 'admin',
      password: '110911',
      role: 'ADMIN',
      displayName: '超级管理员',
      accessLevel: 3,
      expiresAt: null 
    };
    const initialUsers = [defaultAdmin];
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(initialUsers));
    return initialUsers;
  }
  return JSON.parse(data);
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === user.id);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
};

export const deleteUser = (id: string): void => {
  const users = getUsers().filter(u => u.id !== id);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
};

export const validateUser = (username: string, password: string): User | null => {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
      if (user.role !== 'ADMIN' && user.expiresAt && Date.now() > user.expiresAt) {
          throw new Error("ACCOUNT_EXPIRED");
      }
      return user;
  }
  return null;
};

export const registerUser = (username: string, password: string): User => {
    const users = getUsers();
    if (users.find(u => u.username === username)) {
        throw new Error("USERNAME_TAKEN");
    }

    const settings = getAppSettings();
    if (!settings.allowPublicRegistration) {
        throw new Error("REGISTRATION_CLOSED");
    }

    let expiresAt: number | null = null;
    if (settings.defaultRegistrationDays && settings.defaultRegistrationDays > 0) {
        expiresAt = Date.now() + (settings.defaultRegistrationDays * 24 * 60 * 60 * 1000);
    }

    const newUser: User = {
        id: crypto.randomUUID(),
        username,
        password,
        displayName: username, // Default display name is username
        role: 'USER',
        accessLevel: 1, // Default Level 1 for new registrations
        expiresAt: expiresAt 
    };
    saveUser(newUser);
    return newUser;
};