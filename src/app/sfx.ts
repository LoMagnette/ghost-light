/**
 * Everything the game says without a file: the robots and the interface.
 *
 * Synthesised, because the simulation already knows what a file cannot: how
 * much momentum a foot came down with, and what it belonged to. A footfall
 * here is that number made audible, per robot — Voxxy ticks, Droid clanks,
 * Biggy thuds — so mass, which is invisible, is heard as well as felt in the
 * camera. See `docs/AUDIO.md` §1 and §3.
 *
 * Every sound is a few oscillators and a burst of noise, shaped by an
 * envelope, started and forgotten; Web Audio frees a node once it has
 * stopped. The one sound that lasts is a motor, which a screen owns and has
 * to `stop`.
 *
 * Silent until the page has had a key or a click (`effectsOut`), and every
 * call before then is a no-op rather than an error.
 */

import type { RobotId } from '@/core/RobotSpec';
import { effectsOut } from './audio';

/** Where a sound is, relative to the listener. See `placeAt`. */
export interface Place {
  /** -1 left … 1 right. */
  pan: number;
  /** 0 … 1, from distance. */
  gain: number;
}

const HERE: Place = { pan: 0, gain: 1 };

/** Metres at which a sound is at half its level. The screen is about 32 across. */
const HALF_AT = 14;
/** Metres across the screen that count as hard left or right. */
const PAN_WIDTH = 22;

/**
 * Where a sound in the world is heard from, listening from the camera.
 *
 * Panned by where it lands ACROSS the screen, not by compass direction: the
 * camera looks north-east, so screen-right is the south-east, and a sound
 * panned by world x would come from the wrong side half the time. Another
 * storey is not heard at all — the floor is concrete.
 */
export function placeAt(
  x: number,
  y: number,
  floor: number,
  listener: { x: number; y: number; floor: number },
): Place {
  if (floor !== listener.floor) return { pan: 0, gain: 0 };
  const dx = x - listener.x;
  const dy = y - listener.y;
  // Screen-right is (1, -1)/√2 in the world.
  const across = (dx - dy) / Math.SQRT2;
  const distance = Math.hypot(dx, dy);
  return {
    pan: Math.max(-1, Math.min(1, across / PAN_WIDTH)),
    gain: 1 / (1 + (distance / HALF_AT) ** 2),
  };
}

// -- building blocks --------------------------------------------------------

let noiseBuffer: AudioBuffer | undefined;

