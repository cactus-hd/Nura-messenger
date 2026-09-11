import { api } from '../core/api.js';
import { $ } from '../core/dom.js';
import { state } from '../core/state.js';
import { esc, messageSignature, scrollToBottom, toast } from '../core/utils.js';
import { renderContextMenu, renderMessages } from '../views/chat.js';
import { requestRender } from '../core/events.js';
import type { ChatResponse, Message } from '../core/types.js';

let lastMessageSignature = '';
let touchTimer: number | null = null;

export async function openChat(id: number): Promise<void> {
  try {
    const summary = state.chats.find((chat) => chat.id === id);
    state.activeChat = summary ?? { id, created_at: new Date().toISOString() };
    const response = await api<ChatResponse>('chat', { qs: { id } });
    if (!state.activeChat.other) {
      await loadChatsSilently();
      state.activeChat = state.chats.find((chat) => chat.id === id) ?? state.activeChat;
    }
    state.messages = response.messages ?? [];
    lastMessageSignature = messageSignature(state.messages);
    state.view = 'chat';
    state.replyTo = null;
    state.editing = null;
    requestRender();
    startPoll();
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Unable to open conversation');
  }
}

export function closeChat(): void {
  stopPoll();
  state.view = 'main';
  state.activeChat = null;
  state.replyTo = null;
  state.editing = null;
  state.emojiOpen = false;
  requestRender();
}

export async function refreshChat(): Promise<void> {
  await pollChat(true);
}

export async function pollChat(force = false): Promise<void> {
  if (!state.activeChat || (document.visibilityState === 'hidden' && !force)) return;
  try {
    const response = await api<ChatResponse>('chat', { qs: { id: state.activeChat.id } });
    const next = response.messages ?? [];
    const signature = messageSignature(next);
    if (signature === lastMessageSignature && !force) return;

    const root = $('#messages');
    const shouldKeepScroll = Boolean(root && root.scrollHeight - root.scrollTop - root.clientHeight >= 80);
    state.messages = next;
    lastMessageSignature = signature;

    if (root && !force) {
      renderMessages({ preserveScroll: shouldKeepScroll });
    } else if (state.view === 'chat') {
      requestRender();
    }
  } catch {
    // Polling failures are intentionally silent. The next cycle retries.
  }
}

export function startPoll(): void {
  stopPoll();
  state.poll = window.setInterval(() => void pollChat(), 3000);
}

export function stopPoll(): void {
  if (state.poll !== null) window.clearInterval(state.poll);
  state.poll = null;
}

export function onVisibilityChange(): void {
  if (document.visibilityState === 'visible' && state.view === 'chat') void pollChat(true);
}

export function attachMessageInteractions(): void {
  const messages = $('#messages');
  if (!messages) return;

  messages.addEventListener('contextmenu', (event) => {
    const target = event.target as HTMLElement;
    const article = target.closest<HTMLElement>('[data-message-id]');
    if (!article) return;
    const id = Number(article.dataset.messageId);
    const message = state.messages.find((item) => item.id === id);
    if (message) renderContextMenu(message, event.clientX, event.clientY);
  });

  messages.addEventListener('touchstart', (event) => {
    const target = event.target as HTMLElement;
    const article = target.closest<HTMLElement>('[data-message-id]');
    if (!article) return;
    const id = Number(article.dataset.messageId);
    touchTimer = window.setTimeout(() => {
      const message = state.messages.find((item) => item.id === id);
      if (message) renderContextMenu(message, window.innerWidth / 2 - 100, window.innerHeight / 2);
    }, 520);
  }, { passive: true });

  messages.addEventListener('touchend', () => {
    if (touchTimer !== null) window.clearTimeout(touchTimer);
    touchTimer = null;
  });
}

export function beginReply(id: number): void {
  const message = state.messages.find((item) => item.id === id);
  if (!message) return;
  state.replyTo = message;
  state.editing = null;
  removeContextMenu();
  requestRender();
  requestAnimationFrame(() => $<HTMLTextAreaElement>('#composerText')?.focus());
}

