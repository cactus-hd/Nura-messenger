import { api } from './core/api.js';
import { $, $$ } from './core/dom.js';
import { RENDER_EVENT } from './core/events.js';
import { state } from './core/state.js';
import { esc, toast } from './core/utils.js';
import { authView } from './views/auth.js';
import { chatPage, renderMessages } from './views/chat.js';
import { renderChatRows, renderPeople, shell } from './views/layout.js';
import { newChatModal, profileEditModal, userProfileModal } from './views/modals.js';
import {
  attachMessageInteractions,
  autoGrow,
  beginEdit,
  beginReply,
  cancelEdit,
  clearReply,
  closeChat,
  composerKey,
  deleteMessage,
  insertEmoji,
  openChat,
  pollChat,
  sendMessage,
  sendSelectedFile,
  startPoll,
  stopPoll,
  toggleEmoji,
  togglePin,
  toggleVoice
} from './features/chat.js';
import { openProfileEdit, saveProfile, uploadProfileMedia } from './features/profile.js';
import type { AuthResponse, ChatResponse, GenericResponse, User } from './core/types.js';

const app = $('#app');

export function renderApp(): void {
  if (!app) return;
  app.innerHTML = state.me
    ? state.view === 'chat'
      ? chatPage()
      : shell()
    : authView();

  if (state.me && state.view !== 'chat' && state.tab === 'chats') renderChatRows();
  if (state.me && state.view === 'chat') {
    renderMessages({ preserveScroll: true });
    attachMessageInteractions();
  }
}

window.addEventListener(RENDER_EVENT, renderApp);

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const tab = target.closest<HTMLElement>('[data-tab]')?.dataset.tab;
  if (tab === 'chats' || tab === 'discover' || tab === 'profile') {
    navigate(tab);
    return;
  }

  const chatId = target.closest<HTMLElement>('[data-chat-id]')?.dataset.chatId;
  if (chatId) {
    void openChat(Number(chatId));
    return;
  }

  const userId = target.closest<HTMLElement>('[data-user-id]')?.dataset.userId;
  if (userId) {
    void startDirectChat(Number(userId));
    return;
  }

  const emoji = target.closest<HTMLElement>('[data-emoji]')?.dataset.emoji;
  if (emoji) {
    insertEmoji(emoji);
    return;
  }

  const actionButton = target.closest<HTMLElement>('[data-message-action]');
  if (actionButton) {
    const action = actionButton.dataset.messageAction;
    const id = Number(actionButton.dataset.messageId);
    handleMessageAction(action, id);
    return;
  }

  const profileMedia = target.closest<HTMLElement>('[data-profile-media]')?.dataset.profileMedia;
  if (profileMedia === 'avatar' || profileMedia === 'banner') {
    state.selectedProfileMedia = profileMedia;
    $('#mediaPicker')?.click();
    return;
  }

  const dataAction = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (dataAction) void handleAction(dataAction);
});

document.addEventListener('submit', (event) => {
  const form = event.target as HTMLFormElement;
  if (form.id === 'loginForm') void login(event as SubmitEvent);
  if (form.id === 'registerForm') void register(event as SubmitEvent);
  if (form.id === 'profileForm') void saveProfile(event as SubmitEvent);
});

document.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  if (target.id === 'chatSearch') {
    state.search = target.value;
    renderChatRows();
  }
  if (target.id === 'userSearch') void searchUsers(target.value);
  if (target.id === 'newChatSearch') void searchUsers(target.value, '#newUsers');
  if (target.id === 'composerText') autoGrow(target as HTMLTextAreaElement);
});

document.addEventListener('keydown', (event) => {
  if ((event.target as HTMLElement | null)?.id === 'composerText') composerKey(event);
  if (event.key === 'Escape') document.querySelector('.modal, .context')?.remove();
});