function noise(context: AudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== context.sampleRate) {
    noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/** A panned, levelled input on the effects bus, or nothing before unlock. */
function voice(place: Place, level: number): { context: AudioContext; input: GainNode; now: number } | undefined {
  const out = effectsOut();
  if (!out || place.gain * level < 0.002) return undefined;
  const { context, bus } = out;
  const input = context.createGain();
  input.gain.value = place.gain * level;
  const panner = context.createStereoPanner();
  panner.pan.value = place.pan;
  input.connect(panner).connect(bus);
  return { context, input, now: context.currentTime };
}

/** A pitched blip with a fast attack and an exponential tail. */
function tone(
  v: { context: AudioContext; input: AudioNode; now: number },
  type: OscillatorType,
  from: number,
  to: number,
  length: number,
  level = 1,
  delay = 0,
): void {
  const { context, input } = v;
  const at = v.now + delay;
  const osc = context.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), at + length);
  const env = context.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(level, at + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(env).connect(input);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

/** A burst of filtered noise. */
function hiss(
  v: { context: AudioContext; input: AudioNode; now: number },
  filter: BiquadFilterType,
  frequency: number,
  length: number,
  level = 1,
  delay = 0,
  q = 0.8,
  sweepTo?: number,
): void {
  const { context, input } = v;
  const at = v.now + delay;
  const source = context.createBufferSource();
  source.buffer = noise(context);
  const shape = context.createBiquadFilter();
  shape.type = filter;
  shape.frequency.setValueAtTime(frequency, at);
  if (sweepTo) shape.frequency.exponentialRampToValueAtTime(sweepTo, at + length);
  shape.Q.value = q;
  const env = context.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(level, at + Math.min(0.006, length / 4));
  env.gain.exponentialRampToValueAtTime(0.0001, at + length);
  source.connect(shape).connect(env).connect(input);
  // A random start in the second of noise, so no two bursts are the same.
  source.start(at, Math.random() * 0.8, length + 0.05);
}

// -- the robots -------------------------------------------------------------

/**
 * A foot coming down. `weight` is 0 … 1 of the reference momentum the camera
 * kick uses, so the loudest step is the one that shakes the screen most.
 */
export function footfall(robot: RobotId, weight: number, place: Place = HERE): void {
  const w = Math.max(0.15, Math.min(1, weight));
  if (robot === 'voxxy') {
    // Light plastic: a soft tap. It was a 1.7 kHz tick with a click of high
    // noise, and at eight steps a second that was the most annoying thing
    // in the game (the author, 28 Sep). Lower, rounder, and quieter.
    const v = voice(place, 0.13 * w);
    if (!v) return;
    tone(v, 'sine', 620 + Math.random() * 80, 380, 0.05, 0.7);
    hiss(v, 'bandpass', 1500, 0.03, 0.25, 0, 1);
  } else if (robot === 'droid') {
    // Metal: two inharmonic partials ring for a moment over a scuff.
    const v = voice(place, 0.32 * w);
    if (!v) return;
    const f = 380 + Math.random() * 40;
    tone(v, 'sine', f, f * 0.97, 0.14, 0.6);
    tone(v, 'sine', f * 2.76, f * 2.7, 0.09, 0.3);
    hiss(v, 'bandpass', 1800, 0.05, 0.5, 0, 1.2);
  } else {
    // Weight: a sub thump that drops in pitch, and a dull body under it.
    const v = voice(place, 0.6 * w);
    if (!v) return;
    tone(v, 'sine', 95, 38, 0.32, 1);
    tone(v, 'triangle', 160, 70, 0.12, 0.35);
    hiss(v, 'lowpass', 420, 0.18, 0.45);
  }
}

/** Hitting something. Same scale as `footfall`, and much louder at the top. */
export function impact(robot: RobotId, weight: number, place: Place = HERE): void {
  const w = Math.max(0.1, Math.min(1, weight));
  if (robot === 'voxxy') {
    // A knock.
    const v = voice(place, 0.45 * w);
    if (!v) return;
    tone(v, 'triangle', 520, 260, 0.09, 0.8);
    hiss(v, 'bandpass', 1400, 0.06, 0.6, 0, 1.5);
  } else if (robot === 'droid') {
    // A clang.
    const v = voice(place, 0.55 * w);
    if (!v) return;
    for (const [ratio, level] of [[1, 0.7], [2.41, 0.4], [3.93, 0.25], [5.4, 0.15]] as const) {
      tone(v, 'sine', 240 * ratio, 232 * ratio, 0.5 / ratio ** 0.3, level);
    }
    hiss(v, 'highpass', 2500, 0.08, 0.5);
  } else {
    // A boom: loud enough to be a mistake.
    const v = voice(place, 0.85 * w);
    if (!v) return;
    tone(v, 'sine', 80, 28, 0.9, 1);
    tone(v, 'sawtooth', 120, 40, 0.25, 0.25);
    hiss(v, 'lowpass', 900, 0.5, 0.7, 0, 0.7, 120);
  }
}

/**
 * A robot's drive, running continuously and pitched by speed.
 *
 * Voxxy's whine rises fast and high; Biggy's drone is low and takes its time
 * — the same `speedFraction`, heard through each machine's own inertia.
 */
export class Motor {
  private nodes?: { osc: OscillatorNode; sub: OscillatorNode; filter: BiquadFilterNode; gain: GainNode; panner: StereoPannerNode };
  private readonly robot: RobotId;

  constructor(robot: RobotId) {
    this.robot = robot;
  }

  /** `speed` is 0 … 1 of top speed. */
  update(speed: number, place: Place): void {
    if (!this.nodes) this.nodes = this.build();
    const n = this.nodes;
    if (!n) return;
    const { context } = n.gain;
    const now = context.currentTime;
    const s = Math.max(0, Math.min(1, speed));
    const { base, range, level, lag, cutoff } = MOTORS[this.robot];
    n.osc.frequency.setTargetAtTime(base + range * s, now, lag);
    n.sub.frequency.setTargetAtTime((base + range * s) / 2, now, lag);
    n.filter.frequency.setTargetAtTime(cutoff * (0.6 + s), now, lag);
    // Silent standing still: an idle hum under a whole chapter is a drone
    // nobody asked for, and moving is what the sound is for.
    n.gain.gain.setTargetAtTime(level * place.gain * s ** 0.8, now, 0.08);
    n.panner.pan.setTargetAtTime(place.pan, now, 0.05);
  }

  stop(): void {
    const n = this.nodes;
    if (!n) return;
    const now = n.gain.context.currentTime;
    n.gain.gain.setTargetAtTime(0, now, 0.05);
    n.osc.stop(now + 0.3);
    n.sub.stop(now + 0.3);
    this.nodes = undefined;
  }

  private build(): Motor['nodes'] {
    const out = effectsOut();
    if (!out) return undefined;
    const { context, bus } = out;
    const osc = context.createOscillator();
    osc.type = 'sawtooth';
    const sub = context.createOscillator();
    sub.type = 'sine';
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2;
    const gain = context.createGain();
    gain.gain.value = 0;
    const panner = context.createStereoPanner();
    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain).connect(panner).connect(bus);
    osc.start();
    sub.start();
    return { osc, sub, filter, gain, panner };
  }
}

