import { api } from '../core/api.js';
import { $ } from '../core/dom.js';
import { state } from '../core/state.js';
import { toast } from '../core/utils.js';
import { requestRender } from '../core/events.js';
import { profileEditModal } from '../views/modals.js';

export async function saveProfile(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  try {
    const response = await api<{ user: NonNullable<typeof state.me> }>('update_profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: $<HTMLInputElement | HTMLTextAreaElement>('#p-user')?.value.trim(),
        display_name: $<HTMLInputElement | HTMLTextAreaElement>('#p-name')?.value.trim(),
        bio: $<HTMLInputElement | HTMLTextAreaElement>('#p-bio')?.value.trim(),
        instagram_url: $<HTMLInputElement | HTMLTextAreaElement>('#p-instagram')?.value.trim(),
        x_url: $<HTMLInputElement | HTMLTextAreaElement>('#p-x')?.value.trim(),
        linkedin_url: $<HTMLInputElement | HTMLTextAreaElement>('#p-linkedin')?.value.trim(),
        website_url: $<HTMLInputElement | HTMLTextAreaElement>('#p-web')?.value.trim()
      })
    });
    state.me = response.user;
    closeModal();
    requestRender();
    toast('Profile saved');
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Unable to save profile');
  }
}

export async function uploadProfileMedia(file: File): Promise<void> {
  try {
    const data = new FormData();
    data.append('kind', state.selectedProfileMedia);
    data.append('file', file);
    await api('upload_profile_media', { method: 'POST', body: data });
    const response = await api<{ user: NonNullable<typeof state.me> }>('me');
    state.me = response.user;
    closeModal();
    requestRender();
    toast(state.selectedProfileMedia === 'banner' ? 'Banner updated' : 'Avatar updated');
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Unable to upload media');
  }
}

export function openProfileEdit(): void {
  document.body.insertAdjacentHTML('beforeend', profileEditModal());
}

function closeModal(): void {
  document.querySelector('.modal')?.remove();
}
