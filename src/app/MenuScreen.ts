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
import { audioUnlocked, isMuted, onMuteChange, playAmbience, playMusic, toggleMuted } from './audio';
import { Intro, introWanted } from './Intro';
import { openSouvenirs, souvenirTotal } from './souvenirs';

const CARD_WIDTH = 300;
const CARD_HEIGHT = 280;
const CARD_GAP = 28;

/**
 * A card's measures, design pixels. On a phone the stage is about half size,
 * and a playtest at 844 × 390 could not read the chapter descriptions: 14 px
 * came out at seven real pixels. So the cards are wider and taller there and
 * everything on them is drawn about a third bigger again.
 */
function cardMeasures(touch: boolean) {
  return touch
    ? { w: 372, h: 318, gap: 22, top: 194, pad: '20px 24px 18px', numeral: 44, head: 48, title: 31, era: 14, tagline: 20, recap: 16, chip: 14, gapTitle: 20 }
    : { w: CARD_WIDTH, h: CARD_HEIGHT, gap: CARD_GAP, top: 210, pad: '22px 24px 20px', numeral: 38, head: 44, title: 24, era: 11, tagline: 14, recap: 12, chip: 11, gapTitle: 26 };
}

/** Seconds for the lens to ease from one era's grade to the next. */
const GRADE_EASE = 1.6;

/** Seconds the menu takes to come up once the intro has gone. */
const INTRO_FADE = 1.2;