/** Each drive's pitch at rest and at full speed, how loud, and how sluggish. */
const MOTORS: Record<RobotId, { base: number; range: number; level: number; lag: number; cutoff: number }> = {
  // Voxxy's was a sawtooth up to 880 Hz; a whine that rises that far is a
  // mosquito. Now a lower hum with the top filtered off.
  voxxy: { base: 180, range: 260, level: 0.02, lag: 0.08, cutoff: 700 },
  droid: { base: 110, range: 190, level: 0.05, lag: 0.18, cutoff: 900 },
  biggy: { base: 42, range: 70, level: 0.11, lag: 0.55, cutoff: 380 },
};

// -- the interface ----------------------------------------------------------

/** A job done: two notes, up. */
export function done(): void {
  const v = voice(HERE, 0.22);
  if (!v) return;
  tone(v, 'triangle', 660, 660, 0.25, 0.8);
  tone(v, 'triangle', 990, 990, 0.45, 0.8, 0.09);
  tone(v, 'sine', 1980, 1980, 0.3, 0.2, 0.09);
}

/** A job missed, or a room lost: low, and falling. */
export function missed(): void {
  const v = voice(HERE, 0.25);
  if (!v) return;
  tone(v, 'triangle', 220, 150, 0.6, 0.8);
  tone(v, 'sine', 110, 75, 0.7, 0.6, 0.05);
}

/** Something picked up. */
export function pickUp(place: Place = HERE): void {
  const v = voice(place, 0.2);
  if (!v) return;
  tone(v, 'square', 300, 600, 0.08, 0.35);
  hiss(v, 'bandpass', 900, 0.1, 0.4, 0, 2);
}

/** Something put down. */
export function putDown(place: Place = HERE): void {
  const v = voice(place, 0.22);
  if (!v) return;
  tone(v, 'square', 420, 180, 0.1, 0.35);
  hiss(v, 'lowpass', 600, 0.12, 0.5);
}

/** The last seconds of a job running out. */
export function tick(urgent: boolean): void {
  const v = voice(HERE, urgent ? 0.14 : 0.08);
  if (!v) return;
  tone(v, 'square', urgent ? 1320 : 990, urgent ? 1320 : 990, 0.03, 0.5);
}

/**
 * One syllable of somebody talking: the non-verbal voice `ROADMAP.md` parked,
 * pitched per speaker, and making no claim to be anybody's real voice.
 */
export function blip(pitch: number): void {
  const v = voice(HERE, 0.06);
  if (!v) return;
  const f = pitch * (0.94 + Math.random() * 0.12);
  tone(v, 'square', f, f * 0.9, 0.045, 0.6);
}

/** A speaker's pitch, from their name: stable for a person, different between people. */
export function pitchOf(who: string, low = 150, high = 420): number {
  let hash = 2166136261;
  for (let i = 0; i < who.length; i += 1) hash = Math.imul(hash ^ who.charCodeAt(i), 16777619);
  return low + ((hash >>> 0) % 1000) / 1000 * (high - low);
}

/** The photographer's shutter: a click, a whirr, a click. */
export function shutter(): void {
  const v = voice(HERE, 0.35);
  if (!v) return;
  hiss(v, 'highpass', 2500, 0.02, 1);
  hiss(v, 'bandpass', 1200, 0.09, 0.25, 0.02, 4);
  hiss(v, 'highpass', 2000, 0.025, 0.8, 0.12);
}

/** The wormhole opening under you: a rising roar over `seconds`. */
export function whoosh(seconds: number): void {
  const v = voice(HERE, 0.4);
  if (!v) return;
  const { context, input, now } = v;
  const source = context.createBufferSource();
  source.buffer = noise(context);
  source.loop = true;
  const shape = context.createBiquadFilter();
  shape.type = 'bandpass';
  shape.Q.value = 1.4;
  shape.frequency.setValueAtTime(120, now);
  shape.frequency.exponentialRampToValueAtTime(3200, now + seconds);
  const env = context.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(1, now + seconds * 0.85);
  env.gain.exponentialRampToValueAtTime(0.0001, now + seconds + 0.4);
  source.connect(shape).connect(env).connect(input);
  source.start(now);
  source.stop(now + seconds + 0.5);
  tone(v, 'sine', 50, 200, seconds, 0.4);
}

/** A robot landing out of the air. Heavier, deeper. */
export function land(robot: RobotId): void {
  impact(robot, 0.8);
}

/** One robot becoming two: a shimmer, rising. */
export function shimmer(): void {
  const v = voice(HERE, 0.14);
  if (!v) return;
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(v, 'sine', f, f * 1.01, 0.6, 0.5, i * 0.07));
}
