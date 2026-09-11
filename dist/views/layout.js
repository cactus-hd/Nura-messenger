import { state } from '../core/state.js';
import { avatar, esc, formatTime } from '../core/utils.js';
const logoMarkup = `<img src="assets/logo.png" alt="Nura" class="brand-image">`;
export function shell() {
    const content = state.tab === 'chats' ? chatList() : state.tab === 'discover' ? discover() : profilePreview();
    return `
    <div class="page">
      ${content}
      ${bottomNavigation()}
      ${state.tab === 'chats' ? '<button class="fab" data-action="new-chat" aria-label="New chat"><i class="ri-chat-new-line"></i></button>' : ''}
    </div>
  `;
}
export function bottomNavigation() {
    return `
    <nav class="bottom glass safe-bottom" aria-label="Primary navigation">
      <button class="navbtn ${state.tab === 'chats' ? 'active' : ''}" data-tab="chats">
        <i class="ri-message-3-${state.tab === 'chats' ? 'fill' : 'line'} icon"></i><span>Chats</span>
      </button>
      <button class="navbtn ${state.tab === 'discover' ? 'active' : ''}" data-tab="discover">
        <i class="ri-compass-3-${state.tab === 'discover' ? 'fill' : 'line'} icon"></i><span>Discover</span>
      </button>
      <button class="navbtn ${state.tab === 'profile' ? 'active' : ''}" data-tab="profile">
        ${avatar(state.me, 'av-xs')}<span>Profile</span>
      </button>
    </nav>
  `;
}
export function chatList() {
    return `
    <header class="topbar glass safe-top">
      <div class="toprow">
        <div class="brand">
          <div class="brand-logo">${logoMarkup}</div>
          <div>
            <strong>Nura</strong>
            <div class="sub">Messages, but more you.</div>
          </div>
        </div>
        <div class="toolbar-actions">
          <button class="iconbtn" data-action="refresh-chats" title="Refresh"><i class="ri-refresh-line"></i></button>
          <button class="iconbtn" data-action="new-chat" title="New chat"><i class="ri-edit-2-line"></i></button>
        </div>
      </div>
      <div class="search">
        <i class="ri-search-line muted"></i>
        <input id="chatSearch" value="${esc(state.search)}" placeholder="Search chats" aria-label="Search chats">
      </div>
    </header>
    <section class="page-head">
      <div class="eyebrow">MESSAGES</div>
      <div class="title">Your conversations</div>
      <div class="subtitle">Private by default. Social when you want it.</div>
    </section>
    <main id="chatRows" class="chat-list"></main>
  `;
}
export function renderChatRows() {
    const root = document.querySelector('#chatRows');
    if (!root)
        return;
    const query = state.search.trim().toLowerCase();
    const rows = state.chats.filter((chat) => {
        const name = chat.other?.display_name || chat.title || '';
        const body = chat.last_body || '';
        return !query || `${name} ${body}`.toLowerCase().includes(query);
    });
    root.innerHTML = rows.length
        ? rows.map(chatRow).join('')
        : emptyState('ri-message-3-line', 'No conversations yet', 'Tap the new chat button and find someone on Nura.');
}
function chatRow(chat) {
    const label = chat.other?.display_name || chat.title || 'Conversation';
    const preview = chat.last_type === 'image'
        ? '📷 Photo'
        : chat.last_type === 'file'
            ? '📎 File'
            : chat.last_type === 'audio'
                ? '🎙 Voice message'
                : esc(chat.last_body || 'Start a conversation');
    return `
    <button class="chat-row" data-chat-id="${chat.id}">
      ${avatar(chat.other || { display_name: chat.title || 'Nura' }, 'av-md')}
      <div class="meta">
        <div class="chat-line">
          <div class="chat-name">${esc(label)}</div>
          <div class="chat-time">${formatTime(chat.last_message_at || chat.created_at)}</div>
        </div>
        <div class="chat-line">
          <div class="last">${preview}</div>
          ${chat.unread ? `<span class="badge">${chat.unread > 99 ? '99+' : chat.unread}</span>` : ''}
        </div>
      </div>
    </button>
  `;
}
function discover() {
    return `
    <section class="page-head discover-head">
      <div class="eyebrow">DISCOVER</div>
      <div class="title">People you may like</div>
      <div class="subtitle">Find someone by display name or @username and start a private chat.</div>
      <div class="search discover-search">
        <i class="ri-user-search-line muted"></i>
        <input id="userSearch" placeholder="Search people" aria-label="Search people">
      </div>
    </section>
    <main class="people" id="users">
      ${emptyState('ri-user-search-line', 'Find someone', 'Search by name or username.')}
    </main>
  `;
}
export function renderPeople(users) {
    const root = document.querySelector('#users');
    if (!root)
        return;
    root.innerHTML = users.length
        ? users.map((user) => `
      <button class="person" data-user-id="${user.id}">
        ${avatar(user, 'av-md')}
        <div class="grow">
          <div class="person-name">${esc(user.display_name)}</div>
          <div class="handle">@${esc(user.username)}</div>
        </div>
        <span class="profile-chip">Message</span>
      </button>
    `).join('')
        : emptyState('ri-search-eye-line', 'No people found', 'Try another name or username.');
}
export function profilePreview() {
    const user = state.me ?? { id: 0, username: '', display_name: '' };
    const links = [
        user.instagram_url ? `<a class="social" href="${esc(user.instagram_url)}" target="_blank" rel="noreferrer"><i class="ri-instagram-line"></i> Instagram</a>` : '',
        user.x_url ? `<a class="social" href="${esc(user.x_url)}" target="_blank" rel="noreferrer"><i class="ri-twitter-x-line"></i> X</a>` : '',
        user.linkedin_url ? `<a class="social" href="${esc(user.linkedin_url)}" target="_blank" rel="noreferrer"><i class="ri-linkedin-line"></i> LinkedIn</a>` : '',
        user.website_url ? `<a class="social" href="${esc(user.website_url)}" target="_blank" rel="noreferrer"><i class="ri-global-line"></i> Website</a>` : ''
    ].join('');
    return `
    <section class="profile">
      <div class="profile-hero">
        <div class="banner">${user.banner_url ? `<img src="${esc(user.banner_url)}" alt="Profile banner">` : ''}</div>
        <div class="profile-head">
          <div class="profile-avatar-wrap">
            <div class="profile-avatar">
              ${user.avatar_url ? `<img src="${esc(user.avatar_url)}" alt="${esc(user.display_name)}">` : `<span>${esc((user.display_name || 'N').slice(0, 1).toUpperCase())}</span>`}
            </div>
            <span class="profile-status"></span>
          </div>
          <div class="profile-name">${esc(user.display_name || 'Your name')}</div>
          <div class="profile-handle">@${esc(user.username || 'username')}</div>
          <p class="bio">${esc(user.bio || 'Tell people something about you.')}</p>
          <div class="social-row">${links}</div>
          <div class="profile-actions">
            <button class="btn primary" data-action="edit-profile"><i class="ri-edit-2-line"></i>Edit profile</button>
            <button class="btn ghost-btn" data-action="logout"><i class="ri-logout-box-r-line"></i>Sign out</button>
          </div>
        </div>
      </div>
      <div class="section">
        <div class="section-title"><span>Profile identity</span><span class="muted section-tag">Nura</span></div>
        <div class="settings-card">
          <div class="settings-row"><i class="ri-at-line"></i><div class="grow"><b>@${esc(user.username || '')}</b><small class="muted">Your public handle</small></div></div>
          <div class="settings-row"><i class="ri-user-3-line"></i><div class="grow"><b>${esc(user.display_name || '')}</b><small class="muted">How people see you</small></div></div>
          <div class="settings-row"><i class="ri-sparkling-line"></i><div class="grow"><b>Express yourself</b><small class="muted">Banner, avatar, bio and social links</small></div></div>
        </div>
      </div>
    </section>
  `;
}
function emptyState(icon, title, body) {
    return `<div class="empty"><i class="${icon}"></i><h3>${title}</h3><p>${body}</p></div>`;
}
//# sourceMappingURL=layout.js.map