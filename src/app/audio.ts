/**
 * Sound: one Web Audio context, a bus per kind of sound, and the files the
 * author supplies. See `docs/AUDIO.md` for the plan this is step one of.
 *
 * Files are found by FILE NAME at build time, the way portraits are: drop
 * `music-silence.ogg` into `src/audio/` and Chapter I has music, with nothing
 * to wire. A name with no file is silence, not an error — `npm run shoot`
 * fails on a 404, and a chapter without its track yet is a quiet chapter,
 * not a broken one.
 *
 * Browsers refuse to make a sound before the page has been clicked or typed
 * into. So the context is created on the first key or click, and whatever a
 * screen asked for before then starts at that moment. On the menu that is
 * the first arrow key, which is as early as any page is allowed.
 *
 * Module state rather than something a screen owns: music has to carry on
 * across a screen change — the wormhole IS a screen change — and crossfade
 * rather than cut.
 */

const files = import.meta.glob('../audio/*.{ogg,mp3,m4a,opus,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const byName = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const name = path.split('/').pop() ?? '';
  byName.set(name.replace(/\.[^.]+$/, ''), url);
}

/** Seconds a track takes to fade in, and the old one to fade out. */
const FADE = 2.2;
/** Where each bus sits. The robots, when they speak, go on top of the music. */
const MUSIC_LEVEL = 0.55;
const AMBIENCE_LEVEL = 0.7;
/** The robots and the interface, synthesised in `sfx.ts`. */
const EFFECTS_LEVEL = 0.9;

/**
 * Per-track level, by ear. The three tracks measure about the same, but
 * Chapter I's is sparse and II's and III's are busy grooves that sat over
 * the robots: 28 Sep, the author could not hear the sounds under them.
 */
const TRIM: Record<string, number> = {
  'music-javapolis': 0.5,
  'music-capacity': 0.5,
};

const MUTE_KEY = 'ghost-light:muted';

interface Bus {
  gain: GainNode;
  /** The loop playing now, and which file it is. */
  playing?: { name: string; source: AudioBufferSourceNode; fade: GainNode };
  /** What a screen last asked for, which may not have loaded or unlocked yet. */
  wanted?: string;
}

let context: AudioContext | undefined;
let master: GainNode | undefined;
const buses: { music?: Bus; ambience?: Bus; effects?: Bus } = {};
const buffers = new Map<string, Promise<AudioBuffer | undefined>>();
let muted = readMuted();
const wanted: { music?: string; ambience?: string } = {};

/**
 * Listen for the first gesture, and for M. Called once, at boot.
 *
 * M is here rather than in a screen's bindings because those are cleared on
 * every screen change, and mute has to hold on every screen.
 */
export function installAudio(): void {
  const unlock = (): void => {
    start();
    window.removeEventListener('keydown', unlock, true);
    window.removeEventListener('pointerdown', unlock, true);
  };
  window.addEventListener('keydown', unlock, true);
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM' && !event.repeat) setMuted(!muted);
  });
}

/** Whether sound is off. Remembered per browser, like the graphics switch. */
export function isMuted(): boolean {
  return muted;
}

const listeners = new Set<() => void>();
/** Hear about M being pressed, so a screen can show the state. */
export function onMuteChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether a file of this name was supplied. */
export function hasSound(name: string): boolean {
  return byName.has(name);
}

/**
 * Loop this track on the music bus, crossfading from whatever was playing.
 * The first name that has a file wins; none at all fades the music out.
 * Asking for what is already playing changes nothing, so a menu shown twice
 * does not restart its tune.
 */
export function playMusic(...names: string[]): void {
  wanted.music = names.find(hasSound);
  if (buses.music) void play(buses.music, wanted.music);
}

/** The same for the room tone under everything. */
export function playAmbience(...names: string[]): void {
  wanted.ambience = names.find(hasSound);
  if (buses.ambience) void play(buses.ambience, wanted.ambience);
}

/**
 * Where synthesised sound goes, once there is anywhere for it to go. Before
 * the first key or click there is not, and a footfall then is simply silent
 * — nobody has asked for it to be heard yet.
 */
export function effectsOut(): { context: AudioContext; bus: AudioNode } | undefined {
  if (!context || !buses.effects || context.state !== 'running') return undefined;
  return { context, bus: buses.effects.gain };
}

function start(): void {
  if (context) return;
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return;
  context = new Context();
  master = context.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(context.destination);
  buses.music = bus(MUSIC_LEVEL);
  buses.ambience = bus(AMBIENCE_LEVEL);
  buses.effects = bus(EFFECTS_LEVEL);
  void context.resume();
  void play(buses.music, wanted.music);
  void play(buses.ambience, wanted.ambience);
}

function bus(level: number): Bus {
  const gain = context!.createGain();
  gain.gain.value = level;
  gain.connect(master!);
  return { gain };
}

async function play(target: Bus, name: string | undefined): Promise<void> {
  target.wanted = name;
  if (target.playing?.name === name) return;
  fadeOut(target);
  if (!name || !context) return;

  const buffer = await load(name);
  // Somebody changed their mind while it loaded — the player left the menu
  // before its music arrived. Play only what is still wanted.
  if (!buffer || target.wanted !== name || target.playing?.name === name) return;

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const fade = context.createGain();
  const now = context.currentTime;
  fade.gain.setValueAtTime(0, now);
  fade.gain.linearRampToValueAtTime(TRIM[name] ?? 1, now + FADE);
  source.connect(fade).connect(target.gain);
  source.start();
  target.playing = { name, source, fade };
}

function fadeOut(target: Bus): void {
  const old = target.playing;
  if (!old || !context) return;
  target.playing = undefined;
  const now = context.currentTime;
  old.fade.gain.cancelScheduledValues(now);
  old.fade.gain.setValueAtTime(old.fade.gain.value, now);
  old.fade.gain.linearRampToValueAtTime(0, now + FADE);
  old.source.stop(now + FADE + 0.05);
}

function load(name: string): Promise<AudioBuffer | undefined> {
  let pending = buffers.get(name);
  if (!pending) {
    const url = byName.get(name);
    pending = url
      ? fetch(url)
          .then((response) => response.arrayBuffer())
          .then((data) => context!.decodeAudioData(data))
          .catch((error: unknown) => {
            // A file the browser cannot decode is a quiet chapter, said once.
            console.warn(`audio: could not play ${name}`, error);
            return undefined;
          })
      : Promise.resolve(undefined);
    buffers.set(name, pending);
  }
  return pending;
}

function setMuted(next: boolean): void {
  muted = next;
  try {
    window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  } catch {
    // Nowhere to remember it; it still holds for this visit.
  }
  if (master && context) {
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(next ? 0 : 1, now + 0.15);
  }
  for (const listener of listeners) listener();
}

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}
