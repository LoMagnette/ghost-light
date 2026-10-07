import type { Activity } from '@/core/Activity';
import type { ActivityState } from '@/core/Objective';
import type { RobotSpec } from '@/core/RobotSpec';
import { css, el } from './dom';

/*
 * The objective card: what its rows say, and how a row is drawn.
 *
 * Out of `ChapterScreen` because none of it needs the screen — a row is a
 * function of the lines and the era's accent — and the screen is four
 * thousand lines without it.
 */

/** A finished job: its banner and its tick on the card. */
export const DONE_GREEN = '#8fd694';

/** One row of the card, and the robot it is for if only one can do it. */
export interface CardLine {
  text: string;
  who?: RobotSpec;
  /** Its row key, while it is a job with a marker. See `cardKey`. */
  key?: string;
  /** The number its marker wears, once it has been listed. See `numberRows`. */
  n?: number;
  /** The one the screen recommends. See `chooseNext`. */
  next?: boolean;
  /** On a clock: a breakdown, or a job with a deadline. Never folded away. See `firstJob`. */
  timed?: boolean;
  /** Not a job, a note about the card. */
  dim?: boolean;
  /** A side quest: listed under the day's work, and not in the count. See `card`. */
  optional?: boolean;
  /** The heading over the side quests. */
  heading?: boolean;
}

/** A job's row on the card, which its marker shares: its sweep's, if it is one of many. */
export function cardKey(activity: Activity): string {
  return activity.group === undefined ? activity.id : `group:${activity.group}`;
}

/** One card row: a glyph for the state, the label, and any live number. */
export function cardLine(state: ActivityState): string {
  const { activity, status } = state;

  const glyph =
    status === 'done' ? '✓' : status === 'missed' ? '×' : status === 'carried' ? '»' : status === 'locked' ? ' ' : '›';
  if ((activity.kind === 'dwell' || activity.kind === 'attend') && status === 'open' && state.progress > 0.02) {
    return `${glyph} ${activity.label} ${Math.round(state.progress * 100)}%`;
  }
  // A conversation counts in LINES, not percent: "2/4" is a place in a
  // conversation and "50%" is a progress bar on one, which is a strange
  // thing to show somebody who is being spoken to.
  if (activity.kind === 'talk' && status === 'open' && state.progress > 0) {
    const shown = Math.round(state.progress * activity.lines.length);
    return `${glyph} ${activity.label} ${shown}/${activity.lines.length}`;
  }
  return `${glyph} ${activity.label}`;
}

/** Everything a row shows, joined: equal signatures mean the DOM need not be rebuilt. */
export function cardSignature(lines: readonly CardLine[]): string {
  return lines
    .map((l) => `${l.text}|${l.who?.id ?? ''}|${l.n ?? ''}|${l.next ? 1 : 0}|${l.dim ? 1 : 0}|${l.heading ? 1 : 0}`)
    .join('\n');
}

/** The card's rows as elements, in the era's accent. */
export function cardRows(lines: readonly CardLine[], accent: string): HTMLElement[] {
  return lines.map((line) => {
    if (line.heading) {
      return el(
        'div',
        { color: '#7d868b', paddingRight: '25px', marginTop: '6px', fontSize: '10px', letterSpacing: '0.1em' },
        line.text,
      );
    }
    if (line.dim) return el('div', { color: '#7d868b', paddingRight: '25px' }, line.text);
    // A finished row: the tick in green and the rest stepped back.
    const ticked = line.text.startsWith('✓ ');
    const row = el(
      'div',
      line.next ? { color: '#eef2f4', background: 'rgba(255, 255, 255, 0.07)', margin: '0 -6px', padding: '0 6px', borderRadius: '3px' } : {},
      ticked ? '' : line.text,
    );
    if (ticked) row.append(el('span', { color: DONE_GREEN }, '✓'), el('span', { color: '#7d868b' }, line.text.slice(1)));
    if (line.who) {
      row.append(
        el('span', { color: css(line.who.signal), marginLeft: '8px' }, '●'),
        el('span', { color: css(line.who.signal), marginLeft: '4px' }, line.who.name),
      );
    }
    /*
     * The number its marker wears, at the end of the row, where the
     * right-aligned card lines them up in a column. The next is filled,
     * as its badge is.
     */
    if (line.n !== undefined) {
      const colour = line.who ? css(line.who.signal) : accent;
      row.append(
        el(
          'span',
          {
            display: 'inline-block',
            minWidth: '17px',
            height: '17px',
            lineHeight: '15px',
            marginLeft: '8px',
            boxSizing: 'border-box',
            borderRadius: '9px',
            border: `1px solid ${colour}`,
            background: line.next ? colour : 'transparent',
            color: line.next ? '#06080a' : colour,
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: 'bold',
            verticalAlign: '1px',
          },
          String(line.n),
        ),
      );
    } else {
      // Unnumbered rows keep the column: a blank the width of a number.
      row.append(el('span', { display: 'inline-block', width: '17px', marginLeft: '8px' }));
    }
    return row;
  });
}
