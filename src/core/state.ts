import type { AppState } from './types.js';

export const state: AppState = {
  me: null,
  authMode: 'login',
  tab: 'chats',
  view: 'main',
  search: '',
  chats: [],
  users: [],
  activeChat: null,
  messages: [],
  replyTo: null,
  editing: null,
  emojiOpen: false,
  poll: null,
  recording: null,
  recordChunks: [],
  selectedProfileMedia: 'avatar'
};
