export type AppTab = 'chats' | 'discover' | 'profile';
export type AppView = 'main' | 'chat';
export type AuthMode = 'login' | 'register';
export type MessageType = 'text' | 'image' | 'file' | 'audio';

export interface User {
  id: number;
  username: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  instagram_url?: string | null;
  x_url?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  last_seen?: string | null;
}

export interface ChatSummary {
  id: number;
  title?: string | null;
  created_at: string;
  last_body?: string | null;
  last_message_at?: string | null;
  last_type?: MessageType | null;
  unread?: number;
  other?: User | null;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  body?: string | null;
  message_type: MessageType;
  attachment_url?: string | null;
  attachment_name?: string | null;
  reply_to_id?: number | null;
  reply_body?: string | null;
  reply_sender?: string | null;
  is_pinned?: boolean;
  edited_at?: string | null;
  created_at: string;
  mine?: boolean;
}

export interface ApiOptions extends RequestInit {
  qs?: Record<string, string | number | boolean | null | undefined>;
}

export interface AppState {
  me: User | null;
  authMode: AuthMode;
  tab: AppTab;
  view: AppView;
  search: string;
  chats: ChatSummary[];
  users: User[];
  activeChat: ChatSummary | null;
  messages: Message[];
  replyTo: Message | null;
  editing: Message | null;
  emojiOpen: boolean;
  poll: number | null;
  recording: MediaRecorder | null;
  recordChunks: Blob[];
  selectedProfileMedia: 'avatar' | 'banner';
}

export interface ChatResponse {
  messages: Message[];
}

export interface AuthResponse {
  authenticated?: boolean;
  user?: User;
}

export interface GenericResponse {
  ok?: boolean;
  error?: string;
  user?: User;
  chats?: ChatSummary[];
  users?: User[];
  conversation_id?: number;
  pinned?: boolean;
}
