export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => Array.from(document.querySelectorAll(selector));
export function setHtml(selector, html) {
    const node = $(selector);
    if (node)
        node.innerHTML = html;
}
export function focusLater(selector) {
    requestAnimationFrame(() => $(selector)?.focus());
}
//# sourceMappingURL=dom.js.map