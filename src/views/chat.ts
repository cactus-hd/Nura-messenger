import { state } from '../core/state.js';
import { avatar, dateLabel, esc, formatTime } from '../core/utils.js';
import type { Message } from '../core/types.js';

export function chatPage(): string {
  const chat = state.activeChat;
  const user = chat?.other ?? null;
  const title = user?.display_name || chat?.title || 'Conversation';
  const online = user?.last_seen && Date.now() - Date.parse(user.last_seen) < 120_000;

  return `
    <div class="chat-page">
      <header class="chat-headbar safe-top">
        <button class="iconbtn" data-action="close-chat" aria-label="Back"><i class="ri-arrow-left-line"></i></button>
        ${avatar(user, 'av-sm')}
        <div class="chat-user"><strong>${esc(title)}</strong><small>${online ? 'online' : user?.last_seen ? `last seen ${formatTime(user.last_seen)}` : 'Nura user'}</small></div>
        <button class="iconbtn" data-action="view-user" aria-label="View profile"><i class="ri-information-line"></i></button>
      </header>
      <main class="messages" id="messages" aria-live="polite"></main>
      <div class="composer-wrap">
        <div id="typing" class="typing hidden">typing…</div>
        ${state.replyTo ? replyBar('Replying to', state.replyTo.reply_sender || 'User', state.replyTo.body || state.replyTo.attachment_name || 'Attachment', 'clear-reply', 'ri-reply-line') : ''}
        ${state.editing ? replyBar('Editing message', '', state.editing.body || '', 'cancel-edit', 'ri-edit-line') : ''}
        <div class="composer">
          <input id="chat-file" class="hidden" type="file" accept="image/png,image/jpeg,image/webp,application/pdf,text/plain" data-change="chat-media">
          <button class="compose-btn" data-action="attach-chat-file" title="Attach"><i class="ri-add-line"></i></button>
          <button class="compose-btn" data-action="toggle-emoji" title="Emoji"><i class="ri-emotion-line"></i></button>
          <textarea id="composerText" rows="1" placeholder="${state.editing ? 'Edit your message…' : `Message ${esc(title)}…`}" aria-label="Message"></textarea>
          <button class="compose-btn" id="voiceBtn" data-action="toggle-voice" title="Voice"><i class="ri-mic-line"></i></button>
          <button class="compose-btn send-btn" data-action="send-message" title="Send"><i class="ri-send-plane-2-fill"></i></button>
        </div>
        ${state.emojiOpen ? emojiPanel() : ''}
      </div>
    </div>
  `;
}

function replyBar(label: string, author: string, body: string, action: string, icon: string): string {
  return `
    <div class="reply-bar">
      <i class="${icon}" style="color:var(--primary)"></i>
      <div class="grow"><b>${label}${author ? ` ${esc(author)}` : ''}</b><span>${esc(body)}</span></div>
      <button class="iconbtn reply-dismiss" data-action="${action}" aria-label="Close"><i class="ri-close-line"></i></button>
    </div>
  `;
}

function emojiPanel(): string {
  const emojis = ['😀','😂','🥹','😍','🥰','😘','😎','🤍','🩷','❤️','🔥','✨','🎉','😮','😢','😡','👍','👎','👏','🙏','🤝','💯','🚀','☕','🎧','🎸','🫶','👀','💀','😭','🤌','🫡'];
  return `<div class="emoji-panel glass-light">${emojis.map((emoji) => `<button type="button" data-emoji="${emoji}">${emoji}</button>`).join('')}</div>`;
}

export function renderMessages(options: { preserveScroll?: boolean } = {}): void {
  const root = document.querySelector<HTMLElement>('#messages');
  if (!root) return;

  const wasNearBottom = root.scrollHeight - root.scrollTop - root.clientHeight < 80;
  let lastDate = '';

  root.innerHTML = state.messages.length
    ? state.messages.map((message) => {
      const label = dateLabel(message.created_at);
      const separator = label !== lastDate ? ((lastDate = label), `<div class="date-chip">${label}</div>`) : '';
      return separator + messageMarkup(message);
    }).join('')
    : `<div class="empty"><i class="ri-chat-3-line"></i><h3>No messages yet</h3><p>Send the first little hello.</p></div>`;

  if (!options.preserveScroll || wasNearBottom) {
    root.scrollTop = root.scrollHeight;
  }
}

function messageMarkup(message: Message): string {
  let body = '';
  if (message.reply_to_id && message.reply_body) {
    body += `<div class="reply-preview"><b>${esc(message.reply_sender || 'Reply')}</b><span>${esc(message.reply_body)}</span></div>`;
  }
  if (message.message_type === 'image' && message.attachment_url) {
    body += `<img class="attach-img" src="${esc(message.attachment_url)}" alt="Shared image">`;
  } else if (message.message_type === 'file' && message.attachment_url) {
    body += `<a class="file-pill" href="${esc(message.attachment_url)}" target="_blank" rel="noreferrer"><i class="ri-file-3-line"></i><span>${esc(message.attachment_name || 'File')}</span></a>`;
  } else if (message.message_type === 'audio' && message.attachment_url) {
    body += `<div class="audio-row"><i class="ri-mic-2-line"></i><audio controls src="${esc(message.attachment_url)}"></audio></div>`;
  }
  if (message.body) body += `<div>${esc(message.body).replace(/\n/g, '<br>')}</div>`;

  return `
    <article class="msg ${message.mine ? 'mine' : 'theirs'}" data-message-id="${message.id}">
      <div class="bubble">
        ${message.is_pinned ? '<span class="pin-mini"><i class="ri-pushpin-fill"></i></span>' : ''}
        ${body}
      </div>
      <div class="msg-time">${formatTime(message.created_at)} ${message.edited_at ? '· edited' : ''} ${message.mine ? '<span class="read-check">✓✓</span>' : ''}</div>
    </article>
  `;
}

export function renderContextMenu(message: Message, x: number, y: number): void {
  document.querySelector('.context')?.remove();
  const actions = [
    actionButton('reply-message', message.id, 'ri-reply-line', 'Reply'),
    actionButton('copy-message', message.id, 'ri-file-copy-line', 'Copy'),
    actionButton('toggle-pin', message.id, 'ri-pushpin-line', message.is_pinned ? 'Unpin' : 'Pin')
  ];

  if (message.mine && message.message_type === 'text') {
    actions.push(actionButton('edit-message', message.id, 'ri-edit-2-line', 'Edit'));
  }
  if (message.mine) {
    actions.push(actionButton('delete-message', message.id, 'ri-delete-bin-line', 'Delete', 'danger'));
  }

  const menu = document.createElement('div');
  menu.className = 'context';
  menu.innerHTML = actions.join('');
  menu.style.left = `${Math.min(x, window.innerWidth - 210)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - 250)}px`;
  document.body.appendChild(menu);

  window.setTimeout(() => {
    const remove = () => menu.remove();
    document.addEventListener('click', remove, { once: true });
  }, 0);
}

function actionButton(action: string, id: number, icon: string, label: string, extra = ''): string {
  return `<button class="${extra}" data-message-action="${action}" data-message-id="${id}"><i class="${icon}"></i>${label}</button>`;
}
