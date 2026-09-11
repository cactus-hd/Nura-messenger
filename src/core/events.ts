export const RENDER_EVENT = 'nura:render';

export function requestRender(): void {
  window.dispatchEvent(new Event(RENDER_EVENT));
}
