/**
 * The smallest possible DOM helper.
 *
 * All UI is HTML over the canvas. three.js has no text and no widgets, and
 * building either would be days spent on something the browser already does
 * better: real font rendering at any zoom, real hit testing, and a menu a
 * screen reader can read. The stage is scaled as one unit (see index.html), so
 * a panel positioned at 28 px here is at 28 px of the 1280 x 720 design frame
 * in every window size.
 */

export type Style = Partial<CSSStyleDeclaration>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: Style,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Absolutely positioned text, in design pixels from the top left. */
export function label(x: number, y: number, style: Style, text = ''): HTMLDivElement {
  return el(
    'div',
    {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      whiteSpace: 'pre',
      /*
       * Not decoration. Chapter I's hint line is #4c5357 and a lit wall is
       * #454d54, so without this the controls vanish whenever a column passes
       * behind them — and the one thing a judge must always be able to read is
       * how to play. Every chapter has a different palette, so no single text
       * colour is safe against all of them; a shadow is.
       */
      textShadow: '0 1px 4px rgba(0, 0, 0, 0.95)',
      ...style,
    },
    text,
  );
}

export function css(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}

export const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
export const SANS = 'ui-sans-serif, system-ui, -apple-system, sans-serif';
export const SERIF = 'ui-serif, Georgia, serif';
