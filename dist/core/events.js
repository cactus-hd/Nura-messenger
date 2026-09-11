export const RENDER_EVENT = 'nura:render';
export function requestRender() {
    window.dispatchEvent(new Event(RENDER_EVENT));
}
//# sourceMappingURL=events.js.map