import type { User } from './types.js';

export function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[char] ?? char);
}

export function initials(user: Partial<User> | null | undefined): string {
  return esc((user?.display_name || user?.username || 'N').slice(0, 1).toUpperCase());
}

export function isOnline(user: Partial<User> | null | undefined): boolean {
  return Boolean(user?.last_seen && Date.now() - Date.parse(user.last_seen) < 120_000);
}

export function avatar(user: Partial<User> | null | undefined, className = 'av-md'): string {
  const image = user?.avatar_url ? `<img src="${esc(user.avatar_url)}" alt="">` : '';
  const dot = isOnline(user) ? '<span class="online-dot" aria-label="Online"></span>' : '';
  return `<div class="avatar-wrap"><div class="avatar ${className}">${initials(user)}${image}</div>${dot}</div>`;
}

export function formatTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function dateLabel(value: string): string {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

export function messageSignature(messages: Array<{ id: number; edited_at?: string | null; is_pinned?: boolean }>): string {
  return messages.map((message) => `${message.id}:${message.edited_at ?? ''}:${message.is_pinned ? 1 : 0}`).join('|');
}

export function scrollToBottom(element: HTMLElement, behavior: ScrollBehavior = 'smooth'): void {
  element.scrollTo({ top: element.scrollHeight, behavior });
}

export function toast(message: string): void {
  const element = document.querySelector<HTMLElement>('#toast');
  if (!element) return;
  element.textContent = message;
  element.classList.add('show');
  const fn = toast as typeof toast & { timer: number };
  window.clearTimeout(fn.timer);
  fn.timer = window.setTimeout(() => element.classList.remove('show'), 2200);
}

(toast as typeof toast & { timer: number }).timer = 0;