export function clearReply(): void {
  state.replyTo = null;
  requestRender();
}

export function beginEdit(id: number): void {
  const message = state.messages.find((item) => item.id === id);
  if (!message) return;
  state.editing = message;
  state.replyTo = null;
  removeContextMenu();
  requestRender();
  requestAnimationFrame(() => {
    const input = $<HTMLTextAreaElement>('#composerText');
    if (input) {
      input.value = message.body || '';
      input.style.height = '42px';
      input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
      input.focus();
    }
  });
}

export function cancelEdit(): void {
  state.editing = null;
  requestRender();
}

export async function togglePin(id: number): Promise<void> {
  removeContextMenu();
  try {
    const response = await api<{ pinned: boolean }>('toggle_pin', jsonPost({ message_id: id }));
    await pollChat(true);
    toast(response.pinned ? 'Pinned message' : 'Unpinned message');
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Unable to change pin');
  }
}

export async function deleteMessage(id: number): Promise<void> {
  removeContextMenu();
  if (!window.confirm('Delete this message?')) return;
  try {
    await api('delete_message', jsonPost({ message_id: id }));
    await pollChat(true);
    toast('Message deleted');
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Unable to delete message');
  }
}

export async function sendMessage(): Promise<void> {
  const input = $<HTMLTextAreaElement>('#composerText');
  if (!input || !state.activeChat) return;
  const body = input.value.trim();
  if (!body) return;

  try {
    if (state.editing) {
      await api('edit_message', jsonPost({ message_id: state.editing.id, body }));
      state.editing = null;
    } else {
      await api('send_message', jsonPost({
        conversation_id: state.activeChat.id,
        body,
        message_type: 'text',
        reply_to_id: state.replyTo?.id ?? null
      }));
      state.replyTo = null;
    }
    input.value = '';
    input.style.height = '42px';
    state.emojiOpen = false;
    await pollChat(true);
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Unable to send message');
  }
}

export async function sendSelectedFile(file: File): Promise<void> {
  if (!state.activeChat) return;
  try {
    const data = new FormData();
    data.append('conversation_id', String(state.activeChat.id));
    data.append('file', file);
    await api('upload_chat_media', { method: 'POST', body: data });
    await pollChat(true);
    toast('Attachment sent');
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Unable to send attachment');
  }
}

export async function toggleVoice(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    toast('Voice recording is not supported here');
    return;
  }
  if (state.recording) {
    state.recording.stop();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    state.recording = recorder;
    state.recordChunks = [];

    const voiceButton = $<HTMLButtonElement>('#voiceBtn');
    if (voiceButton) voiceButton.innerHTML = '<i class="ri-stop-circle-line"></i>';

    recorder.ondataavailable = (event) => {
      if (event.data.size) state.recordChunks.push(event.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      state.recording = null;
      const chunks = [...state.recordChunks];
      state.recordChunks = [];
      const button = $<HTMLButtonElement>('#voiceBtn');
      if (button) button.innerHTML = '<i class="ri-mic-line"></i>';
      const blob = new Blob(chunks, { type: mime });
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      await sendSelectedFile(file);
    };

    recorder.start();
    toast('Recording… tap mic again to stop');
  } catch {
    toast('Microphone permission was denied');
  }
}

export function toggleEmoji(): void {
  state.emojiOpen = !state.emojiOpen;
  requestRender();
  requestAnimationFrame(() => $<HTMLTextAreaElement>('#composerText')?.focus());
}

export function insertEmoji(emoji: string): void {
  const input = $<HTMLTextAreaElement>('#composerText');
  if (!input) return;
  input.value += emoji;
  input.style.height = '42px';
  input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
  input.focus();
}

export function autoGrow(input: HTMLTextAreaElement): void {
  input.style.height = '42px';
  input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
}

export function composerKey(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    void sendMessage();
  }
}

async function loadChatsSilently(): Promise<void> {
  const response = await api('list_chats');
  state.chats = response.chats ?? [];
}

function jsonPost(body: Record<string, unknown>): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function removeContextMenu(): void {
  document.querySelector('.context')?.remove();
}
