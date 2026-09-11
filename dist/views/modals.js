import { state } from '../core/state.js';
import { esc, initials } from '../core/utils.js';
export function newChatModal() {
    return `
    <div class="modal" data-modal="new-chat">
      <div class="sheet">
        <div class="sheet-head">
          <h3>New conversation</h3>
          <button class="iconbtn" data-action="close-modal"><i class="ri-close-line"></i></button>
        </div>
        <div class="search modal-search">
          <i class="ri-search-line muted"></i>
          <input id="newChatSearch" placeholder="Search people...">
        </div>
        <div id="newUsers"></div>
      </div>
    </div>
  `;
}
export function profileEditModal() {
    const user = state.me ?? { id: 0, username: '', display_name: '' };
    return `
    <div class="modal" id="profileModal" data-modal="profile">
      <div class="sheet profile-sheet">
        <div class="sheet-head">
          <div><h3>Edit your profile</h3><p class="sheet-sub">Shape the way people see you.</p></div>
          <button class="iconbtn" data-action="close-modal"><i class="ri-close-line"></i></button>
        </div>
        <div class="profile-edit-media">
          <div class="edit-banner" id="editBannerPreview">${user.banner_url ? `<img src="${esc(user.banner_url)}" alt="">` : '<div class="media-placeholder"><i class="ri-image-line"></i><span>Profile banner</span></div>'}</div>
          <div class="profile-media-row">
            <div class="preview-avatar" id="editAvatarPreview">${user.avatar_url ? `<img src="${esc(user.avatar_url)}" alt="">` : `<span>${initials(user)}</span>`}</div>
            <div class="media-copy"><strong>Profile photo</strong><span>Use a square image for the cleanest result.</span></div>
          </div>
          <div class="media-tools">
            <button data-profile-media="banner"><i class="ri-image-edit-line"></i> Change banner</button>
            <button data-profile-media="avatar"><i class="ri-user-smile-line"></i> Change photo</button>
          </div>
          <input id="mediaPicker" class="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-change="profile-media">
        </div>
        <form id="profileForm" class="form-grid">
          <div class="field"><label for="p-name">Display name</label><input id="p-name" value="${esc(user.display_name || '')}"></div>
          <div class="field"><label for="p-user">Username</label><input id="p-user" value="${esc(user.username || '')}"></div>
          <div class="field"><label for="p-bio">Bio</label><textarea id="p-bio">${esc(user.bio || '')}</textarea></div>
          <div class="field"><label for="p-instagram">Instagram</label><input id="p-instagram" type="url" value="${esc(user.instagram_url || '')}" placeholder="https://instagram.com/..." ></div>
          <div class="field"><label for="p-x">X</label><input id="p-x" type="url" value="${esc(user.x_url || '')}" placeholder="https://x.com/..." ></div>
          <div class="field"><label for="p-linkedin">LinkedIn</label><input id="p-linkedin" type="url" value="${esc(user.linkedin_url || '')}" placeholder="https://linkedin.com/in/..." ></div>
          <div class="field"><label for="p-web">Website</label><input id="p-web" type="url" value="${esc(user.website_url || '')}" placeholder="https://example.com" ></div>
          <button class="btn primary form-submit" type="submit">Save changes</button>
        </form>
      </div>
    </div>
  `;
}
export function userProfileModal(user) {
    const profile = user ?? { id: 0, username: '', display_name: '' };
    const links = [
        profile.instagram_url ? `<a class="social" href="${esc(profile.instagram_url)}" target="_blank" rel="noreferrer">Instagram</a>` : '',
        profile.x_url ? `<a class="social" href="${esc(profile.x_url)}" target="_blank" rel="noreferrer">X</a>` : '',
        profile.linkedin_url ? `<a class="social" href="${esc(profile.linkedin_url)}" target="_blank" rel="noreferrer">LinkedIn</a>` : '',
        profile.website_url ? `<a class="social" href="${esc(profile.website_url)}" target="_blank" rel="noreferrer">Website</a>` : ''
    ].join('');
    return `
    <div class="modal" data-modal="user-profile">
      <div class="sheet center user-profile-sheet">
        <div class="sheet-head"><h3>Profile</h3><button class="iconbtn" data-action="close-modal"><i class="ri-close-line"></i></button></div>
        <div class="profile-hero modal-profile">
          <div class="banner modal-banner">${profile.banner_url ? `<img src="${esc(profile.banner_url)}" alt="">` : ''}</div>
          <div class="profile-head modal-profile-head">
            <div class="profile-avatar-wrap modal-avatar-wrap"><div class="profile-avatar modal-avatar">${profile.avatar_url ? `<img src="${esc(profile.avatar_url)}" alt="">` : `<span>${initials(profile)}</span>`}</div></div>
            <div class="profile-name modal-name">${esc(profile.display_name)}</div>
            <div class="profile-handle">@${esc(profile.username)}</div>
            <p class="bio">${esc(profile.bio || 'No bio yet.')}</p>
            <div class="social-row">${links}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
//# sourceMappingURL=modals.js.map