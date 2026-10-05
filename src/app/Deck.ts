/**
 * A slide deck, nearly full screen, over a building that waits for it.
 *
 * The keys are the ones every presentation program has, plus the two a
 * presenter's clicker sends (PAGE UP / PAGE DOWN), so a talk given from
 * inside the game can be given with the clicker in your hand. G shows every
 * slide at once to jump about; N shows the speaker's notes; B blacks the
 * screen; F makes the whole page full screen.
 *
 * It takes the keyboard for itself while it is up: a keydown listener in the
 * CAPTURE phase on the window, which runs before `Keyboard`'s and stops the
 * event there. Otherwise ESC would open the pause menu behind the deck, TAB
 * would swap robots, and the arrows would drive one off the stage. Key-ups
 * still go through, so a key held when the deck opened is let go of cleanly.
 */

import { slideImage, type Deck, type Slide } from '@/decks';
import { el, MONO, SANS, type Style } from './dom';

/** Margin round the deck, design pixels. The building shows through it, held. */
const INSET = 18;
/** A drag this long, design pixels, is a swipe rather than a tap. */
const SWIPE = 50;

export class DeckView {
  private readonly root: HTMLDivElement;
  private readonly surface: HTMLDivElement;
  private readonly counter: HTMLDivElement;
  private readonly bar: HTMLDivElement;
  private readonly notes: HTMLDivElement;
  private readonly grid: HTMLDivElement;
  private readonly black: HTMLDivElement;

  private at = 0;
  /** Bullets showing on a `build` slide. */
  private step = 0;
  private showNotes = false;
  private gridAt = -1;
  private downX = 0;
  private downY = 0;

  constructor(
    host: HTMLElement,
    private readonly deck: Deck,
    private readonly options: {
      /** Something above the deck has the keys, the pause menu. */
      blocked: () => boolean;
      onClose: () => void;
    },
  ) {
    this.root = el('div', {
      position: 'absolute',
      inset: `${INSET}px`,
      display: 'none',
      overflow: 'hidden',
      borderRadius: '8px',
      background: '#000',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 12px 60px rgba(0,0,0,0.8)',
      // Over the HUD and the dialogue box, under the pause menu (8).
      zIndex: '7',
      userSelect: 'none',
      touchAction: 'none',
    });
    this.surface = el('div', { position: 'absolute', inset: '0' });
    this.bar = el('div', {
      position: 'absolute',
      left: '0',
      bottom: '0',
      height: '3px',
      background: 'rgba(255,255,255,0.55)',
      transition: 'width 200ms ease-out',
    });
    this.counter = el('div', {
      position: 'absolute',
      right: '14px',
      bottom: '10px',
      font: `12px ${MONO}`,
      color: 'rgba(255,255,255,0.55)',
      textShadow: '0 1px 3px rgba(0,0,0,0.9)',
      pointerEvents: 'none',
    });
    this.notes = el('div', {
      position: 'absolute',
      left: '0',
      right: '0',
      bottom: '0',
      display: 'none',
      padding: '14px 22px 22px',
      background: 'rgba(6, 8, 10, 0.92)',
      borderTop: '1px solid rgba(255,255,255,0.15)',
      font: `17px ${SANS}`,
      color: '#d8dee2',
      whiteSpace: 'pre-wrap',
    });
    this.grid = el('div', {
      position: 'absolute',
      inset: '0',
      display: 'none',
      gridTemplateColumns: 'repeat(4, 1fr)',
      alignContent: 'start',
      gap: '14px',
      padding: '22px',
      overflowY: 'auto',
      background: 'rgba(6, 8, 10, 0.96)',
    });
    this.black = el('div', { position: 'absolute', inset: '0', display: 'none', background: '#000' });

    this.root.append(this.surface, this.bar, this.counter, this.notes, this.chrome(), this.grid, this.black);
    this.root.addEventListener('pointerdown', this.onDown);
    this.root.addEventListener('pointerup', this.onUp);
    host.append(this.root);
    window.addEventListener('keydown', this.onKey, true);
  }

