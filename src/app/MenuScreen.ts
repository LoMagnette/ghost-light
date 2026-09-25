/**
 * Chapter select.
 *
 * Deliberately plain: title, three cards, one key to start. A judge should be
 * playing within four seconds of the page loading. Everything here is
 * keyboard- AND pointer-driven, because judges will try both.
 *
 * Pure DOM, and no 3D scene at all — the canvas behind it just clears. That is
 * the whole reason the UI is HTML: a menu is a list of boxes with text in them
 * and the browser has been laying those out for thirty years.
 */

import { CHAPTERS } from '@/chapters/registry';
import { MOVEMENT_LAB } from '@/chapters/lab';
import { GAME_SUBTITLE, GAME_TITLE, VIEW_HEIGHT, VIEW_WIDTH } from '@/config';
import type { Game, Screen } from './Game';
import type { Routes } from './Routes';
import { el, MONO, SANS, SERIF } from './dom';
import { currentQuality, setQuality } from './quality';

const CARD_WIDTH = 300;
const CARD_HEIGHT = 240;
const CARD_GAP = 28;

export class MenuScreen implements Screen {
  private selected = 0;
  private cards: HTMLElement[] = [];

  constructor(private readonly routes: Routes) {}

  mount(game: Game): void {
    game.setBackground(0x06080a);

    game.ui.append(
      centred(70, { font: `44px ${SANS}`, color: '#f2f5f7' }, GAME_TITLE),
      centred(132, { font: `15px ${SANS}`, color: '#6f777c' }, GAME_SUBTITLE),
    );

    const total = CHAPTERS.length * CARD_WIDTH + (CHAPTERS.length - 1) * CARD_GAP;
    const startX = (VIEW_WIDTH - total) / 2;

    CHAPTERS.forEach((chapter, index) => {
      const card = this.buildCard(chapter.numeral, chapter.title, chapter.era, chapter.tagline);
      card.style.left = `${startX + index * (CARD_WIDTH + CARD_GAP)}px`;
      card.style.top = '210px';
      card.addEventListener('pointerenter', () => {
        this.selected = index;
        this.refresh();
      });
      card.addEventListener('click', () => this.routes.chapter(chapter.id));
      this.cards.push(card);
      game.ui.append(card);
    });

    game.ui.append(
      centred(
        VIEW_HEIGHT - 78,
        { font: `13px ${MONO}`, color: '#5b6266' },
        'ARROWS or MOUSE to choose     ENTER or CLICK to begin',
      ),
      centred(
        VIEW_HEIGHT - 52,
        { font: `11px ${MONO}`, color: '#2f3538' },
        'L   movement lab (dev)',
      ),
    );

    /*
     * The one setting, on the one screen that is never in the middle of
     * anything. It changes the NEXT chapter started, because materials are
     * built when a chapter mounts — which is also exactly when a player who
     * finds the game slow would reach for it.
     */
    const graphics = centred(VIEW_HEIGHT - 110, { font: `12px ${MONO}`, color: '#6f777c' }, '');
    const showGraphics = (): void => {
      graphics.textContent = `G   graphics: ${currentQuality()}${currentQuality() === 'high' ? '  (shadows, mood)' : '  (flat, fastest)'}`;
    };
    showGraphics();
    game.ui.append(graphics);
    game.keyboard.on('KeyG', () => {
      setQuality(currentQuality() === 'high' ? 'low' : 'high');
      game.applyQuality();
      showGraphics();
    });

    game.keyboard.on('ArrowLeft', () => this.move(-1));
    game.keyboard.on('ArrowRight', () => this.move(1));
    game.keyboard.on('Enter', () => this.routes.chapter(CHAPTERS[this.selected].id));
    game.keyboard.on('Space', () => this.routes.chapter(CHAPTERS[this.selected].id));
    // The movement lab is a tuning rig, not a chapter. It is reachable but not
    // offered: it never appears as a card, because a judge choosing it by
    // accident would be choosing a debug screen over the game.
    game.keyboard.on('KeyL', () => this.routes.chapter(MOVEMENT_LAB.id));

    this.refresh();
  }

  update(): void {
    // Nothing moves on the menu. The loop still runs so ESC and the keyboard
    // stay live, and so the transition into a chapter is a single frame.
  }

  dispose(): void {
    this.cards = [];
  }

  private move(by: number): void {
    this.selected = (this.selected + CHAPTERS.length + by) % CHAPTERS.length;
    this.refresh();
  }

  private buildCard(numeral: string, title: string, era: string, tagline: string): HTMLElement {
    const card = el('div', {
      position: 'absolute',
      width: `${CARD_WIDTH}px`,
      height: `${CARD_HEIGHT}px`,
      boxSizing: 'border-box',
      background: '#11161a',
      border: '1px solid #232b31',
      cursor: 'pointer',
    });

    card.append(
      el(
        'div',
        {
          position: 'absolute',
          left: '24px',
          top: '20px',
          font: `38px ${SERIF}`,
          color: '#3d464c',
        },
        numeral,
      ),
      el(
        'div',
        { position: 'absolute', left: '24px', top: '92px', font: `24px ${SANS}`, color: '#e6ebee' },
        title,
      ),
      el(
        'div',
        {
          position: 'absolute',
          left: '24px',
          top: '130px',
          font: `11px ${MONO}`,
          color: '#6f777c',
          letterSpacing: '0.08em',
        },
        era.toUpperCase(),
      ),
      el(
        'div',
        {
          position: 'absolute',
          left: '24px',
          top: '164px',
          width: `${CARD_WIDTH - 48}px`,
          font: `13px ${SANS}`,
          lineHeight: '1.45',
          color: '#8b9398',
        },
        tagline,
      ),
    );

    return card;
  }

  private refresh(): void {
    this.cards.forEach((card, index) => {
      const active = index === this.selected;
      card.style.background = active ? '#171e24' : '#11161a';
      card.style.borderColor = active ? '#ff7a1a' : '#232b31';
    });
  }
}

function centred(top: number, style: Parameters<typeof el>[1], text: string): HTMLElement {
  return el(
    'div',
    {
      position: 'absolute',
      left: '0',
      top: `${top}px`,
      width: '100%',
      textAlign: 'center',
      // The hint lines space their two halves with runs of spaces, which the
      // browser collapses unless told not to.
      whiteSpace: 'pre',
      ...style,
    },
    text,
  );
}
