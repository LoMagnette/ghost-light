/**
 * Chapter select.
 *
 * Deliberately plain: title, three cards, one key to start. A judge should be
 * playing within four seconds of the page loading. Everything here is
 * keyboard- AND pointer-driven, because judges will try both.
 */

import Phaser from 'phaser';
import { CHAPTERS } from '@/chapters/registry';
import { MOVEMENT_LAB } from '@/chapters/lab';
import { GAME_SUBTITLE, GAME_TITLE, VIEW_HEIGHT, VIEW_WIDTH } from '@/config';

export class MenuScene extends Phaser.Scene {
  private selected = 0;
  private cards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('menu');
  }

  create(): void {
    // Phaser reuses the scene INSTANCE across restarts, so field initializers
    // do not re-run. Anything holding game objects must be reset here or the
    // next create() will still be pointing at the previous run's destroyed
    // children. Menu → chapter → ESC → menu is the path that catches this.
    this.cards = [];
    this.selected = 0;

    this.cameras.main.setBackgroundColor(0x06080a);

    this.add
      .text(VIEW_WIDTH / 2, 92, GAME_TITLE, {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '44px',
        color: '#f2f5f7',
      })
      .setOrigin(0.5);

    this.add
      .text(VIEW_WIDTH / 2, 138, GAME_SUBTITLE, {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '15px',
        color: '#6f777c',
      })
      .setOrigin(0.5);

    const cardWidth = 300;
    const gap = 28;
    const totalWidth = CHAPTERS.length * cardWidth + (CHAPTERS.length - 1) * gap;
    const startX = (VIEW_WIDTH - totalWidth) / 2;

    CHAPTERS.forEach((chapter, index) => {
      const x = startX + index * (cardWidth + gap);
      const card = this.buildCard(chapter.numeral, chapter.title, chapter.era, chapter.tagline, cardWidth);
      card.setPosition(x, 210);
      card.setSize(cardWidth, 240);
      card.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, cardWidth, 240),
        Phaser.Geom.Rectangle.Contains,
      );
      card.on('pointerover', () => {
        this.selected = index;
        this.refresh();
      });
      card.on('pointerdown', () => this.launch(index));
      this.cards.push(card);
    });

    this.add
      .text(
        VIEW_WIDTH / 2,
        VIEW_HEIGHT - 70,
        'ARROWS or MOUSE to choose     ENTER or CLICK to begin',
        {
          fontFamily: 'ui-monospace, monospace',
          fontSize: '13px',
          color: '#5b6266',
        },
      )
      .setOrigin(0.5);

    this.add
      .text(VIEW_WIDTH / 2, VIEW_HEIGHT - 44, 'L   movement lab (dev)', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '11px',
        color: '#2f3538',
      })
      .setOrigin(0.5);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown-LEFT', () => {
        this.selected = (this.selected + CHAPTERS.length - 1) % CHAPTERS.length;
        this.refresh();
      });
      keyboard.on('keydown-RIGHT', () => {
        this.selected = (this.selected + 1) % CHAPTERS.length;
        this.refresh();
      });
      keyboard.on('keydown-ENTER', () => this.launch(this.selected));
      keyboard.on('keydown-SPACE', () => this.launch(this.selected));
      // The movement lab is a tuning rig, not a chapter. It is reachable but
      // not offered: it never appears as a card, because a judge choosing it
      // by accident would be choosing a debug screen over the game.
      keyboard.on('keydown-L', () => this.scene.start('chapter', { chapterId: MOVEMENT_LAB.id }));
    }

    this.refresh();
  }

  private buildCard(
    numeral: string,
    title: string,
    era: string,
    tagline: string,
    width: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);

    const background = this.add.rectangle(0, 0, width, 240, 0x11161a).setOrigin(0, 0);
    background.setStrokeStyle(1, 0x232b31);
    container.add(background);

    container.add(
      this.add
        .text(24, 26, numeral, {
          fontFamily: 'ui-serif, Georgia, serif',
          fontSize: '38px',
          color: '#3d464c',
        })
        .setOrigin(0, 0),
    );

    container.add(
      this.add
        .text(24, 96, title, {
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '24px',
          color: '#e6ebee',
        })
        .setOrigin(0, 0),
    );

    container.add(
      this.add
        .text(24, 130, era.toUpperCase(), {
          fontFamily: 'ui-monospace, monospace',
          fontSize: '11px',
          color: '#6f777c',
        })
        .setOrigin(0, 0),
    );

    container.add(
      this.add
        .text(24, 166, tagline, {
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '13px',
          color: '#8b9398',
          wordWrap: { width: width - 48 },
        })
        .setOrigin(0, 0),
    );

    return container;
  }

  private refresh(): void {
    this.cards.forEach((card, index) => {
      const background = card.getAt(0) as Phaser.GameObjects.Rectangle;
      const active = index === this.selected;
      background.setFillStyle(active ? 0x171e24 : 0x11161a);
      background.setStrokeStyle(1, active ? 0xff7a1a : 0x232b31);
    });
  }

  private launch(index: number): void {
    this.scene.start('chapter', { chapterId: CHAPTERS[index].id });
  }
}