export class MenuScreen implements Screen {
  private selected = 0;
  private cards: HTMLElement[] = [];
  private stopListening: () => void = () => undefined;
  private backdrop!: BlockoutRenderer;
  private readonly isoCamera: OrthographicCamera = createIsoCamera();
  private drift = 0;
  /** The title sequence, while it plays. See `Intro`. */
  private intro: Intro | undefined;
  /** Everything on the menu but the backdrop, so the intro can hold it back. */
  private layer!: HTMLElement;
  /** The grade on screen, easing towards the selected chapter's. */
  private readonly shown: Required<Grade> = {
    tint: 0xffffff,
    saturation: 1,
    contrast: 1,
    vignette: 0.5,
    grain: 0,
    bloom: 0.4,
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
    // The menu's own tune if there is one; otherwise Chapter I's, which is
    // the building the backdrop shows.
    playMusic('music-menu', 'music-silence');
    playAmbience();

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
        // Darker than it was (29 Sep: "fuzzy, not clean"): the building is
        // texture behind the menu, not a picture competing with it.
        background:
          'radial-gradient(ellipse 75% 65% at 50% 45%, rgba(4,6,8,0.62), rgba(4,6,8,0.9))',
      }),
    );

    this.layer = el('div', { position: 'absolute', inset: '0', transition: `opacity ${INTRO_FADE}s` });
    game.ui.append(this.layer);

    this.layer.append(
      // A tight shadow, not a glow: a glow is what made the type look soft.
      centred(72, { font: `46px ${SANS}`, color: '#f2f5f7', textShadow: '0 1px 2px rgba(0,0,0,0.7)', letterSpacing: '0.02em' }, GAME_TITLE),
      centred(134, { font: `${game.touch ? 20 : 15}px ${SANS}`, color: '#9aa2a7', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }, GAME_SUBTITLE),
    );

    const touch = game.touch !== undefined;
    const cm = cardMeasures(touch);
    const total = CHAPTERS.length * cm.w + (CHAPTERS.length - 1) * cm.gap;
    const startX = (VIEW_WIDTH - total) / 2;

    CHAPTERS.forEach((chapter, index) => {
      const card = this.buildCard(chapter.numeral, chapter.title, chapter.era, chapter.tagline, chapter.recap, index === 0 ? chapter.palette.accent : undefined, touch);
      card.dataset.accent = `#${chapter.palette.accent.toString(16).padStart(6, '0')}`;
      card.style.left = `${startX + index * (cm.w + cm.gap)}px`;
      card.style.top = `${cm.top}px`;
      card.addEventListener('pointerenter', () => {
        this.selected = index;
        this.refresh();
      });
      card.addEventListener('click', () => this.routes.chapter(chapter.id));
      this.cards.push(card);
      this.layer.append(card);
    });

    /*
     * Everything that is not a chapter, on one row of buttons under the
     * cards: the key on a keycap and what it does, the way the control strip
     * in a chapter says it. It was five centred lines of grey monospace and
     * a debug line, and read as small print. On a phone the keys are left
     * off, since they are tapped, and the row is drawn bigger.
     */
    const row = el('div', {
      position: 'absolute',
      left: '0',
      top: touch ? '548px' : '532px',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      gap: '10px',
    });
    row.classList.add('touch-grow-centre');
    this.layer.append(row);
    const option = (k: string, onTap: () => void): HTMLElement => {
      const node = el('div', {
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        padding: '6px 13px 6px 7px',
        background: 'rgba(10, 13, 16, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.09)',
        borderRadius: '4px',
        cursor: 'pointer',
        font: `13px ${SANS}`,
        color: '#aab2b8',
      });
      if (!touch) {
        node.append(
          el(
            'span',
            {
              padding: '1px 6px',
              border: '1px solid rgba(255, 255, 255, 0.28)',
              borderRadius: '3px',
              font: `bold 11px ${MONO}`,
              color: '#eef2f4',
            },
            k,
          ),
        );
      } else node.style.paddingLeft = '13px';
      const text = el('span', {});
      node.append(text);
      node.addEventListener('click', onTap);
      node.addEventListener('pointerenter', () => (node.style.borderColor = 'rgba(255, 255, 255, 0.3)'));
      node.addEventListener('pointerleave', () => (node.style.borderColor = 'rgba(255, 255, 255, 0.09)'));
      row.append(node);
      return text;
    };
    const dim = (words: string): HTMLElement => el('span', { color: '#6f777c' }, words);

    // The souvenir album: prints, people and stickers, one book. C still
    // opens it on the people, where it used to open the who's who.
    const showAlbum = (): void => openSouvenirs(game.ui, touch, 'prints');
    const showCast = (): void => openSouvenirs(game.ui, touch, 'people');
    option('P', showAlbum).append('Album ', dim(souvenirTotal()));
    option('I', () => this.playIntro(game)).append('Intro');

    /*
     * The one setting, on the one screen that is never in the middle of
     * anything. It changes the NEXT chapter started, because materials are
     * built when a chapter mounts — which is also exactly when a player who
     * finds the game slow would reach for it.
     */
    const toggleGraphics = (): void => {
      setQuality(currentQuality() === 'high' ? 'low' : 'high');
      game.applyQuality();
      showGraphics();
    };
    const graphics = option('G', toggleGraphics);
    const showGraphics = (): void => {
      graphics.replaceChildren('Graphics ', dim(currentQuality() === 'high' ? 'high' : 'low, fastest'));
    };
    showGraphics();
    const sound = option('M', toggleMuted);
    const showSound = (): void => {
      sound.replaceChildren('Sound ', dim(isMuted() ? 'off' : 'on'));
    };
    showSound();
    this.stopListening = onMuteChange(showSound);

    this.layer.append(
      centred(
        VIEW_HEIGHT - 110,
        { font: `${touch ? 17 : 12}px ${MONO}`, color: '#6f777c', letterSpacing: '0.04em' },
        touch ? 'TAP a chapter to begin' : '← →  choose        ENTER  begin',
      ),
    );

    // Bound only once the intro has gone, and rebound after a replay. Keys
    // pressed while the words are up belong to the intro.
    this.bindKeys = (): void => {
      game.keyboard.on('KeyG', toggleGraphics);

      game.keyboard.on('ArrowLeft', () => this.move(-1));
      game.keyboard.on('ArrowRight', () => this.move(1));
      game.keyboard.on('Enter', () => this.routes.chapter(CHAPTERS[this.selected].id));
      game.keyboard.on('Space', () => this.routes.chapter(CHAPTERS[this.selected].id));
      // The movement lab is a tuning rig, not a chapter. It is reachable but not
      // offered: it never appears as a card, because a judge choosing it by
      // accident would be choosing a debug screen over the game.
      game.keyboard.on('KeyL', () => this.routes.chapter(MOVEMENT_LAB.id));
      game.keyboard.on('KeyI', () => this.playIntro(game));
      game.keyboard.on('KeyP', showAlbum);
      game.keyboard.on('KeyC', showCast);
    };

    this.refresh();
    if (introWanted()) this.playIntro(game);
    else this.bindKeys();
  }

  private bindKeys: () => void = () => undefined;

  private playIntro(game: Game): void {
    game.keyboard.clearBindings();
    this.layer.style.opacity = '0';
    this.layer.style.pointerEvents = 'none';
    const accent = `#${CHAPTER_ONE.palette.accent.toString(16).padStart(6, '0')}`;
    this.intro = new Intro(game.ui, !audioUnlocked(), accent, () => {
      this.intro = undefined;
      this.layer.style.opacity = '1';
      this.layer.style.pointerEvents = '';
      this.bindKeys();
    });
  }

  update(dt: number): void {
    this.intro?.update(dt);
    this.drift += dt;
    this.moveBackdrop(dt);
    this.easeGrade(dt);
  }

  dispose(): void {
    this.intro?.dispose();
    this.stopListening();
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
    // No grain and a little bloom, whatever is chosen: film grain behind
    // small type is noise in the type.
    g.grain += (0 - g.grain) * k;
    g.bloom += (0.4 - g.bloom) * k;
    g.tint = mixColour(g.tint, target.tint ?? 0xffffff, k);
  }

  private move(by: number): void {
    this.selected = (this.selected + CHAPTERS.length + by) % CHAPTERS.length;
    this.refresh();
  }

  /**
   * One chapter's card.
   *
   * All three can be opened, because a judge may want to go straight to the
   * busiest one. But the second and third begin in the middle of a story,
   * and a tester who started there met dialogue about things they had not
   * seen. So the first card says START HERE, and the others say in a line
   * what happened before them.
   */
  private buildCard(
    numeral: string,
    title: string,
    era: string,
    tagline: string,
    recap: string | undefined,
    /** The chapter's accent, on the one to start with. */
    startHere: number | undefined,
    touch: boolean,
  ): HTMLElement {
    const m = cardMeasures(touch);
    // Solid rather than frosted: a blurred building behind blurred glass was
    // most of what made the menu look soft.
    const card = el('div', {
      position: 'absolute',
      width: `${m.w}px`,
      height: `${m.h}px`,
      boxSizing: 'border-box',
      padding: m.pad,
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(10, 13, 16, 0.92)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '6px',
      cursor: 'pointer',
      overflow: 'hidden',
      transition: 'background 160ms, border-color 160ms, box-shadow 160ms',
    });

    // The numeral, and on the first card what it is for, on one line.
    const head = el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: `${m.head}px` });
    head.append(el('div', { font: `${m.numeral}px ${SERIF}`, color: '#4a535a', lineHeight: '1' }, numeral));
    if (startHere !== undefined) {
      head.append(
        el(
          'div',
          {
            padding: '4px 9px',
            borderRadius: '3px',
            background: `#${startHere.toString(16).padStart(6, '0')}`,
            color: '#06080a',
            font: `bold ${m.chip}px ${MONO}`,
            letterSpacing: '0.1em',
          },
          'START HERE',
        ),
      );
    }
    card.append(
      head,
      el('div', { font: `${m.title}px ${SANS}`, color: '#eef2f4', marginTop: `${m.gapTitle}px` }, title),
      el('div', { font: `${m.era}px ${MONO}`, color: '#8d959b', letterSpacing: '0.1em', marginTop: '8px' }, era.toUpperCase()),
      el('div', { font: `${m.tagline}px ${SANS}`, lineHeight: '1.4', color: '#b8c0c5', marginTop: touch ? '14px' : '18px' }, tagline),
    );
    if (recap) {
      card.append(
        el(
          'div',
          {
            marginTop: 'auto',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            font: `${m.recap}px ${SANS}`,
            fontStyle: 'italic',
            lineHeight: '1.35',
            color: '#8d959b',
          },
          recap,
        ),
      );
    }

    return card;
  }

  private refresh(): void {
    this.cards.forEach((card, index) => {
      const active = index === this.selected;
      // Each chapter's own accent: the ghost light, the tungsten lamp, the
      // Devoxx orange. The card is lit the colour of the era it opens.
      const accent = card.dataset.accent ?? '#ff7a1a';
      // Lit in place rather than lifted: a card that jumps 4 px left the row
      // ragged. The border and the numeral take the accent, and an inset bar
      // along the top says which one ENTER opens.
      card.style.background = active ? 'rgba(16, 20, 24, 0.96)' : 'rgba(10, 13, 16, 0.92)';
      card.style.borderColor = active ? accent : 'rgba(255, 255, 255, 0.08)';
      card.style.boxShadow = active ? `inset 0 3px 0 ${accent}, 0 12px 32px rgba(0, 0, 0, 0.55)` : 'none';
      const numeral = card.firstElementChild?.firstElementChild as HTMLElement | null | undefined;
      if (numeral) numeral.style.color = active ? accent : '#4a535a';
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
