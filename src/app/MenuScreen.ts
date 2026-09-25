/**
 * Chapter select.
 *
 * Deliberately plain: title, three cards, one key to start. A judge should be
 * playing within four seconds of the page loading. Everything here is
 * keyboard- AND pointer-driven, because judges will try both.
 *
 * The UI is DOM, because a menu is a list of boxes with text in them and the
 * browser has been laying those out for thirty years. Behind it, since 25 Sep,
 * is the building itself: Chapter I's empty Kinepolis, with a pool of ghost
 * light drifting slowly through the hall. The title of the game is the thing
 * behind the title. Choosing a chapter eases the lens into that era's grade,
 * so each card previews how its chapter will look before it is opened.
 *
 * One scene, built once, with nobody in it — the cheapest the building ever
 * gets. On low quality there is no grade, and the lamp is all there is.
 */

import type { OrthographicCamera, Scene } from 'three';
import { CHAPTER_ONE, CHAPTERS } from '@/chapters/registry';
import { BlockoutRenderer } from '@/render/BlockoutRenderer';
import { createIsoCamera, lookAtWorld } from '@/render/IsoCamera';
import type { Grade } from '@/render/Mood';
import { Crowd } from '@/core/Crowd';
import { Decay } from '@/core/Decay';
import { groundAt } from '@/core/Venue';
import { KINEPOLIS } from '@/venue/kinepolis';
import { MOVEMENT_LAB } from '@/chapters/lab';
import { GAME_SUBTITLE, GAME_TITLE, VIEW_HEIGHT, VIEW_WIDTH } from '@/config';
import type { Game, Screen } from './Game';
import type { Routes } from './Routes';
import { el, MONO, SANS, SERIF } from './dom';
import { currentQuality, setQuality } from './quality';

const CARD_WIDTH = 300;
const CARD_HEIGHT = 240;
const CARD_GAP = 28;

/** Seconds for the lens to ease from one era's grade to the next. */
const GRADE_EASE = 1.6;

export class MenuScreen implements Screen {
  private selected = 0;
  private cards: HTMLElement[] = [];
  private backdrop!: BlockoutRenderer;
  private readonly isoCamera: OrthographicCamera = createIsoCamera();
  private drift = 0;
  /** The grade on screen, easing towards the selected chapter's. */
  private readonly shown: Required<Grade> = {
    tint: 0xffffff,
    saturation: 1,
    contrast: 1,
    vignette: 0.5,
    grain: 0.04,
    bloom: 0.9,
  };

  constructor(private readonly routes: Routes) {}

  get scene(): Scene {
    return this.backdrop.scene;
  }

  get camera(): OrthographicCamera {
    return this.isoCamera;
  }

  get grade(): Grade {
    return this.shown;
  }

  mount(game: Game): void {
    game.setBackground(CHAPTER_ONE.palette.void);

    // The empty building, lit by nothing but its own dark and one lamp.
    this.backdrop = new BlockoutRenderer(
      this.isoCamera,
      KINEPOLIS,
      CHAPTER_ONE.palette,
      CHAPTER_ONE.lightLevel,
      new Crowd(KINEPOLIS, 0, []),
      new Decay(KINEPOLIS, 1),
      currentQuality() === 'high',
    );
    this.backdrop.enableLamp(12, 1.0);
    this.drift = 0;
    this.moveBackdrop(0);

    // A dark wash over the scene behind the title and the cards, so they
    // read over whatever the drift happens to be passing.
    game.ui.append(
      el('div', {
        position: 'absolute',
        inset: '0',
        pointerEvents: 'none',
        background:
          'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(4,6,8,0.35), rgba(4,6,8,0.8))',
      }),
    );

    game.ui.append(
      centred(70, { font: `44px ${SANS}`, color: '#f2f5f7', textShadow: '0 2px 18px rgba(0,0,0,0.9)', letterSpacing: '0.02em' }, GAME_TITLE),
      centred(132, { font: `15px ${SANS}`, color: '#8b9398', textShadow: '0 1px 8px rgba(0,0,0,0.9)' }, GAME_SUBTITLE),
    );

    const total = CHAPTERS.length * CARD_WIDTH + (CHAPTERS.length - 1) * CARD_GAP;
    const startX = (VIEW_WIDTH - total) / 2;

    CHAPTERS.forEach((chapter, index) => {
      const card = this.buildCard(chapter.numeral, chapter.title, chapter.era, chapter.tagline);
      card.dataset.accent = `#${chapter.palette.accent.toString(16).padStart(6, '0')}`;
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

  update(dt: number): void {
    this.drift += dt;
    this.moveBackdrop(dt);
    this.easeGrade(dt);
  }

  dispose(): void {
    this.cards = [];
    this.backdrop.dispose();
  }

  /**
   * A slow figure of eight over the exhibition hall, with the lamp just
   * ahead of the camera's aim. Periods in the tens of seconds, so it reads as
   * drifting rather than as moving — nobody is driving this.
   */
  private moveBackdrop(dt: number): void {
    const t = this.drift;
    const x = -3 + 11 * Math.sin(t * 0.045);
    const y = -24 + 9 * Math.sin(t * 0.09);
    const z = groundAt(KINEPOLIS, 0, x, y);
    lookAtWorld(this.isoCamera, x, y, z);
    this.backdrop.moveLamp(x + 1.5 * Math.cos(t * 0.3), y + 1.5 * Math.sin(t * 0.3), z);
    this.backdrop.focus(x, y, z);
    this.backdrop.render(0, [], 0, dt);
  }

  private easeGrade(dt: number): void {
    const target = CHAPTERS[this.selected].palette.grade ?? {};
    const k = Math.min(1, dt / GRADE_EASE * 3);
    const g = this.shown;
    g.saturation += ((target.saturation ?? 1) - g.saturation) * k;
    g.contrast += ((target.contrast ?? 1) - g.contrast) * k;
    // The menu keeps some vignette whatever is chosen: it frames the title.
    g.vignette += (Math.max(0.35, target.vignette ?? 0) - g.vignette) * k;
    g.grain += ((target.grain ?? 0) - g.grain) * k;
    g.bloom += (Math.max(0.6, target.bloom ?? 0) - g.bloom) * k;
    g.tint = mixColour(g.tint, target.tint ?? 0xffffff, k);
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
      background: 'rgba(12, 16, 19, 0.62)',
      border: '1px solid rgba(60, 70, 77, 0.6)',
      borderRadius: '4px',
      // The building shows through, softened, rather than being covered up.
      backdropFilter: 'blur(6px)',
      cursor: 'pointer',
      transition: 'transform 180ms ease-out, background 180ms, border-color 180ms',
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
      // Each chapter's own accent: the ghost light, the tungsten lamp, the
      // Devoxx orange. The card is lit the colour of the era it opens.
      const accent = card.dataset.accent ?? '#ff7a1a';
      card.style.background = active ? 'rgba(22, 28, 33, 0.78)' : 'rgba(12, 16, 19, 0.62)';
      card.style.borderColor = active ? accent : 'rgba(60, 70, 77, 0.6)';
      card.style.transform = active ? 'translateY(-4px)' : 'none';
      card.style.boxShadow = active ? `0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px ${accent}33` : 'none';
      const numeral = card.firstElementChild as HTMLElement | null;
      if (numeral) numeral.style.color = active ? accent : '#3d464c';
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

/** Ease one packed colour towards another by `k`. */
function mixColour(from: number, to: number, k: number): number {
  const channel = (shift: number): number => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * k) & 0xff;
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