document.addEventListener('change', (event) => {
  const target = event.target as HTMLInputElement;
  if (target.dataset.change === 'chat-media' && target.files?.[0]) {
    const file = target.files[0];
    target.value = '';
    void sendSelectedFile(file);
  }
  if (target.dataset.change === 'profile-media' && target.files?.[0]) {
    const file = target.files[0];
    target.value = '';
    void uploadProfileMedia(file);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') return;
  if (state.view === 'chat') void pollChat(true);
});

function navigate(tab: 'chats' | 'discover' | 'profile'): void {
  stopPoll();
  state.tab = tab;
  state.view = 'main';
  state.search = '';
  state.activeChat = null;
  state.replyTo = null;
  state.editing = null;
  state.emojiOpen = false;
  renderApp();
  if (tab === 'chats') void loadChats();
}

async function handleAction(action: string): Promise<void> {
  switch (action) {
    case 'show-register': state.authMode = 'register'; renderApp(); break;
    case 'show-login': state.authMode = 'login'; renderApp(); break;
    case 'refresh-chats': await loadChats(); toast('Chats refreshed'); break;
    case 'new-chat': openNewChat(); break;
    case 'edit-profile': openProfileEdit(); break;
    case 'logout': await logout(); break;
    case 'close-chat': closeChat(); break;
    case 'close-modal': closeModal(); break;
    case 'send-message': await sendMessage(); break;
    case 'toggle-emoji': toggleEmoji(); break;
    case 'toggle-voice': await toggleVoice(); break;
    case 'clear-reply': clearReply(); break;
    case 'cancel-edit': cancelEdit(); break;
    case 'view-user': viewActiveUser(); break;
    case 'attach-chat-file': $('#chat-file')?.click(); break;
  }
}

function handleMessageAction(action: string | undefined, id: number): void {
  switch (action) {
    case 'reply-message': beginReply(id); break;
    case 'toggle-pin': void togglePin(id); break;
    case 'delete-message': void deleteMessage(id); break;
    case 'edit-message': beginEdit(id); break;
    case 'copy-message': void copyMessage(id); break;
  }
}

async function login(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const identity = $<HTMLInputElement>('#login-id')?.value.trim() ?? '';
  const password = $<HTMLInputElement>('#login-pw')?.value ?? '';
  try {
    const response = await api<{ user: User }>('login', jsonPost({ identity, password }));
    state.me = response.user;
    state.tab = 'chats';
    state.view = 'main';
    renderApp();
    await loadChats();
    toast('Welcome back ✨');
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Unable to sign in');
  }
}

async function register(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const username = $<HTMLInputElement>('#reg-user')?.value.trim() ?? '';
  const displayName = $<HTMLInputElement>('#reg-name')?.value.trim() ?? '';
  const password = $<HTMLInputElement>('#reg-pw')?.value ?? '';
  const bio = $<HTMLTextAreaElement>('#reg-bio')?.value.trim() ?? '';
  try {
    const response = await api<{ user: User }>('register', jsonPost({ username, display_name: displayName, password, bio }));
    state.me = response.user;
    state.tab = 'chats';
    state.view = 'main';
    renderApp();
    toast('Your Nura account is ready ✨');
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Unable to create account');
  }
}

async function logout(): Promise<void> {
  stopPoll();
  await api('logout');
  state.me = null;
  state.view = 'main';
  state.tab = 'chats';
  state.chats = [];
  state.messages = [];
  renderApp();
}

async function boot(): Promise<void> {
  try {
    const response = await api<AuthResponse>('me');
    if (response.authenticated && response.user) {
      state.me = response.user;
      renderApp();
      await loadChats();
    } else {
      renderApp();
    }
  } catch (error) {
    renderApp();
    toast(error instanceof Error ? error.message : 'Unable to connect to Nura');
  }
}

async function loadChats(): Promise<void> {
  try {
    const response = await api<GenericResponse>('list_chats');
    state.chats = response.chats ?? [];
    if (state.view !== 'chat') renderChatRows();
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Unable to load chats');
  }
}

async function startDirectChat(userId: number): Promise<void> {
  try {
    const response = await api<{ conversation_id: number }>('create_direct', jsonPost({ user_id: userId }));
    closeModal();
    await loadChats();
    await openChat(response.conversation_id);
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Unable to start conversation');
  }
}

async function searchUsers(query: string, targetSelector = '#users'): Promise<void> {
  const root = document.querySelector<HTMLElement>(targetSelector);
  if (!root) return;
  if (!query.trim()) {
    renderPeopleTo(root, []);
    return;
  }
  try {
    const response = await api<GenericResponse>('search_users', { qs: { q: query } });
    state.users = response.users ?? [];
    if (targetSelector === '#users') renderPeople(state.users);
    else renderPeopleTo(root, state.users);
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Unable to search users');
  }
}

function renderPeopleTo(root: HTMLElement, users: User[]): void {
  if (!users.length) {
    root.innerHTML = '<div class="empty"><i class="ri-user-search-line"></i><h3>Find someone</h3><p>Search by name or username.</p></div>';
    return;
  }
  root.innerHTML = users.map((user) => `
    <button class="person" data-user-id="${user.id}">
      <div class="avatar-wrap"><div class="avatar av-md">${esc((user.display_name || user.username || 'N').slice(0,1).toUpperCase())}${user.avatar_url ? `<img src="${esc(user.avatar_url)}" alt="">` : ''}</div></div>
      <div class="grow"><div class="person-name">${esc(user.display_name)}</div><div class="handle">@${esc(user.username)}</div></div>
      <span class="profile-chip">Message</span>
    </button>
  `).join('');
}

function openNewChat(): void {
  closeModal();
  document.body.insertAdjacentHTML('beforeend', newChatModal());
}

function closeModal(): void {
  document.querySelector('.modal')?.remove();
}

function viewActiveUser(): void {
  const user = state.activeChat?.other;
  if (!user) return;
  closeModal();
  document.body.insertAdjacentHTML('beforeend', userProfileModal(user));
}

async function copyMessage(id: number): Promise<void> {
  const message = state.messages.find((item) => item.id === id);
  if (!message?.body) return;
  try {
    await navigator.clipboard.writeText(message.body);
    document.querySelector('.context')?.remove();
    toast('Message copied');
  } catch {
    toast('Copy is unavailable in this browser');
  }
}

function jsonPost(body: Record<string, unknown>): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

boot();