  get isOpen(): boolean {
    return this.root.style.display !== 'none';
  }

  /** Up, at the slide it was left on: a talk interrupted is a talk resumed. */
  open(): void {
    this.root.style.display = 'block';
    this.render();
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.style.display = 'none';
    this.grid.style.display = 'none';
    this.black.style.display = 'none';
    this.options.onClose();
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKey, true);
    this.root.remove();
  }

  // -- moving ---------------------------------------------------------------

  private get slides(): Slide[] {
    return this.deck.slides;
  }

  private next(): void {
    const slide = this.slides[this.at];
    if (slide?.build && slide.bullets && this.step < slide.bullets.length) {
      this.step += 1;
      this.render(false);
      return;
    }
    if (this.at < this.slides.length - 1) this.go(this.at + 1);
  }

  private back(): void {
    const slide = this.slides[this.at];
    if (slide?.build && this.step > 0) {
      this.step -= 1;
      this.render(false);
      return;
    }
    if (this.at > 0) this.go(this.at - 1, true);
  }

  /** To a slide. Arriving backwards on a `build` slide arrives with it built. */
  private go(index: number, fromAfter = false): void {
    this.at = Math.max(0, Math.min(this.slides.length - 1, index));
    const slide = this.slides[this.at];
    this.step = fromAfter && slide?.build ? (slide.bullets?.length ?? 0) : 0;
    this.render();
  }

  // -- input ----------------------------------------------------------------

  private readonly onKey = (event: KeyboardEvent): void => {
    if (!this.isOpen || this.options.blocked()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat && !/Arrow|Page/.test(event.code)) return;

    if (this.grid.style.display !== 'none') {
      this.gridKey(event.code);
      return;
    }
    // Any key brings a blacked-out screen back, as it does in every program.
    if (this.black.style.display !== 'none') {
      this.black.style.display = 'none';
      return;
    }
    switch (event.code) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case 'Space':
      case 'Enter':
      case 'KeyE':
        this.next();
        return;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      case 'Backspace':
        this.back();
        return;
      case 'Home':
        this.go(0);
        return;
      case 'End':
        this.go(this.slides.length - 1, true);
        return;
      case 'KeyG':
        this.openGrid();
        return;
      case 'KeyN':
        this.showNotes = !this.showNotes;
        this.render(false);
        return;
      case 'KeyB':
      case 'Period':
        this.black.style.display = 'block';
        return;
      case 'KeyF':
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.();
        return;
      case 'Escape':
      case 'KeyQ':
        this.close();
        return;
    }
  };

  private readonly onDown = (event: PointerEvent): void => {
    this.downX = event.clientX;
    this.downY = event.clientY;
  };

  /**
   * A swipe pages; a tap on the right two thirds goes on and the left third
   * goes back, the way a phone's stories do. Taps on the buttons and the
   * overview are theirs, not this.
   */
  private readonly onUp = (event: PointerEvent): void => {
    if (event.target instanceof Element && event.target.closest('button, [data-thumb]')) return;
    if (this.grid.style.display !== 'none') return;
    if (this.black.style.display !== 'none') {
      this.black.style.display = 'none';
      return;
    }
    const dx = event.clientX - this.downX;
    const dy = event.clientY - this.downY;
    // Client pixels against design pixels: the stage is scaled as a whole.
    const scale = this.root.getBoundingClientRect().width / this.root.offsetWidth || 1;
    if (Math.abs(dx) > SWIPE * scale && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) this.next();
      else this.back();
      return;
    }
    const box = this.root.getBoundingClientRect();
    if (event.clientX - box.left < box.width / 3) this.back();
    else this.next();
  };

  // -- the overview ---------------------------------------------------------

  private openGrid(): void {
    this.gridAt = this.at;
    this.grid.replaceChildren(
      ...this.slides.map((slide, index) => {
        const thumb = el('div', {
          position: 'relative',
          aspectRatio: '16 / 9',
          overflow: 'hidden',
          borderRadius: '4px',
          cursor: 'pointer',
          background: slide.color ?? '#101418',
          outline: '2px solid transparent',
          outlineOffset: '2px',
        });
        thumb.dataset.thumb = String(index);
        const url = slide.background ? slideImage(slide.background) : undefined;
        if (url) {
          Object.assign(thumb.style, { backgroundImage: `url("${url}")`, backgroundSize: 'cover', backgroundPosition: 'center' });
        }
        thumb.append(
          el(
            'div',
            {
              position: 'absolute',
              left: '0',
              right: '0',
              bottom: '0',
              padding: '18px 8px 6px',
              font: `12px ${SANS}`,
              color: '#eef2f4',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
            `${index + 1}  ${slide.title ?? ''}`,
          ),
        );
        thumb.addEventListener('click', () => {
          this.grid.style.display = 'none';
          this.go(index);
        });
        return thumb;
      }),
    );
    this.grid.style.display = 'grid';
    this.markGrid();
  }

  private gridKey(code: string): void {
    const columns = 4;
    const n = this.slides.length;
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns };
    if (code in moves) {
      this.gridAt = Math.max(0, Math.min(n - 1, this.gridAt + moves[code]));
      this.markGrid();
    } else if (code === 'Enter' || code === 'Space' || code === 'KeyE') {
      this.grid.style.display = 'none';
      this.go(this.gridAt);
    } else if (code === 'KeyG' || code === 'Escape') {
      this.grid.style.display = 'none';
    }
  }

  private markGrid(): void {
    [...this.grid.children].forEach((node, index) => {
      (node as HTMLElement).style.outlineColor = index === this.gridAt ? '#eef2f4' : 'transparent';
    });
    (this.grid.children[this.gridAt] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  }

  // -- drawing --------------------------------------------------------------

  /** The overview and close buttons: the deck's only controls that are not a key or a tap. */
  private chrome(): HTMLDivElement {
    const strip = el('div', { position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px' });
    const button = (text: string, title: string, act: () => void): HTMLButtonElement => {
      const node = el('button', {
        font: `bold 14px ${MONO}`,
        color: '#eef2f4',
        background: 'rgba(8, 11, 14, 0.7)',
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: '4px',
        padding: '5px 10px',
        cursor: 'pointer',
      }, text);
      node.title = title;
      node.addEventListener('click', (event) => {
        event.stopPropagation();
        act();
      });
      return node;
    };
    strip.append(button('▦', 'All slides (G)', () => this.openGrid()), button('✕', 'Close (ESC)', () => this.close()));
    return strip;
  }

  /** Draw the current slide. `fresh` is a new slide, which fades in; a step does not. */
  private render(fresh = true): void {
    const slide = this.slides[this.at];
    const total = this.slides.length;
    this.counter.textContent = total > 0 ? `${this.at + 1} / ${total}` : '';
    this.bar.style.width = total > 1 ? `${(this.at / (total - 1)) * 100}%` : '100%';
    this.notes.textContent = slide?.notes ?? '';
    this.notes.style.display = this.showNotes && slide?.notes ? 'block' : 'none';
    if (!slide) {
      this.surface.replaceChildren(el('div', { ...CENTRED, font: `24px ${SANS}`, color: '#8d959b' }, 'This deck has no slides yet.'));
      return;
    }

    const page = el('div', { position: 'absolute', inset: '0', background: slide.color ?? '#0d1013' });
    const words = slide.title || slide.subtitle || slide.text || slide.bullets || slide.code;
    if (slide.background) {
      const url = slideImage(slide.background);
      page.append(
        url
          ? el('div', {
              position: 'absolute',
              inset: '0',
              backgroundImage: `url("${url}")`,
              backgroundSize: slide.fit ?? 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            })
          : el(
              'div',
              // In a corner, not the middle: the slide's words still have to be read over it.
              {
                position: 'absolute',
                inset: '24px',
                padding: '10px 14px',
                border: '2px dashed #5d666c',
                borderRadius: '6px',
                font: `13px ${MONO}`,
                color: '#8d959b',
              },
              `missing picture: src/decks/images/${slide.background}`,
            ),
      );
      const shade = slide.shade ?? (words ? 0.45 : 0);
      if (shade > 0) page.append(el('div', { position: 'absolute', inset: '0', background: `rgba(0,0,0,${shade})` }));
    }
    if (words) page.append(this.words(slide));
    this.surface.replaceChildren(page);

    if (fresh) {
      page.style.opacity = '0';
      page.style.transition = 'opacity 220ms ease-out';
      requestAnimationFrame(() => (page.style.opacity = '1'));
      // The next picture, fetched while this slide is being talked over.
      const after = this.slides[this.at + 1]?.background;
      const url = after ? slideImage(after) : undefined;
      if (url) new Image().src = url;
    }
  }

  private words(slide: Slide): HTMLDivElement {
    const layout = slide.layout ?? 'center';
    const box = el('div', {
      position: 'absolute',
      inset: '0',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      padding: layout === 'bottom' ? '0 70px 56px' : '56px 90px',
      justifyContent: layout === 'bottom' ? 'flex-end' : 'center',
      alignItems: layout === 'center' ? 'center' : 'flex-start',
      textAlign: layout === 'center' ? 'center' : 'left',
      color: '#f2f5f7',
      fontFamily: SANS,
      textShadow: slide.background ? '0 2px 10px rgba(0,0,0,0.75)' : 'none',
    });
    const big = layout === 'center' && !slide.text && !slide.bullets && !slide.code;
    if (slide.title) {
      box.append(el('div', { font: `600 ${big ? 64 : 46}px ${SANS}`, lineHeight: '1.1', letterSpacing: '-0.01em' }, slide.title));
    }
    if (slide.subtitle) box.append(el('div', { font: `24px ${SANS}`, color: '#c4ccd2' }, slide.subtitle));
    const paragraphs = typeof slide.text === 'string' ? [slide.text] : (slide.text ?? []);
    for (const text of paragraphs) box.append(rich(text, { font: `26px ${SANS}`, lineHeight: '1.4', maxWidth: '920px' }));
    if (slide.bullets) {
      const list = el('ul', { margin: '0', paddingLeft: '1.1em', textAlign: 'left', font: `28px ${SANS}`, lineHeight: '1.5' });
      const shown = slide.build ? this.step : slide.bullets.length;
      slide.bullets.forEach((text, index) => {
        const item = rich(text, { visibility: index < shown ? 'visible' : 'hidden' }, 'li');
        list.append(item);
      });
      box.append(list);
    }
    if (slide.code) {
      box.append(
        el(
          'pre',
          {
            margin: '0',
            padding: '18px 22px',
            textAlign: 'left',
            font: `19px ${MONO}`,
            lineHeight: '1.45',
            color: '#dfe6ea',
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px',
            textShadow: 'none',
            whiteSpace: 'pre',
            overflow: 'auto',
            maxWidth: '100%',
          },
          slide.code,
        ),
      );
    }
    return box;
  }
}

const CENTRED: Style = {
  position: 'absolute',
  inset: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/**
 * A line of slide text, with `code` and **bold** in it. Built as nodes rather
 * than HTML, so a slide cannot put markup on the page by accident.
 */
function rich<K extends 'div' | 'li'>(text: string, style: Style, tag?: K): HTMLElement {
  const node = el(tag ?? 'div', style);
  for (const part of text.split(/(`[^`]+`|\*\*[^*]+\*\*)/)) {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      node.append(
        el(
          'code',
          { font: `0.85em ${MONO}`, background: 'rgba(255,255,255,0.12)', padding: '1px 6px', borderRadius: '4px' },
          part.slice(1, -1),
        ),
      );
    } else if (part.startsWith('**') && part.endsWith('**') && part.length > 3) {
      node.append(el('strong', {}, part.slice(2, -2)));
    } else if (part) {
      node.append(document.createTextNode(part));
    }
  }
  return node;
}
