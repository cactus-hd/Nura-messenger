export function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[char] ?? char);
}
export function initials(user) {
    return esc((user?.display_name || user?.username || 'N').slice(0, 1).toUpperCase());
}
export function isOnline(user) {
    return Boolean(user?.last_seen && Date.now() - Date.parse(user.last_seen) < 120_000);
}
export function avatar(user, className = 'av-md') {
    const image = user?.avatar_url ? `<img src="${esc(user.avatar_url)}" alt="">` : '';
    const dot = isOnline(user) ? '<span class="online-dot" aria-label="Online"></span>' : '';
    return `<div class="avatar-wrap"><div class="avatar ${className}">${initials(user)}${image}</div>${dot}</div>`;
}
export function formatTime(value) {
    if (!value)
        return '';
    const date = new Date(value);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
export function dateLabel(value) {
    const date = new Date(value);
    const now = new Date();
    if (date.toDateString() === now.toDateString())
        return 'Today';
    return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}
export function messageSignature(messages) {
    return messages.map((message) => `${message.id}:${message.edited_at ?? ''}:${message.is_pinned ? 1 : 0}`).join('|');
}
export function scrollToBottom(element, behavior = 'smooth') {
    element.scrollTo({ top: element.scrollHeight, behavior });
}
export function toast(message) {
    const element = document.querySelector('#toast');
    if (!element)
        return;
    element.textContent = message;
    element.classList.add('show');
    const fn = toast;
    window.clearTimeout(fn.timer);
    fn.timer = window.setTimeout(() => element.classList.remove('show'), 2200);
}
toast.timer = 0;
//# sourceMappingURL=utils.js.map