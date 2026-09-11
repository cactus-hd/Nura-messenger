export const $ = <T extends Element = HTMLElement>(selector: string): T | null =>
  document.querySelector<T>(selector);

export const $$ = <T extends Element = HTMLElement>(selector: string): T[] =>
  Array.from(document.querySelectorAll<T>(selector));

export function setHtml(selector: string, html: string): void {
  const node = $(selector);
  if (node) node.innerHTML = html;
}

export function focusLater(selector: string): void {
  requestAnimationFrame(() => $(<string>selector)?.focus());
}
