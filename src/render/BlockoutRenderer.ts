/**
 * Grey-box renderer.
 *
 * The whole building and every robot as extruded boxes, built from the venue
 * data and the chapter palette. It exists so that movement, collision and
 * level layout can be tuned and judged before a single sprite is generated —
 * which is the correct order to work in, and the only order that fits the
 * schedule.
 *
 * It is not throwaway. The art pass replaces the ROBOT meshes with models and
 * dresses the ROOMS with materials; the scene graph, the camera and the venue
 * it is built from all stay exactly as they are here.
 *
 * WHAT MOVING TO THREE.JS BOUGHT
 *
 * The 2D version of this file was 746 lines, and roughly three hundred of them
 * were a depth buffer written by hand: a painter's-order queue re-sorted every
 * frame, a Sutherland-Hodgman clipper so a staircase could not paint out of
 * its own stairwell, precomputed screen-space bounds so five thousand seats
 * could be culled before they were projected, and a per-face shading table.
 * A z-buffer does all four correctly and for free, so all four are gone.
 *
 * What replaces them is static: the building is built ONCE, per storey, into
 * instanced meshes, and a frame does nothing but move the robots. The building
 * has stopped being redrawn sixty times a second to look the same.
 */

import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PointLight,
  RingGeometry,
  Scene,
  SphereGeometry,
  Vector3,
  type OrthographicCamera,
} from 'three';
import type { Actor } from '@/core/Sim';
import type { RobotSpec } from '@/core/RobotSpec';
import { climbFraction, downhill } from '@/core/Traversal';
import {
  Crowd,
  PERSON_ARM_BOTTOM,
  PERSON_ARM_TOP,
  PERSON_ARM_WIDE,
  PERSON_HEAD_WIDE,
  PERSON_HEIGHT,
  PERSON_HIP,
  PERSON_LEG_TOP,
  PERSON_NECK,
  PERSON_SHOULDER,
  PERSON_SHOULDER_BOTTOM,
  PERSON_THICK,
  PERSON_TORSO_WIDE,
  SEATED_ARM_BOTTOM,
  SEATED_ARM_TOP,
  SEATED_ARM_WIDE,
  SEATED_LAP_FORWARD,
  SEATED_PERSON_HEIGHT,
  SEATED_SHOULDER,
  SEATED_SHOULDER_BOTTOM,
  SEATED_SPINE_BACK,
  SEATED_TORSO_WIDE,
  SEATED_THIGH_HIGH,
  SEATED_THIGH_LONG,
  SEATED_TORSO_THICK,
  SEATED_TORSO_TOP,
  type Person,
} from '@/core/Crowd';
import type { Decay, DecayPiece } from '@/core/Decay';
import { renderPos } from '@/core/Sim';
import {
  FLOOR_HEIGHT,
  groundAt,
  rect,
  type Level,
  type Link,
  type Material,
  type Rect,
  type Room,
  type Venue,
} from '@/core/Venue';
import type { Palette } from '@/chapters/Chapter';
import {
  createCutawayUniforms,
  cutawayMaterial,
  cutawayRadius,
  CUTAWAY_MAX,
  type CutawayUniforms,
} from './Cutaway';

/**
 * Tallest an obstacle is DRAWN, in metres, whatever its real height.
 *
 * The exhibition hall's columns are 5.4 m — the real clear height under the
 * auditorium level — and drawn at full height they turn a 52 x 49 m room into
 * a thicket of poles that hides the floor, the robot and any sense of how far
 * away the far wall is. The room measures correct and reads far too small.
 *
 * This is not a fudge of the simulation: collision is two-dimensional and has
 * never consulted `height`. It is the same decision as not drawing the
 * ceiling, applied one level down — and a column holding up a floor we do not
 * draw is the part that was inconsistent. Cutaway height is how isometric
 * games have always drawn interiors.
 *
 * Stairs are exempt. A flight cut off at 2.7 m is a staircase with its top
 * missing and a robot walking up out of it into the air, which is what the 2D
 * renderer's `drawnRise` squash existed to hide. With real depth the honest
 * geometry sorts correctly, so it is drawn.
 */
const MAX_DRAWN_HEIGHT = 2.7;

/**
 * Where the cutaway actually cuts, for a piece standing on a given plate.
 *
 * A PLANE through the building, not a height limit per object. Measured from
 * the piece's own plate it is neither: an auditorium's stage is four metres
 * under the corridor, so a wall down there was being stopped 2.7 m above the
 * stage — a metre and a half BELOW the cut — and a projection screen filling
 * that end wall came out a third of its proper size.
 *
 * Never lower than the plate itself, though, because the concourse stands 1.2 m
 * over the hall and the things on it are standing on the floor you are walking
 * on. So: 2.7 m above the storey datum, or above the plate, whichever is more.
 */
function cutAt(plate: number): number {
  return Math.max(plate, 0) + MAX_DRAWN_HEIGHT;
}

/** How thick a floor plate is drawn, metres. Only its edge is ever seen. */
const PLATE_THICKNESS = 0.14;

/** Sideways speed, m/s, above which a robot is sliding rather than tracking. */
const SLIP_THRESHOLD = 0.4;

/** Seconds a skid mark stays on the floor. */
const MARK_LIFE = 2.6;

/** Hard cap on marks so a long tuning session cannot grow unbounded. */
const MAX_MARKS = 320;

/**
 * How far above a floor plate its decals sit, metres.
 *
 * Enough to beat depth precision, small enough that nothing reads as floating:
 * at the camera's 34 px per metre this is a fortieth of a pixel.
 */
const DECAL_LIFT = 0.025;

/**
 * Ambient and key light, as a fraction of full reflectance.
 *
 * Solved, not chosen. The 2D renderer shaded the three visible faces of every
 * box by hand — top full, south 0.63 of it, west 0.52 — and these are the two
 * intensities and the one direction that reproduce that from a light actually
 * having a position. It is the same picture arrived at the right way round,
 * and it is now a thing the art pass can move rather than a table of
 * multipliers that had to be kept in step with the projection.
 *
 * Softer than the hand-shaded version on purpose: matching 0.63 exactly needs
 * a light so near vertical that every unlit surface goes to pure black, which
 * is not a trade worth making for a wall you can already tell apart.
 */
/**
 * How much of what stands behind it a pane of glazing lets through.
 *
 * The front of the building is a wall of glass and the concourse is on the
 * other side of it, so an opaque pane is a wall with a different colour —
 * which is the one thing glass is not. Low enough that the surface still
 * reads as a plane catching the light, high enough that you can see the
 * reception desk through it from outside.
 */
const GLAZING_OPACITY = 0.42;

const AMBIENT = 0.111;
const KEY = 0.972;

/**
 * Direction the key light comes from.
 *
 * Above and to the south-west, which is where the camera is. A key light
 * behind the camera is flat lighting and normally a mistake; here it is the
 * point, because the three faces of every box in sight are exactly the three
 * this lights, and the shading has to tell them apart rather than set a mood.
 * More south than west, so the two vertical faces separate.
 */
const KEY_DIRECTION = new Vector3(-0.196, -0.355, 0.914);

/**
 * three.js lights are physically scaled: a Lambert surface reflects
 * `intensity / PI`, so an intensity of 1 is a face at about a third of its own
 * colour. Both lights are pre-multiplied by this to make `AMBIENT` and `KEY`
 * mean the fraction of the surface colour they say they mean.
 */
const LAMBERT_SCALE = Math.PI;

/**
 * Metres between the lights a reveal hangs. A cinema hangs them about this
 * far apart, and it is also what keeps a 2500 m² hall from being lit by three
 * bulbs down its middle.
 */
const REVEAL_SPACING = 15;

/** Peak intensity of one reveal light, before the Lambert scale. */
const REVEAL_POWER = 5;

/** Scale of an instance that is not there any more. Not zero: see instanceBoxes. */
const GONE = 1e-4;

/**
 * The two inks that are not a robot's own livery.
 *
 * A visor is dark whatever colour the machine is painted, and a lit eye is
 * a lit eye. Both are `MeshLambert` like everything else rather than
 * emissive: a glow would be the only bloom in a game that has none.
 */
const VISOR = 0x14171a;
const EYES = 0xffc061;

/**
 * The two animals. Not palette entries: see `placeAnimal`.
 *
 * The dog's coat is lifted well off the black it really is, because Chapter I
 * renders at a quarter of Chapter III's light and a true Bouvier in there is
 * a dog-shaped hole. The beard carries the breed and has to stay legible.
 */
const DOG_COAT = 0x55565e;
const DOG_BEARD = 0xa8a294;
const CAT_FUR = 0xc2bcae;

/** Boxes an animal costs. A dog is thirteen; the cat is ten. */
const ANIMAL_PARTS = 14;

/**
 * How much two boxes of the same material may differ in tone, either way.
 *
 * Everything in this building is one of about a dozen flat colours, and a
 * thirty-metre wall painted in exactly the same value as the column in
 * front of it reads as one dead slab with a line on it. Real surfaces are
 * not uniform; more to the point, a blockout that varies slightly reads as
 * MADE of things, which is the whole difference between a model and a
 * placeholder.
 *
 * Keyed off the box's own position, so it is stable — a wall does not
 * shimmer when the storey is rebuilt — and small enough that nobody can
 * point at it and say a wall is two colours.
 */
const TONE_SPREAD = 0.055;

/**
 * Depth of the pale band drawn along the top of anything the cutaway cuts.
 *
 * `MAX_DRAWN_HEIGHT` slices every wall and column at 2.7 m, which left them
 * as boxes that simply stop. Drawing the cut as a band turns the artefact
 * into the device it should have been all along: the building now reads as
 * a sectioned architectural model, the columns get a capital and the walls
 * get a cornice, and all of it falls out of geometry that was already being
 * clipped.
 */
const CUT_BAND = 0.08;
const CUT_BAND_LIFT = 1.16;

/**
 * A stable 0..1 from a position. Not random: the same box must come back
 * the same colour every time the chapter is entered.
 */
function tone(x: number, y: number, z: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

/** Most movers a chapter may have on one storey. Sized for capacity. */
const MAX_MOVERS = 400;
/** Boxes per standing person: legs, torso, two arms. */
const PERSON_PARTS = 4;
/** Blobs per person: the shoulder mass and the head. */
const PERSON_BLOBS = 2;

/**
 * Segments on a crowd blob. A head is about six pixels across, so six by
 * four is indistinguishable from anything rounder and costs half as much.
 *
 * Kept for the saving, but NOT the fix for anything: a packed Chapter III
 * runs its simulation at about a quarter of real time under the headless
 * software renderer, and halving the crowd's triangle count from half a
 * million moved that figure not at all. The cost is fill rate — thousands
 * of small overlapping objects, shaded pixel by pixel on a CPU — which is
 * the one thing a GPU makes free, and the reason this needs measuring on
 * real hardware rather than here. See docs/PROMPTS.md.
 */
const CROWD_SEGMENTS = 6;

/**
 * How a robot is DRAWN on a flight, which is not how it is simulated.
 *
 * The simulation treats a staircase as a smooth ramp — `surfaceHeight`
 * interpolates the whole flight — because that is the cheap, stable thing
 * for a solver to stand a body on, and nothing about the physics wants a
 * sawtooth. Drawn that way the machine glides up an invisible slope with
 * the steps passing underneath it, which is exactly the escalator look.
 *
 * So the renderer quantises the height to the tread the robot is actually
 * over, and adds a small arc between one tread and the next. The most it
 * ever disagrees with the simulation by is half a riser — nine centimetres
 * — and it is the difference between climbing and floating.
 */
/**
 * Where in a tread's width the body starts and finishes rising, 0..1.
 *
 * It dwells at one tread, lifts over the middle of the going, and settles
 * on the next — which is what a body climbing stairs actually does, and
 * the reason this is not a snap to the nearest tread. Snapping was the
 * first attempt: it put the feet on a tread at every instant and paid for
 * it with a 0.18 m teleport at the halfway point of every single step.
 * Continuous beats correct-at-every-instant when the eye is watching the
 * motion rather than the frame.
 */
const STEP_DWELL_START = 0.18;
const STEP_DWELL_END = 0.82;
/** A little extra lift at the top of the swing, over the eased rise. */
const STEP_ARC = 0.022;
/**
 * How a machine carries itself on a staircase, in radians.
 *
 * It leans INTO the climb, which is the opposite of what it does on a
 * ramp and the opposite of what this did first. A ramp tips a chassis
 * because the wheels follow the surface; a staircase is walked, and a
 * body walking up one leans forward over its feet. Nose-up on stairs read
 * as rearing — the machine appeared to be falling over backwards away
 * from the direction it was going.
 *
 * Both are scaled by how much of the travel is actually up the flight, so
 * a robot crossing a staircase sideways stays square and only one going
 * straight up it leans the full amount.
 */
const STAIR_LEAN = 0.09;
const STEP_ROCK = 0.05;
/** How far a machine leans into a gradient, as a fraction of the real angle. */
const SLOPE_LEAN = 0.8;

/** Hermite ease between two edges. 0 below `from`, 1 above `to`. */
function smoothstep(x: number, from: number, to: number): number {
  const u = Math.max(0, Math.min(1, (x - from) / (to - from)));
  return u * u * (3 - 2 * u);
}

/**
 * How a person is coloured, from the one crowd colour the chapter gives.
 *
 * Derived rather than four more palette entries, the same way the skid
 * marks derive from the floor. Trousers are the crowd colour darkened,
 * clothing is it varied per person, and the head is it lifted towards
 * whatever this era's near-white is — so a crowd stays the colour the
 * chapter chose while still having a head you can see.
 */
const TROUSER_SHADE = 0.62;
const CLOTHING_RANGE: [number, number] = [0.78, 1.34];
const HEAD_LIFT = 0.46;

/**
 * Exponent that carries the chapter's light level into the renderer's space.
 *
 * `lightLevel` and every palette colour were tuned against a renderer that
 * multiplied packed sRGB bytes; three.js lights a linear scene and converts
 * back on the way out, where the same multiplier lands nowhere near the same
 * brightness. Raising the exposure by the sRGB gamma puts it back: Chapter I
 * at 0.18 is as dark as it was measured to be, not the washed-out 0.70 that a
 * naive linear multiply produces.
 */
const SRGB_GAMMA = 2.2;

interface SkidMark {
  x: number;
  y: number;
  /**
   * Height of the floor it was scuffed into, metres.
   *
   * Not optional and not zero. A mark is a decal on a surface, and this
   * building has surfaces at every height between the stage of Room 8 and the
   * top of the reception concourse — so a mark drawn at the storey datum
   * regardless is correct only in the corridor. Halfway down a rake it hung
   * two metres over the robot that left it, in mid-air, which is what a
   * footprint on nothing looks like.
   */
  z: number;
  /** Half-width of the mark in metres — heavier robots leave a wider scar. */
  width: number;
  life: number;
}

/** One extruded box of static geometry, in metres. */
interface Box {
  bounds: Rect;
  bottom: number;
  top: number;
  colour: number;
}

/** The parts of a robot that move every frame. */
interface RobotView {
  group: Group;
  /**
   * Pitch, applied inside `body` so it is about the machine's own lateral
   * axis and pivots on its feet rather than on the world's axes.
   */
  tilt: Group;
  /**
   * The machine itself, as a handful of primitives.
   *
   * A Group rather than a Mesh, and it is ROTATED by the robot's heading —
   * which is what retired the facing pip. A box is symmetrical and needs a
   * bead stuck on the front to show which way it is pointing; a shape with a
   * head on it does not.
   */
  body: Group;
  shadow: Mesh;
  stopLine: Line;
  stopRing: Mesh;
}

/**
 * One primitive of a robot, in metres, in the machine's own frame.
 *
 * `x` is forward, `y` is to its left, `z` is up from the soles of its feet.
 * Everything is stated as a fraction of `radius` and `height` at the call
 * site, so a change to `RobotSpec` moves the art with the collision shape
 * instead of leaving the two to drift.
 */
interface RobotPart {
  shape: 'box' | 'blob';
  x?: number;
  y?: number;
  z: number;
  w: number;
  d: number;
  h: number;
  colour: number;
}

const SCRATCH = new Object3D();
const SCRATCH_COLOUR = new Color();
const SCRATCH_VIEW = new Vector3();

export class BlockoutRenderer {
  /** The scene this renderer owns. The screen points a camera at it. */
  readonly scene = new Scene();

  private readonly venue: Venue;
  private readonly palette: Palette;
  /**
   * The camera, because the cutaway is a screen-space effect and has to be
   * told where the screen is. Nothing else here looks at it: the building is
   * built at its own coordinates and three does the rest.
   */
  private readonly camera: OrthographicCamera;
  private readonly cutaway: CutawayUniforms = createCutawayUniforms();

  /** Static building geometry, one group per storey. Only one is ever shown. */
  private readonly storeys = new Map<Level, Group>();

  private readonly robots = new Map<Actor, RobotView>();
  private readonly marks: SkidMark[] = [];
  private readonly markMesh: InstancedMesh;
  private readonly markColour: Color;
  private readonly floorColour: Color;
  /** The chapter's light level as a plain multiplier, for the unlit decals. */
  private readonly exposure: number;

  /**
   * Draw the stopping marker and velocity vector. Set from the screen's F1
   * debug flag. The marker is the single most useful thing on screen while
   * tuning movement, and it may well survive into the shipping game for
   * Chapter III, where you are directing Biggy rather than driving it and need
   * to see where its momentum has already committed it.
   */
  telemetry = false;

  /**
   * World-space markers for the objective's activities.
   *
   * UNLIT, and that is the whole reason they exist as geometry rather than as
   * something clever: Chapter I is played at a light level of 0.18, and a
   * thing the player is supposed to find has to be visible in a building that
   * is deliberately almost too dark to read. A Lambert post would be a rumour.
   */
  private readonly markerGroup = new Group();
  private readonly markerMeshes = new Map<string, Mesh>();
  private readonly markerGeometry = new BoxGeometry(0.45, 0.45, 2.3);
  private readonly markerDisc = new CircleGeometry(1.3, 24);

  /**
   * The lamp the cast carries, and the lights the player switches back on.
   *
   * Both are real lights rather than a post-process, so a revealed zone lights
   * the geometry that is actually in it and the building comes back a room at
   * a time. See `Activity.Reveal`.
   */
  private lamp: PointLight | undefined;
  private readonly revealed: PointLight[] = [];
  /**
   * The reveal rigs, by the id of whatever owns them.
   *
   * Keyed rather than accumulated because Chapter II drives one of these
   * EVERY FRAME off a draining meter, and the unkeyed version hung a fresh
   * grid of point lights on the storey each time it was asked.
   */
  private readonly zoneLights = new Map<string, PointLight[]>();

  /**
   * The people on their feet, rewritten every frame.
   *
   * One mesh for the whole game rather than one per storey, because only the
   * visible storey is ever written into it — a mover on the floor you are not
   * looking at costs nothing at all.
   */
  /**
   * The building as seen from OUTSIDE it, above the cutaway plane.
   *
   * Everything is drawn to 2.7 m so a player can see into rooms, which is
   * right from inside and leaves a ten-metre building as a knee-high stump
   * the moment you walk out of the front door. This holds the rest of the
   * elevation — the part above the cut on this storey, and the whole of the
   * storey above, which is otherwise not drawn at all because only one
   * storey is ever visible.
   *
   * Shown only while the player is outside, so it never stands between the
   * camera and a room.
   */
  private readonly envelope = new Group();

  private readonly crowd: Crowd;
  private readonly decay: Decay;
  /** The baked audience of each storey, by room, so a room can be emptied. */
  private readonly seated = new Map<Level, SeatedStorey>();
  private readonly moverMesh: InstancedMesh;
  private readonly moverHeads: InstancedMesh;

  constructor(
    camera: OrthographicCamera,
    venue: Venue,
    palette: Palette,
    lightLevel: number,
    crowd: Crowd,
    decay: Decay,
  ) {
    this.camera = camera;
    this.venue = venue;
    this.palette = palette;
    // Before the storeys are built: each one bakes its own seated population
    // in as it goes, which is what makes five thousand people free. The decay
    // rides in the same way and for the same reason — it is a few thousand
    // more static boxes that never change once the chapter has loaded.
    this.crowd = crowd;
    this.decay = decay;

    // The same curve the 2D renderer multiplied every colour by, applied to
    // the lights instead. Chapter I's darkness is its light level, not a
    // pre-dimmed palette — see the note at the top of chapters/registry.ts.
    this.exposure = 0.35 + lightLevel * 0.65;
    const lit = LAMBERT_SCALE * this.exposure ** SRGB_GAMMA;

    this.scene.add(new AmbientLight(0xffffff, AMBIENT * lit));
    const key = new DirectionalLight(0xffffff, KEY * lit);
    key.position.copy(KEY_DIRECTION);
    this.scene.add(key);

    for (const floor of storeysOf(venue)) {
      const group = this.buildStorey(floor);
      group.visible = false;
      this.storeys.set(floor, group);
      this.scene.add(group);
    }

    // The marks and the floor they scuff are unlit — a decal has no normal
    // worth lighting — so the chapter's exposure has to be applied to them by
    // hand, or a skid mark stays at full brightness in a dark building.
    this.floorColour = new Color(shade(palette.floor, this.exposure));
    this.markColour = new Color(shade(palette.floor, this.exposure * 0.5));
    this.markMesh = new InstancedMesh(
      new CircleGeometry(1, 18),
      // Opaque, and faded by lerping toward the floor it is scuffing rather
      // than by alpha: an InstancedMesh has one material and therefore one
      // opacity, but it has a colour per instance.
      new MeshBasicMaterial({ depthWrite: false }),
      MAX_MARKS,
    );
    this.markMesh.renderOrder = 1;
    this.markMesh.count = MAX_MARKS;
    this.markMesh.frustumCulled = false;
    for (let i = 0; i < MAX_MARKS; i += 1) {
      SCRATCH.scale.setScalar(0);
      SCRATCH.updateMatrix();
      this.markMesh.setMatrixAt(i, SCRATCH.matrix);
      this.markMesh.setColorAt(i, this.markColour);
    }
    this.scene.add(this.markMesh);
    this.scene.add(this.markerGroup);

    this.buildEnvelope();
    this.envelope.visible = false;
    this.scene.add(this.envelope);

    this.moverMesh = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      // White, because the instance colour MULTIPLIES the material's. Tint
      // it here and every person comes out the crowd colour squared.
      new MeshLambertMaterial({ color: 0xffffff }),
      MAX_MOVERS * PERSON_PARTS,
    );
    this.moverMesh.count = 0;
    // Allocate the colour buffer up front: three thousand people is three
    // parts each and the first frame would otherwise grow it mid-render.
    this.moverMesh.setColorAt(0, SCRATCH_COLOUR.set(0xffffff));
    // They are scattered over the whole building, so the bounding sphere of
    // the mesh is meaningless and culling it by that sphere hides the lot.
    this.moverMesh.frustumCulled = false;
    this.scene.add(this.moverMesh);

    this.moverHeads = new InstancedMesh(
      new SphereGeometry(0.5, CROWD_SEGMENTS, CROWD_SEGMENTS - 2),
      new MeshLambertMaterial({ color: 0xffffff }),
      MAX_MOVERS * PERSON_BLOBS,
    );
    this.moverHeads.count = 0;
    this.moverHeads.frustumCulled = false;
    this.moverHeads.setColorAt(0, SCRATCH_COLOUR.set(0xffffff));
    this.scene.add(this.moverHeads);
  }

  /** Trousers, clothing and head for one person, in this era's colours. */
  private personColours(person: Person): [number, number, number] {
    /*
     * The one exception to "a crowd is a mass and takes one colour".
     *
     * Somebody you can talk to has to be findable in a full house, and at
     * capacity there are five hundred people standing up. In the crowd's own
     * colour an attendant is a figure among figures — a marker post can say
     * an activity is HERE, but not which of the four people under it you are
     * meant to be speaking to.
     *
     * A third of the way to the accent is enough. Fully accented they read
     * as a prop rather than a person, and the rule the crowd colour exists
     * for — that a full room photographs as one mass — still holds with three
     * of them in the building.
     */
    const crowd = person.posted ? mix(this.palette.crowd, this.palette.accent, 0.34) : this.palette.crowd;
    const [low, high] = CLOTHING_RANGE;
    return [
      shade(crowd, TROUSER_SHADE),
      shade(crowd, low + person.tint * (high - low)),
      mix(crowd, this.palette.sign, HEAD_LIFT),
    ];
  }

  /**
   * A seated person: a lap, a torso against the rest, and a head over it.
   *
   * Every seat in the building faces along x — towards its own stage — so
   * which way "forward" is comes out of the person's heading as a sign, and
   * the parts can stay axis-aligned. That is what lets three thousand of
   * them be baked into one instanced mesh with no rotation at all.
   */
  private seatedBoxes(person: Person): Box[] {
    const [trousers, clothing] = this.personColours(person);
    const f = Math.cos(person.heading) >= 0 ? 1 : -1;

    // The lap, running forward over the pan from the hips.
    const lapCentre = person.x + f * SEATED_LAP_FORWARD;
    // The spine, tucked back against the rest rather than centred on the pan.
    const spine = person.x - f * SEATED_SPINE_BACK;

    return [
      {
        bounds: rect(
          lapCentre - SEATED_THIGH_LONG / 2,
          person.y - SEATED_SHOULDER / 2 + 0.03,
          SEATED_THIGH_LONG,
          SEATED_SHOULDER - 0.06,
        ),
        bottom: person.z,
        top: person.z + SEATED_THIGH_HIGH,
        colour: trousers,
      },
      {
        bounds: rect(
          spine - SEATED_TORSO_THICK / 2,
          person.y - SEATED_TORSO_WIDE / 2,
          SEATED_TORSO_THICK,
          SEATED_TORSO_WIDE,
        ),
        // Overlapping the lap, so hip and thigh are one mass rather than two
        // stacked slabs with a seam between them.
        bottom: person.z + SEATED_THIGH_HIGH * 0.5,
        top: person.z + SEATED_TORSO_TOP,
        colour: clothing,
      },
      // Arms down either side, darker — the same tonal trick the walkers
      // use, and the same reason: at this size an arm is a stripe, not a
      // shape.
      ...[1, -1].map((sideOf) => ({
        bounds: rect(
          spine - SEATED_TORSO_THICK / 2,
          person.y + (sideOf * (SEATED_TORSO_WIDE + SEATED_ARM_WIDE)) / 2 - SEATED_ARM_WIDE / 2,
          SEATED_TORSO_THICK,
          SEATED_ARM_WIDE,
        ),
        bottom: person.z + SEATED_ARM_BOTTOM,
        top: person.z + SEATED_ARM_TOP,
        colour: shade(clothing, 0.74),
      })),
    ];
  }

  /** A seated person's rounded parts: the shoulder mass and the head. */
  private seatedBlobs(person: Person): Box[] {
    const [, clothing, head] = this.personColours(person);
    const f = Math.cos(person.heading) >= 0 ? 1 : -1;
    const spine = person.x - f * SEATED_SPINE_BACK;
    return [
      {
        bounds: rect(
          spine - SEATED_TORSO_THICK / 2,
          person.y - SEATED_SHOULDER / 2,
          SEATED_TORSO_THICK,
          SEATED_SHOULDER,
        ),
        bottom: person.z + SEATED_SHOULDER_BOTTOM,
        top: person.z + SEATED_TORSO_TOP,
        colour: clothing,
      },
      {
        bounds: rect(
          spine - PERSON_HEAD_WIDE / 2,
          person.y - PERSON_HEAD_WIDE / 2,
          PERSON_HEAD_WIDE,
          PERSON_HEAD_WIDE,
        ),
        bottom: person.z + SEATED_TORSO_TOP - 0.03,
        top: person.z + SEATED_PERSON_HEIGHT,
        colour: head,
      },
    ];
  }

  /**
   * The two animals, drawn as themselves.
   *
   * Colours are hard-coded here beside `VISOR` and `EYES`, and for the same
   * reason those are: a dog is not dressed by the era. The building is read
   * three ways and the dog living in it is the same dog.
   *
   * The DOG is a Bouvier des Flandres, which is a very specific silhouette
   * and a lucky one to have to draw out of boxes: square, low, heavy-boned,
   * with a head that is mostly a beard. At twenty pixels tall none of the
   * coat texture survives, so all of the breed has to live in the outline —
   * a body as long as it is tall, short thick legs, and that pale muzzle
   * stuck out in front of a dark head, which is the one thing about a
   * Bouvier that reads at any size.
   *
   * The CAT is mostly tail. Everything else at this scale is a smudge the
   * size of a robot's foot; the tail up is what says cat from across a hall.
   */
  private placeAnimal(index: number, animal: Person): number {
    let i = index;
    const part = (
      from: number,
      to: number,
      thick: number,
      wide: number,
      colour: number,
      across = 0,
      along = 0,
    ): void => {
      i = this.placePart(i, animal, from, to, thick, wide, colour, across, along);
    };

    if (animal.shape === 'dog') {
      part(0.30, 0.62, 0.62, 0.30, DOG_COAT);
      // Chest deeper than the barrel and shoulders wider than the hips: the
      // breed is front-heavy and it is most of why it reads as a working dog
      // rather than as a large spaniel.
      part(0.26, 0.64, 0.28, 0.34, DOG_COAT, 0, 0.2);
      part(0.30, 0.60, 0.22, 0.31, DOG_COAT, 0, -0.26);
      for (const along of [0.22, -0.22]) {
        for (const across of [0.11, -0.11]) part(0, 0.32, 0.11, 0.1, DOG_COAT, across, along);
      }
      part(0.48, 0.68, 0.16, 0.22, DOG_COAT, 0, 0.36);
      part(0.52, 0.74, 0.24, 0.24, DOG_COAT, 0, 0.48);
      part(0.48, 0.66, 0.18, 0.22, DOG_BEARD, 0, 0.62);
      for (const across of [0.1, -0.1]) part(0.72, 0.8, 0.1, 0.07, DOG_COAT, across, 0.46);
      // Docked to a stub, which is how the breed is nearly always seen.
      part(0.52, 0.64, 0.12, 0.1, DOG_COAT, 0, -0.42);
      return i;
    }

    /*
     * Half again bigger than a cat.
     *
     * Drawn to life it came out four pixels across — a speck you could not
     * tell from a scrap of the decay it was sitting in, and this one has
     * lines to say. The dog is near enough life-size because a Bouvier is
     * already big; the cat is the one animal this camera cannot take
     * literally.
     */
    part(0.21, 0.42, 0.45, 0.2, CAT_FUR);
    part(0.18, 0.45, 0.21, 0.22, CAT_FUR, 0, -0.21);
    for (const along of [0.165, -0.165]) {
      for (const across of [0.075, -0.075]) part(0, 0.22, 0.075, 0.075, CAT_FUR, across, along);
    }
    part(0.3, 0.5, 0.2, 0.2, CAT_FUR, 0, 0.315);
    for (const across of [0.068, -0.068]) part(0.48, 0.57, 0.075, 0.06, CAT_FUR, across, 0.285);
    // Up, and the tallest thing on it. At this size the tail IS the cat.
    part(0.33, 0.75, 0.09, 0.09, CAT_FUR, 0, -0.33);
    return i;
  }

  /** Put the standing crowd where it is this frame. Visible storey only. */
  private placeMovers(floor: Level): void {
    let i = 0;
    let h = 0;
    for (const person of this.crowd.movers) {
      if (person.floor !== floor || h + PERSON_BLOBS > MAX_MOVERS * PERSON_BLOBS) continue;
      // An animal is thirteen boxes against a person's four, so the box
      // budget has to be checked rather than assumed from the blob one.
      if (i + ANIMAL_PARTS > MAX_MOVERS * PERSON_PARTS) continue;
      if (person.shape) {
        i = this.placeAnimal(i, person);
        continue;
      }
      const [trousers, plain, head] = this.personColours(person);
      const look = person.look;
      const clothing = look?.shirt ?? plain;
      // Every height in the figure goes through this, so a taller person is
      // taller everywhere rather than a normal person with a floating head.
      const k = look?.scale ?? 1;
      const up = (z: number): number => z * k;

      /*
       * Legs, torso, two arms — all on the same centre line, so the heading
       * rotates the whole figure and no part has to orbit another.
       *
       * `thick` is front to back and `wide` is side to side. They were the
       * wrong way round in the first version, which turned every walker
       * ninety degrees: perfectly symmetrical at rest and unmistakable the
       * moment anyone walked anywhere.
       */
      i = this.placePart(i, person, 0, up(PERSON_LEG_TOP), PERSON_THICK * 0.8, PERSON_HIP, trousers);
      i = this.placePart(
        i,
        person,
        up(PERSON_LEG_TOP),
        up(PERSON_NECK),
        PERSON_THICK,
        PERSON_TORSO_WIDE,
        clothing,
      );

      /*
       * Arms: two darker strips either side of the torso, in the SAME
       * plane as it rather than proud of it.
       *
       * The pass before this one built them sticking out, measured the
       * seven centimetres they protrude, found it came to two pixels, and
       * deleted them — the right measurement answering the wrong question.
       * An arm at this size does not read as a silhouette. It reads as
       * tone: dark, light, dark across the body, which is the difference
       * between a person and a slab.
       */
      const sleeve = shade(clothing, 0.74);
      const reach = (PERSON_TORSO_WIDE + PERSON_ARM_WIDE) / 2;
      for (const side of [reach, -reach]) {
        i = this.placePart(
          i,
          person,
          up(PERSON_ARM_BOTTOM),
          up(PERSON_ARM_TOP),
          PERSON_THICK,
          PERSON_ARM_WIDE,
          sleeve,
          side,
        );
      }

      /*
       * Hair and a beard, for the people who are somebody.
       *
       * Boxes rather than blobs, which is not laziness: the blob budget is
       * two a head and every one of the three thousand people in Chapter III
       * pays for it, where the box budget already has room for an animal's
       * thirteen. A cap of hair on a rounded head reads as hair at this size
       * either way.
       *
       * The beard is the one piece of this that is nearly a likeness, and it
       * is one box. Anything finer — a face, glasses, a logo on a shirt — is
       * under a pixel, so attempting it would be a claim this renderer cannot
       * make.
       */
      if (look?.hair !== undefined) {
        i = this.placePart(
          i,
          person,
          up(PERSON_HEIGHT) - 0.07 * k,
          up(PERSON_HEIGHT) + 0.01 * k,
          PERSON_HEAD_WIDE * 0.94,
          PERSON_HEAD_WIDE * 0.94,
          look.hair,
        );
        if (look.beard) {
          i = this.placePart(
            i,
            person,
            up(PERSON_NECK) + 0.02 * k,
            up(PERSON_NECK) + 0.15 * k,
            0.07,
            PERSON_HEAD_WIDE * 0.72,
            look.hair,
            0,
            PERSON_HEAD_WIDE * 0.42,
          );
        }
      }

      // The shoulders as a rounded mass over the top of all three, and the
      // head over that. A flat cap read as epaulettes.
      h = this.placeBlob(h, person, up(PERSON_SHOULDER_BOTTOM), up(PERSON_NECK), PERSON_SHOULDER, PERSON_THICK, clothing);
      h = this.placeBlob(h, person, up(PERSON_NECK), up(PERSON_HEIGHT), PERSON_HEAD_WIDE, PERSON_HEAD_WIDE, head);
    }

    this.moverMesh.count = i;
    this.moverMesh.instanceMatrix.needsUpdate = true;
    if (this.moverMesh.instanceColor) this.moverMesh.instanceColor.needsUpdate = true;

    this.moverHeads.count = h;
    this.moverHeads.instanceMatrix.needsUpdate = true;
    if (this.moverHeads.instanceColor) this.moverHeads.instanceColor.needsUpdate = true;
  }

  /**
   * One box of a walking person, in its own frame. `across` offsets it to
   * the figure's left, which is how an arm gets beside a torso without
   * having to know which way the person is facing.
   */
  private placePart(
    index: number,
    person: Person,
    from: number,
    to: number,
    thick: number,
    wide: number,
    colour: number,
    across = 0,
    along = 0,
  ): number {
    // `across` is to the figure's left and `along` is in front of it, both in
    // its own frame. A person needs only `across` — two arms beside a torso —
    // and an animal is the whole reason `along` exists: a dog is a column of
    // boxes laid on its side, with a head at one end and a tail at the other.
    SCRATCH.position.set(
      person.x + Math.cos(person.heading) * along - Math.sin(person.heading) * across,
      person.y + Math.sin(person.heading) * along + Math.cos(person.heading) * across,
      person.z + (from + to) / 2,
    );
    SCRATCH.scale.set(thick, wide, to - from);
    SCRATCH.rotation.set(0, 0, person.heading);
    SCRATCH.updateMatrix();
    this.moverMesh.setMatrixAt(index, SCRATCH.matrix);
    this.moverMesh.setColorAt(index, SCRATCH_COLOUR.set(colour));
    return index + 1;
  }

  /** The same, for the rounded parts: the shoulders and the head. */
  private placeBlob(
    index: number,
    person: Person,
    from: number,
    to: number,
    wide: number,
    thick: number,
    colour: number,
  ): number {
    SCRATCH.position.set(person.x, person.y, person.z + (from + to) / 2);
    SCRATCH.scale.set(thick, wide, to - from);
    SCRATCH.rotation.set(0, 0, person.heading);
    SCRATCH.updateMatrix();
    this.moverHeads.setMatrixAt(index, SCRATCH.matrix);
    this.moverHeads.setColorAt(index, SCRATCH_COLOUR.set(colour));
    return index + 1;
  }

  // -- the objective, drawn -------------------------------------------------

  /**
   * Put a post where each live activity is.
   *
   * The screen decides the colour, because the screen is what knows a status
   * from a status; this only knows where things are and which storey is being
   * looked at. Markers persist between calls and are hidden rather than
   * rebuilt — there are forty of them in Chapter III and they move only when
   * a robot is carrying one.
   */
  setMarkers(markers: readonly ObjectiveMarker[], floor: Level): void {
    const seen = new Set<string>();

    for (const marker of markers) {
      seen.add(marker.id);
      let mesh = this.markerMeshes.get(marker.id);
      if (!mesh) {
        mesh = new Mesh(this.markerGeometry, new MeshBasicMaterial({ color: marker.colour }));
        const disc = new Mesh(this.markerDisc, new MeshBasicMaterial({ color: marker.colour }));
        // Just off the floor, or it fights the floor plate for the same depth.
        disc.position.z = -1.14;
        mesh.add(disc);
        this.markerMeshes.set(marker.id, mesh);
        this.markerGroup.add(mesh);
      }
      const visible = marker.floor === floor;
      mesh.visible = visible;
      if (!visible) continue;
      const scale = marker.low ? 0.34 : 1;
      mesh.scale.set(1, 1, scale);
      mesh.position.set(marker.x, marker.y, marker.z + 1.15 * scale);
      const material = mesh.material as MeshBasicMaterial;
      material.color.setHex(marker.colour);
      for (const child of mesh.children) {
        ((child as Mesh).material as MeshBasicMaterial).color.setHex(marker.colour);
      }
    }

    for (const [id, mesh] of this.markerMeshes) {
      if (!seen.has(id)) mesh.visible = false;
    }
  }

  /**
   * Give the cast a lamp. Chapter I only, and it is most of Chapter I.
   *
   * `distance` rather than an attenuation curve, because a hard edge to the
   * light is the point: what the player can see is a decision the chapter
   * makes, not a falloff.
   */
  enableLamp(range: number, intensity: number): void {
    if (this.lamp) return;
    this.lamp = new PointLight(0xfff0dc, intensity * LAMBERT_SCALE, range, 1.4);
    this.scene.add(this.lamp);
  }

  moveLamp(x: number, y: number, z: number): void {
    this.lamp?.position.set(x, y, z + 1.4);
  }

  /**
   * How much light a zone adds to the storey it is on, 0..1.
   *
   * Idempotent and keyed, so it is both "switch the hall on" and "this room
   * is dying". Chapter I calls it once per distribution board and never
   * again; Chapter II calls it once per room per frame with the room's own
   * meter, and the rig is built on the first call and only re-aimed after
   * that. Building it fresh each time is what the first version did, and at
   * sixty frames a second it hung nine point lights on the storey per room
   * per frame until the renderer gave up.
   *
   * Up to three point lights along the zone's long axis, because one light in
   * the middle of a 30 m room lights the middle of a 30 m room. Hung at 4.5 m,
   * which is where a cinema hangs them.
   */
  lightZone(id: string, bounds: Rect, floor: Level, level: number): void {
    const existing = this.zoneLights.get(id);
    if (existing) {
      const intensity = level * REVEAL_POWER * LAMBERT_SCALE;
      for (const light of existing) light.intensity = intensity;
      return;
    }

    const storey = this.storeys.get(floor);
    const made: PointLight[] = [];

    /*
     * A GRID of them, not a line.
     *
     * The first version hung three lights down the long axis of the
     * exhibition hall, which is 52 m by 49 m: everything more than about
     * fifteen metres off that centre line stayed exactly as dark as it had
     * been, so switching the hall on did nothing you could see from the west
     * wall — where the board that switches it on happens to be.
     *
     * One light per SPACING metres in each direction, so a big room costs
     * nine and a small one costs one, and the cost is proportional to the
     * thing being lit rather than to its longest side.
     */
    const across = Math.max(1, Math.round(bounds.w / REVEAL_SPACING));
    const along = Math.max(1, Math.round(bounds.h / REVEAL_SPACING));
    const intensity = level * REVEAL_POWER * LAMBERT_SCALE;
    const range = REVEAL_SPACING * 1.8;

    for (let i = 0; i < across * along; i += 1) {
      const x = bounds.x + (bounds.w * ((i % across) + 0.5)) / across;
      const y = bounds.y + (bounds.h * (Math.floor(i / across) + 0.5)) / along;
      const light = new PointLight(0xffe9c8, intensity, range, 1.0);
      light.position.set(x, y, 4.5);
      // Parented to the storey so it goes away with it: a light left in the
      // scene while its floor is hidden lights the floor you ARE looking at,
      // through six metres of concrete.
      if (storey) storey.add(light);
      else this.scene.add(light);
      this.revealed.push(light);
      made.push(light);
    }
    this.zoneLights.set(id, made);
  }

  /**
   * Take a room's audience out of its seats, a fraction at a time.
   *
   * `gone` is how far through `order` we are, so calling this every frame
   * with a rising fraction costs only the people who have stood up since the
   * last one. It is one-way: `docs/MECHANICS.md` §5.2 is that a dark room
   * "never comes back", and a room that could refill would make losing one a
   * setback rather than a loss.
   *
   * The instances are scaled down to nothing rather than removed, because an
   * `InstancedMesh` has one buffer and you cannot take a hole out of the
   * middle of it. A hair over zero, not zero — see `instanceBoxes`.
   */
  emptySeats(room: string, fraction: number): void {
    for (const storey of this.seated.values()) {
      const run = storey.seats.get(room);
      if (!run) continue;

      const target = Math.min(run.people.length, Math.floor(fraction * run.people.length));
      if (target <= run.gone) continue;

      SCRATCH.position.set(0, 0, 0);
      SCRATCH.scale.set(GONE, GONE, GONE);
      SCRATCH.rotation.set(0, 0, 0);
      SCRATCH.updateMatrix();

      while (run.gone < target) {
        const who = run.order[run.gone];
        run.gone += 1;
        for (let i = 0; i < run.perBox; i += 1) {
          storey.boxMesh.setMatrixAt(run.box0 + who * run.perBox + i, SCRATCH.matrix);
        }
        for (let i = 0; i < run.perBlob; i += 1) {
          storey.blobMesh.setMatrixAt(run.blob0 + who * run.perBlob + i, SCRATCH.matrix);
        }
      }

      storey.boxMesh.instanceMatrix.needsUpdate = true;
      storey.blobMesh.instanceMatrix.needsUpdate = true;
    }
  }

  /**
   * Put every emptied room back in its seats. Called when a round restarts.
   *
   * Rewrites the instances from the people rather than from a saved copy of
   * the matrices — same people, same order, same builders, so the same
   * numbers come out.
   */
  refillSeats(): void {
    for (const storey of this.seated.values()) {
      let touched = false;
      for (const run of storey.seats.values()) {
        if (run.gone === 0) continue;
        for (let i = 0; i < run.people.length; i += 1) {
          const person = run.people[i];
          writeInstances(storey.boxMesh, run.box0 + i * run.perBox, this.seatedBoxes(person));
          writeInstances(storey.blobMesh, run.blob0 + i * run.perBlob, this.seatedBlobs(person));
        }
        run.gone = 0;
        touched = true;
      }
      if (touched) {
        storey.boxMesh.instanceMatrix.needsUpdate = true;
        storey.blobMesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  /** Put the building back in the dark. Called when a round is restarted. */
  clearReveals(): void {
    for (const light of this.revealed) light.removeFromParent();
    this.revealed.length = 0;
    this.zoneLights.clear();
  }

  /**
   * Update everything that moves. Call once per frame.
   *
   * `dt` is the real frame delta in seconds — used only for ageing skid marks,
   * never for anything the simulation can see.
   */
  render(floor: Level, actors: Actor[], alpha: number, dt: number): void {
    for (const [level, group] of this.storeys) group.visible = level === floor;

    this.ageMarks(dt);
    for (const actor of actors) {
      if (actor.floor === floor) this.recordSlip(actor, alpha);
    }
    this.writeMarks();

    for (const actor of actors) {
      const view = this.robots.get(actor) ?? this.buildRobot(actor);
      view.group.visible = actor.floor === floor;
      if (view.group.visible) this.placeRobot(actor, view, alpha);
    }

    this.placeMovers(floor);
    this.aimCutaway(floor, actors, alpha);
  }

  /**
   * Draw the building its own height, for a viewer standing in front of it.
   *
   * Storey 0's envelope runs from the cut up to the next floor's datum, so
   * the spandrel between the two levels is not a gap; storey 1's is drawn
   * whole, because the storey it belongs to is hidden while the player is
   * down here. Together with what the visible storey already draws below
   * the cut, that is one continuous elevation.
   */
  private buildEnvelope(): void {
    const solid: Box[] = [];
    const glass: Box[] = [];

    /*
     * Walls AND the dressing that replaces them.
     *
     * The curtain wall hides its own wall and draws itself as a sill, a
     * pane, mullions and transoms, so an envelope built from obstacles alone
     * would leave out the one elevation a player ever walks out to look at.
     *
     * The two are not treated alike, though. A wall on the ground storey is
     * carried up to the next floor's datum so the spandrel between the two
     * levels is not a gap; a piece of dressing is drawn exactly where it
     * says it is. Stretching everything was the first version, and it pulled
     * the banners down their poles and would have smeared the sign into a
     * bar: a thing that starts above the cut does not start AT it.
     */
    const pieces = [
      ...this.venue.obstacles.filter((o) => !o.hidden).map((o) => ({ piece: o, wall: true })),
      ...this.venue.decor.map((d) => ({ piece: d, wall: false })),
    ];

    for (const { piece, wall } of pieces) {
      if (!piece.exterior) continue;
      /*
       * Every storey is modelled from its own datum and only one is ever
       * visible, so a piece on floor 1 states its height as though the
       * first floor were the ground. The envelope is the one place in the
       * renderer that draws two storeys at once, so it is the one place
       * that has to put them back on top of each other — without this the
       * upper floor was drawn buried inside the ground floor, and the
       * building had no second storey at all from outside.
       */
      /*
       * Worked out in the storey's OWN space, then lifted into the world.
       *
       * The cutaway plane is 2.7 m above the storey datum, and every storey
       * is modelled from its own. Adding the lift first put the plane at
       * 8.9 m for the upper floor and left half a metre of it — the first
       * floor's glazing came back as a sliver you could not see.
       */
      const local = this.datumFor(piece.floor, piece);
      const base = local + (piece.base ?? 0);
      const top = local + piece.height;

      /*
       * The storey the player is standing on is already drawn up to the
       * cut, so the envelope only owes it what is above. Every OTHER storey
       * is not drawn at all — only one is ever visible — so the envelope
       * owes those their whole height.
       */
      const from = piece.floor === 0 ? Math.max(cutAt(local), base) : base;
      const to = wall && piece.floor === 0 ? Math.max(top, FLOOR_HEIGHT) : top;
      if (to <= from) continue;

      const lift = piece.floor * FLOOR_HEIGHT;
      const box = {
        bounds: piece.bounds,
        bottom: lift + from,
        top: lift + to,
        colour: this.varied(this.material(piece.material), piece.bounds, piece.material),
      };

      if (piece.material !== 'glazing') {
        solid.push(box);
        continue;
      }

      /*
       * A window seen from outside is dark, because the room behind it is
       * not being drawn.
       *
       * Glass is translucent and writes no depth, so over the void beyond
       * the building it came out as nothing at all: the first floor's
       * glazing was there the whole time and invisible. An opaque panel
       * behind each pane gives it something to be glass IN FRONT OF, which
       * is all a window needs to read as one from the street.
       */
      // Near the glass's own tone rather than far under it: a window from
      // the street is darker than the wall around it and nothing like a
      // hole, and the translucent pane in front of this darkens it again.
      solid.push({ ...box, colour: shade(this.palette.glazing, 0.92) });
      glass.push(box);
    }

    if (solid.length) this.envelope.add(instanceBoxes(solid, new MeshLambertMaterial()));
    if (glass.length) {
      const panes = instanceBoxes(
        glass,
        new MeshLambertMaterial({
          transparent: true,
          opacity: GLAZING_OPACITY,
          depthWrite: false,
        }),
      );
      panes.renderOrder = 5;
      this.envelope.add(panes);
    }
  }

  /**
   * Whether the player is standing outside the building.
   *
   * The one thing that decides whether the elevation is drawn or the rooms
   * behind it are. Set by the screen, which is what knows where the cast is.
   */
  setOutside(outside: boolean): void {
    this.envelope.visible = outside;
  }

  /** Forget every mark. Call on reset so a tuning run starts on clean floor. */
  clearMarks(): void {
    this.marks.length = 0;
    this.writeMarks();
  }

  dispose(): void {
    this.scene.traverse((object) => {
      if (object instanceof Mesh || object instanceof Line || object instanceof LineSegments) {
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) for (const m of material) m.dispose();
        else material.dispose();
      }
    });
    this.scene.clear();
    this.robots.clear();
    // Shared between every marker, so the traversal above disposed it once per
    // mesh and it still has to be dropped here — it is not owned by any of them.
    this.markerGeometry.dispose();
    this.markerDisc.dispose();
    this.markerMeshes.clear();
  }

  // -- the building ---------------------------------------------------------

  /**
   * Everything standing on one storey, built once.
   *
   * Two draw calls for the solid geometry — every box in the building is the
   * same unit cube with a transform and a colour, which is what an
   * InstancedMesh is for — plus one for the floor seams. Floor 1 is five
   * thousand seats and it costs the same as an empty room.
   */
  private buildStorey(floor: Level): Group {
    const group = new Group();
    /**
     * Floor plates, kept apart from everything else because they are the one
     * thing that must never fade.
     *
     * The camera looks DOWN at 30 degrees, so the carpet between the viewer
     * and a robot is in front of it in exactly the sense the cutaway tests
     * for — and the first version of this dissolved a disc of floor in front
     * of every machine. A floor is never what is hiding a robot. Nothing else
     * in the building gets that exemption: a kerb or a seat tier lower than
     * the robot's feet can still stand in the way of them.
     */
    const plates: Box[] = [];
    const boxes: Box[] = [];
    // The glass front, kept apart: it is the one thing here that is not opaque.
    const glass: Box[] = [];
    const seams: number[] = [];

    for (const room of this.venue.rooms) {
      if (room.floor !== floor) continue;
      const z = room.elevation ?? 0;
      // Auditoriums sit a shade darker than circulation space, which reads as
      // carpet against the lighter corridor floor in the reference photographs.
      const colour =
        room.kind === 'auditorium' ? shade(this.palette.floor, 0.82) : this.palette.floor;

      // A stairwell is an absence of floor, so the plate is drawn with its
      // holes taken out. The flight below then shows through the opening,
      // which the depth buffer arranges without being asked.
      for (const tile of floorTiles(room)) {
        // A raised plate is drawn down to its storey datum so its edge reads
        // as a step: the concourse stands 1.2 m over the hall and you go DOWN
        // into the hall, and a level change you cannot see is one the player
        // will not believe.
        plates.push({ bounds: tile, bottom: z > 0 ? 0 : z - PLATE_THICKNESS, top: z, colour });
        pushOutline(seams, tile, z + DECAL_LIFT);
      }
    }

    for (const obstacle of this.venue.obstacles) {
      if (obstacle.floor !== floor || obstacle.hidden) continue;
      const { bounds } = obstacle;
      const datum = this.datumFor(floor, obstacle);
      (obstacle.material === 'glazing' ? glass : boxes).push({
        bounds,
        bottom: datum + (obstacle.base ?? 0),
        // A flight is exempt from the cutaway: see MAX_DRAWN_HEIGHT.
        top: obstacle.linkId
          ? datum + obstacle.height
          : Math.min(datum + obstacle.height, cutAt(datum)),
        // No material means the building itself, which takes the wall colour.
        // Only furniture names one. Same rule as Decor.material: the venue
        // says what a thing IS and the chapter says what that looks like.
        colour: this.varied(this.material(obstacle.material), bounds, obstacle.material),
      });

      // Anything the cut plane passes through gets the band. Not flights —
      // a staircase is exempt from the cutaway and has a real top — and not
      // glass, which has no edge to catch the light.
      const raw = datum + obstacle.height;
      const cut = cutAt(datum);
      if (!obstacle.linkId && obstacle.material !== 'glazing' && raw > cut + CUT_BAND) {
        boxes.push({
          bounds,
          bottom: cut - CUT_BAND,
          top: cut,
          colour: shade(this.material(obstacle.material), CUT_BAND_LIFT),
        });
      }
    }

    // Dressing, by the same rules: same cutaway, same box. The only difference
    // is that nothing collides with it.
    for (const piece of this.venue.decor) {
      if (piece.floor !== floor) continue;
      const { bounds } = piece;
      const datum = this.datumFor(floor, piece);
      // Signage high on an elevation starts above the cutaway plane, and
      // clamping its top to the cut while its bottom stayed put drew a
      // sliver of it upside down at the wrong height. Above the cut is the
      // envelope's business, not the storey's.
      if (datum + (piece.base ?? 0) >= cutAt(datum)) continue;
      (piece.material === 'glazing' ? glass : boxes).push({
        bounds,
        bottom: datum + (piece.base ?? 0),
        top: piece.linkId
          ? datum + piece.height
          : Math.min(datum + piece.height, cutAt(datum)),
        colour: this.varied(this.material(piece.material), bounds, piece.material),
      });
    }

    group.add(instanceBoxes(plates, new MeshLambertMaterial()));

    /*
     * The audience, baked into the storey.
     *
     * Static for the life of the chapter, so it is built here with the walls
     * rather than written every frame with the robots: a full house is five
     * thousand people and costs one draw call and nothing per frame. It is
     * also why the crowd had to be split into seated and standing at all.
     */
    /*
     * What has settled on this storey, baked in beside the audience.
     *
     * Pushed into `boxes` rather than given a mesh of its own: it is the same
     * unlit-nothing, same Lambert material and same cutaway as every other
     * solid in the building, and a drift that did not fade when a robot drove
     * behind it would be the one thing in the scene that does not.
     *
     * A stain is the exception and gets no height worth speaking of — it is a
     * mark ON the floor, so it is drawn just clear of the plate the way skid
     * marks are, and the plate's own seam grid still reads through it.
     */
    for (const piece of this.decay.pieces) {
      if (piece.floor !== floor) continue;
      const datum = groundAt(this.venue, floor, piece.bounds.x, piece.bounds.y);
      // Every piece stands ON the floor, stain included: a stain carries its
      // own height now and lifting it as well put it back among the sheets.
      // See SHEET_HIGH_MIN in `core/Decay.ts` for why none of these heights
      // is a constant.
      boxes.push({
        bounds: piece.bounds,
        bottom: datum,
        top: datum + piece.height,
        colour: this.decayColour(piece),
      });
    }

    const audience = this.crowd.seated.filter((person) => person.floor === floor);
    if (audience.length) {
      /*
       * Baked ROOM BY ROOM, so each room's audience is one contiguous run of
       * instances and can be taken back out again.
       *
       * It used to be one `flatMap` over everybody on the storey, which is
       * the same picture and gives no way to empty a room: the instances of
       * the five hundred people in Room 5 were interleaved with everyone
       * else's by whatever order `fillSeats` happened to walk the seats in.
       * Grouping costs nothing at build time and is the whole of what makes
       * `emptySeats` possible.
       */
      const boxes: Box[] = [];
      const blobs: Box[] = [];
      const rooms = new Map<string, Person[]>();
      for (const person of audience) {
        const key = person.room ?? '';
        const list = rooms.get(key);
        if (list) list.push(person);
        else rooms.set(key, [person]);
      }

      const seats = new Map<string, SeatedRun>();
      for (const [room, people] of rooms) {
        const box0 = boxes.length;
        const blob0 = blobs.length;
        for (const person of people) {
          boxes.push(...this.seatedBoxes(person));
          blobs.push(...this.seatedBlobs(person));
        }
        seats.set(room, {
          box0,
          blob0,
          people,
          // Read off the run rather than hard-coded: a seated person is
          // however many boxes `seatedBoxes` decides, and the day somebody
          // gives them a bag it must not be two places that know.
          perBox: (boxes.length - box0) / people.length,
          perBlob: (blobs.length - blob0) / people.length,
          order: departureOrder(people.length),
          gone: 0,
        });
      }

      const boxMesh = instanceBoxes(boxes, new MeshLambertMaterial());
      const blobMesh = instanceBlobs(blobs, new MeshLambertMaterial());
      group.add(boxMesh);
      group.add(blobMesh);
      this.seated.set(floor, { boxMesh, blobMesh, seats });
    }

    /*
     * Glazing is its own mesh, because it is the one surface in the building
     * that is not opaque and an InstancedMesh has one material.
     *
     * No cutaway shader on it: a pane you can already see through has nothing
     * to get out of the way of. It writes no depth, so whatever stands behind
     * it draws normally and the glass simply tints it.
     */
    if (glass.length) {
      const panes = instanceBoxes(
        glass,
        new MeshLambertMaterial({
          transparent: true,
          opacity: GLAZING_OPACITY,
          depthWrite: false,
        }),
      );
      // Last of all: after the solid building, after the robots, and after
      // the cutaway's ghost pass at 4.
      panes.renderOrder = 6;
      group.add(panes);
    }

    // Two meshes over ONE set of instance buffers and one geometry. The solid
    // pass discards the cutaway disc and writes depth; the ghost pass draws
    // only the disc, translucent, after the robots. See render/Cutaway.ts.
    const solid = instanceBoxes(boxes, cutawayMaterial(this.cutaway, false));
    const ghost = new InstancedMesh(
      solid.geometry,
      cutawayMaterial(this.cutaway, true),
      solid.count,
    );
    ghost.instanceMatrix = solid.instanceMatrix;
    ghost.instanceColor = solid.instanceColor;
    ghost.count = solid.count;
    // After the floor decals: they lie under the robot, and so under any wall
    // standing in front of it. Marks are 1, the contact shadow 2, the ring 3.
    ghost.renderOrder = 4;
    group.add(solid, ghost);

    if (seams.length) {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(seams, 3));
      group.add(
        new LineSegments(
          geometry,
          // Unlit, like every other decal, so the exposure is applied here.
          new LineBasicMaterial({
            color: shade(this.palette.floorLine, this.exposure),
            transparent: true,
            opacity: 0.9,
          }),
        ),
      );
    }

    return group;
  }

  /**
   * What a piece's heights are measured FROM, in metres above the storey datum.
   *
   * Two answers, and getting them the wrong way round is the most expensive
   * one-line mistake available in this file.
   *
   * A plain solid — a wall, a column, a seat bank — stands on whatever floor
   * plate is under it, so it needs that plate's elevation. A storey is not one
   * flat plane: the reception concourse is 1.2 m over the exhibition hall and
   * an auditorium's stage is 4.5 m under its doors.
   *
   * A flight does not. `core/Traversal.surfaceHeight` measures a robot's feet
   * on a staircase from the STOREY datum, and `Link.base` is stated the same
   * way, so a tread already knows its absolute height and adding the plate
   * under it counts the same metre twice. The grand staircase begins in the
   * concourse and was drawn a storey and a bit into the ceiling; the wall
   * bands beside a rake, which are cut to the same treads, hung three metres
   * under the floor they belong to.
   *
   * The rule is simply "is this piece part of a flight", which is what
   * `linkId` says on both an Obstacle and a Decor.
   */
  private datumFor(floor: Level, piece: { bounds: Rect; linkId?: string }): number {
    if (piece.linkId) return 0;
    const { bounds } = piece;
    return groundAt(this.venue, floor, bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
  }

  /**
   * What a piece of decay looks like in this era.
   *
   * Its own spread rather than `varied`'s, and much wider: `TONE_SPREAD` is
   * tuned to stop a flat wall reading as one slab, where this is dust and
   * scrub, and dust and scrub that all match is a decal. Keyed off the
   * piece's own seeded `tint` rather than off its position, because two
   * tufts 40 cm apart want to differ and `tone()` would give them the same
   * answer.
   */
  private decayColour(piece: DecayPiece): number {
    const base =
      piece.kind === 'growth'
        ? this.palette.growth
        : piece.kind === 'stain'
          ? this.palette.damp
          : this.palette.dust;
    // Sheets get twice the spread of anything else here. They are the one
    // kind that overlaps itself, and at a narrow spread the overlaps vanish:
    // forty pale rectangles of the same value read as one pale rectangle with
    // a strange outline. The variation is what makes a covering look deep.
    const spread = piece.kind === 'sheet' ? 0.46 : 0.26;
    return shade(base, 1 - spread + piece.tint * spread * 2);
  }

  /**
   * A material's colour, nudged by where the thing is standing.
   *
   * Left alone for the surfaces where variation would read as a mistake
   * rather than as texture: glass is one sheet, and a sign whose characters
   * were each a slightly different white would look misprinted.
   */
  private varied(colour: number, bounds: Rect, material: Material | undefined): number {
    if (material === 'glazing' || material === 'sign' || material === 'signChar') return colour;
    const t = tone(bounds.x, bounds.y, bounds.w + bounds.h);
    return shade(colour, 1 - TONE_SPREAD + t * TONE_SPREAD * 2);
  }

  /**
   * What a material looks like in this era.
   *
   * The venue names materials and never colours — see `Material` — so this is
   * the one place the two meet. A chapter re-dresses the seating by changing
   * its palette, which is exactly the budget rule 3 allows it.
   */
  private material(of: Material | undefined): number {
    switch (of) {
      case 'seat':
        return this.palette.seat;
      // A backrest is the same upholstery as the pan, darkened: it is the
      // face you see from behind, which is the face turned away from the
      // light in every row of every room.
      case 'seatBack':
        return shade(this.palette.seat, 0.86);
      case 'desk':
        return this.palette.desk;
      case 'sign':
        return this.palette.sign;
      case 'signAccent':
        return this.palette.accent;
      case 'signPlate':
        return this.palette.signPlate;
      // The same ink as a stage letter. They differ in what they are for,
      // not in what they look like — see the note on Material.
      case 'signChar':
        return this.palette.sign;
      case 'screen':
        return this.palette.screen;
      case 'glazing':
        return this.palette.glazing;
      case 'booth':
        return this.palette.booth;
      // Lighter than the ground it is laid on, which is the only thing that
      // tells a band of setts from the asphalt either side of it.
      case 'paving':
        return shade(this.palette.floor, 1.5);
      default:
        return this.palette.wall;
    }
  }

  /**
   * Point the cutaway at whoever is standing on this floor.
   *
   * Every robot on the visible storey gets a disc, not just the one being
   * driven: in Chapter III you are directing three machines and the one you
   * need to see is usually the one you are not holding.
   */
  private aimCutaway(floor: Level, actors: Actor[], alpha: number): void {
    // `matrixWorldInverse` is written by three when it draws, so reading it
    // here would be reading last frame's camera — and one frame of lag drags
    // the hole visibly behind a robot at 6 m/s. One inversion, and the
    // renderer redoing it a moment later costs nothing.
    this.camera.updateMatrixWorld();
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();

    let count = 0;
    for (const actor of actors) {
      if (actor.floor !== floor || count >= CUTAWAY_MAX) continue;
      const { spec } = actor.body;
      const pos = renderPos(actor, alpha);
      // Centred on the robot's middle rather than its feet, so the disc is
      // about the machine and not about the floor under it.
      SCRATCH_VIEW.set(pos.x, pos.y, pos.z + spec.height / 2).applyMatrix4(
        this.camera.matrixWorldInverse,
      );
      this.cutaway.uCutaway.value[count].set(
        SCRATCH_VIEW.x,
        SCRATCH_VIEW.y,
        SCRATCH_VIEW.z,
        cutawayRadius(spec.radius, spec.height),
      );
      count += 1;
    }
    this.cutaway.uCutawayCount.value = count;
  }

  // -- robots ---------------------------------------------------------------

  /**
   * How a machine should be drawn on the flight it is standing on.
   *
   * `lift` is the gap between where the simulation put its feet — anywhere
   * on a smooth ramp — and the tread it is actually over, plus a small arc
   * as it crosses from one tread to the next. `lean` is the angle it tips
   * into a gradient.
   *
   * Stairs get the step and no lean: a walking machine stays upright on a
   * staircase, and tipping it would look like it was falling down one.
   * Ramps get the lean and no step, for the same reason in reverse — there
   * are no treads to find, and a machine on a slope that stays dead level
   * is the thing that looks wrong there.
   */
  private climbOf(actor: Actor, heading: number): { lift: number; lean: number } {
    const id = actor.onLink;
    if (id === undefined) return { lift: 0, lean: 0 };
    const link = this.venue.links.find((l) => l.id === id);
    if (link === undefined) return { lift: 0, lean: 0 };

    const { body } = actor;

    if (link.riser > 0) {
      const steps = Math.max(1, Math.round(link.rise / link.riser));
      const f = climbFraction(link, body.x, body.y);
      const exact = f * steps;
      const tread = Math.floor(exact);
      const across = exact - tread;

      /*
       * Dwell, rise, dwell — once per tread, and continuous throughout.
       *
       * The height tracks the tread the robot is over for most of the
       * going and eases onto the next in between, so the feet are on a
       * step whenever anyone would notice and the body never teleports.
       * The worst it parts company with the solver's smooth ramp is about
       * a fifth of a riser, which is tighter than the snap it replaced.
       */
      const eased = smoothstep(across, STEP_DWELL_START, STEP_DWELL_END);
      const lift = ((tread + eased) / steps - f) * link.rise;

      // The rise rate, normalised to peak at 1 halfway through the lift.
      // Everything that reads as effort hangs off it: a little extra height
      // at the top of the swing, and a deepening of the lean while pushing.
      const rising = 4 * eased * (1 - eased);
      const effort = rising * body.speedFraction;

      /*
       * How much of this is actually a climb.
       *
       * +1 driving straight up the flight, 0 crossing it square, -1 going
       * straight down. Everything about the posture is multiplied by it,
       * so a machine cutting across a staircase stays upright and only one
       * pointed up it leans — which is the difference between the two the
       * player noticed.
       */
      const aligned = this.alignment(link, heading);
      // Negative is nose-down: forward, over its own feet, into the climb.
      // Both terms fade with speed, because leaning is something a machine
      // does while climbing — one parked on a flight stands square, and
      // gets there smoothly rather than snapping upright.
      return {
        lift: lift + STEP_ARC * effort,
        lean: -(STAIR_LEAN * body.speedFraction + STEP_ROCK * effort) * aligned,
      };
    }

    /*
     * A ramp tips the machine the OTHER way: nose-up going up.
     *
     * Not an inconsistency. A ramp is rolled, so the chassis follows the
     * surface it is standing on; a staircase is walked, and a body walking
     * up one leans forward over its feet instead. The two look right for
     * opposite reasons.
     */
    const pull = downhill(link);
    const along = pull.x * Math.cos(heading) + pull.y * Math.sin(heading);
    return { lift: 0, lean: Math.asin(Math.max(-1, Math.min(1, -along))) * SLOPE_LEAN };
  }

  /**
   * How much of a machine's facing is up the flight: +1 straight up, 0
   * square across it, -1 straight down.
   */
  private alignment(link: Link, heading: number): number {
    const pull = downhill(link);
    const slope = Math.hypot(pull.x, pull.y);
    if (slope < 1e-4) return 0;
    const along = (pull.x * Math.cos(heading) + pull.y * Math.sin(heading)) / slope;
    return Math.max(-1, Math.min(1, -along));
  }

  /**
   * Each robot as primitives, read off its model sheet in `references/`.
   *
   * NOT a model import. Everything else in this game is untextured boxes
   * lit by one ambient and one directional light, and a detailed mesh
   * dropped into that reads as a sticker on a blockout. What carries a
   * character at thirty pixels is its silhouette, which is the same thing
   * the crowd taught: a head narrower than the shoulders is worth more than
   * any amount of surface.
   *
   * The proportions are the sheets' own, measured off the front views —
   * Voxxy 0.61 wide per unit tall, Droid 0.48, Biggy 1.11 — and they come
   * out of `RobotSpec` rather than being typed again here, so the drawing
   * cannot drift from the body that collides.
   */
  private robotParts(spec: RobotSpec): RobotPart[] {
    const R = spec.radius;
    const H = spec.height;
    const dark = shade(spec.tint, 0.45);

    switch (spec.id) {
      /*
       * A big oval head on a teardrop body, on two thin legs. The head is
       * the widest thing on it — wider than the body it sits on — which is
       * the whole of why Voxxy reads as small and friendly rather than as
       * a canister.
       */
      case 'voxxy':
        return [
          { shape: 'box', y: 0.47 * R, z: 0, w: 0.3 * R, d: 0.34 * R, h: 0.25 * H, colour: dark },
          { shape: 'box', y: -0.47 * R, z: 0, w: 0.3 * R, d: 0.34 * R, h: 0.25 * H, colour: dark },
          { shape: 'blob', z: 0.24 * H, w: 1.5 * R, d: 1.32 * R, h: 0.45 * H, colour: spec.tint },
          { shape: 'box', y: 0.85 * R, z: 0.31 * H, w: 0.24 * R, d: 0.3 * R, h: 0.3 * H, colour: spec.tint },
          { shape: 'box', y: -0.85 * R, z: 0.31 * H, w: 0.24 * R, d: 0.3 * R, h: 0.3 * H, colour: spec.tint },
          { shape: 'blob', z: 0.62 * H, w: 2 * R, d: 1.5 * R, h: 0.38 * H, colour: spec.tint },
          // The dark visor across the front of the head, and the pale ring
          // round it. Two of the three things anyone would draw from the
          // sheet, and both survive being eight pixels wide.
          { shape: 'box', x: 0.62 * R, z: 0.68 * H, w: 0.3 * R, d: 1.2 * R, h: 0.2 * H, colour: VISOR },
          { shape: 'box', y: 0.72 * R, z: 0.1 * H, w: 0.32 * R, d: 0.36 * R, h: 0.06 * H, colour: spec.trim },
          { shape: 'box', y: -0.72 * R, z: 0.1 * H, w: 0.32 * R, d: 0.36 * R, h: 0.06 * H, colour: spec.trim },
        ];

      /*
       * Tall and thin: a slab of a torso on long legs, arms to the knee,
       * and a small domed head a long way up. Two metres of it, which is
       * what makes the 2 m reach gate believable when it operates a counter
       * nothing else can.
       */
      case 'droid':
        return [
          { shape: 'box', y: 0.36 * R, z: 0, w: 0.3 * R, d: 0.34 * R, h: 0.44 * H, colour: dark },
          { shape: 'box', y: -0.36 * R, z: 0, w: 0.3 * R, d: 0.34 * R, h: 0.44 * H, colour: dark },
          { shape: 'box', z: 0.42 * H, w: 0.62 * R, d: 0.78 * R, h: 0.1 * H, colour: spec.trim },
          { shape: 'box', z: 0.5 * H, w: 0.72 * R, d: 1.42 * R, h: 0.28 * H, colour: spec.tint },
          // Shoulders proud of the torso, which is what makes the top half
          // read as a chest rather than as a post.
          { shape: 'box', y: 0.8 * R, z: 0.68 * H, w: 0.6 * R, d: 0.38 * R, h: 0.1 * H, colour: spec.trim },
          { shape: 'box', y: -0.8 * R, z: 0.68 * H, w: 0.6 * R, d: 0.38 * R, h: 0.1 * H, colour: spec.trim },
          { shape: 'box', y: 0.82 * R, z: 0.38 * H, w: 0.26 * R, d: 0.28 * R, h: 0.34 * H, colour: dark },
          { shape: 'box', y: -0.82 * R, z: 0.38 * H, w: 0.26 * R, d: 0.28 * R, h: 0.34 * H, colour: dark },
          { shape: 'box', z: 0.78 * H, w: 0.3 * R, d: 0.32 * R, h: 0.06 * H, colour: dark },
          { shape: 'blob', z: 0.84 * H, w: 0.56 * R, d: 0.6 * R, h: 0.16 * H, colour: spec.tint },
          { shape: 'box', x: 0.3 * R, z: 0.88 * H, w: 0.1 * R, d: 0.4 * R, h: 0.05 * H, colour: EYES },
        ];

      /*
       * A sphere with a cap on it and almost no legs. Wider than it is
       * tall, which no other machine in the building is, and the reason a
       * corridor that Voxxy treats as open floor is a decision for Biggy.
       */
      default:
        return [
          { shape: 'box', y: 0.42 * R, z: 0, w: 0.38 * R, d: 0.4 * R, h: 0.2 * H, colour: dark },
          { shape: 'box', y: -0.42 * R, z: 0, w: 0.38 * R, d: 0.4 * R, h: 0.2 * H, colour: dark },
          // The belly, and it is the whole machine: 2R across, so the thing
          // you see is exactly the thing that collides.
          { shape: 'blob', z: 0.14 * H, w: 2 * R, d: 1.9 * R, h: 0.66 * H, colour: spec.trim },
          { shape: 'blob', z: 0.5 * H, w: 1.6 * R, d: 1.55 * R, h: 0.42 * H, colour: spec.tint },
          { shape: 'blob', z: 0.76 * H, w: 0.9 * R, d: 0.86 * R, h: 0.24 * H, colour: spec.tint },
          { shape: 'box', y: 0.88 * R, z: 0.3 * H, w: 0.34 * R, d: 0.3 * R, h: 0.34 * H, colour: dark },
          { shape: 'box', y: -0.88 * R, z: 0.3 * H, w: 0.34 * R, d: 0.3 * R, h: 0.34 * H, colour: dark },
          { shape: 'box', x: 0.42 * R, z: 0.82 * H, w: 0.12 * R, d: 0.5 * R, h: 0.07 * H, colour: EYES },
        ];
    }
  }

  private buildRobot(actor: Actor): RobotView {
    const { spec } = actor.body;
    const group = new Group();

    /*
     * The machine, assembled from its parts.
     *
     * Each part is positioned in the robot's OWN frame — x forward, z up
     * from its soles — and the whole group is turned by the heading every
     * frame, so the parts never have to know which way it is facing.
     *
     * Low segment counts on the blobs on purpose. The building is boxes and
     * the crowd is boxes; a smooth sphere in the middle of that would be the
     * one thing on screen pretending to be something else.
     */
    const body = new Group();
    const tilt = new Group();
    body.add(tilt);
    for (const part of this.robotParts(spec)) {
      const geometry =
        part.shape === 'box'
          ? new BoxGeometry(part.w, part.d, part.h)
          : new SphereGeometry(0.5, 10, 7);
      const mesh = new Mesh(geometry, new MeshLambertMaterial({ color: part.colour }));
      if (part.shape === 'blob') mesh.scale.set(part.w, part.d, part.h);
      mesh.position.set(part.x ?? 0, part.y ?? 0, part.z + part.h / 2);
      tilt.add(mesh);
    }
    group.add(body);

    /*
     * Contact shadow, at 1.45 x the body rather than the 2.1 it was.
     *
     * The wider disc was right while a robot was a featureless box and the
     * shadow was most of what told you where it was standing. Now that the
     * machine has a shape, a pool three metres across under Biggy reads as
     * a crater it is sitting in rather than as contact with the floor.
     */
    const shadow = new Mesh(
      new CircleGeometry(spec.radius * 1.45, 24),
      new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    shadow.renderOrder = 2;
    group.add(shadow);

    const stopLine = new Line(
      new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]),
      new LineBasicMaterial({ color: this.palette.accent, transparent: true, opacity: 0.35 }),
    );
    stopLine.frustumCulled = false;
    group.add(stopLine);

    const stopRing = new Mesh(
      new RingGeometry(spec.radius * 0.86, spec.radius, 28),
      new MeshBasicMaterial({ color: this.palette.accent, side: DoubleSide, depthWrite: false }),
    );
    stopRing.renderOrder = 3;
    group.add(stopRing);

    const view: RobotView = { group, body, tilt, shadow, stopLine, stopRing };
    this.robots.set(actor, view);
    this.scene.add(group);
    return view;
  }

  private placeRobot(actor: Actor, view: RobotView, alpha: number): void {
    const { body } = actor;
    const pos = renderPos(actor, alpha);

    // A small vertical bob driven by stride phase, scaled by speed, so a
    // walking robot has gait and a stationary one is dead still.
    const bob = Math.abs(Math.sin(body.stridePhase * Math.PI)) * 0.035 * body.speedFraction;

    const climb = this.climbOf(actor, body.heading);

    // Standing ON whatever it is standing on, not on the storey datum: the
    // group's origin is between the machine's feet, and every part measures
    // its own height up from there.
    view.body.position.set(pos.x, pos.y, pos.z + bob + climb.lift);
    view.body.rotation.z = body.heading;
    // Positive lean is nose-up, and a rotation about the local +y takes the
    // nose DOWN, hence the sign.
    view.tilt.rotation.y = -climb.lean;

    // No contact shadow on a staircase. The disc is 1.4 m across and a tread
    // is 0.62 m deep, so on a flight it is a flat decal spanning three steps:
    // most of it ends up buried inside the riser above and what is left reads
    // as a detached smear beside the robot. A machine on stairs has no
    // ground-plane contact patch to draw anyway.
    view.shadow.visible = actor.onLink === undefined;
    view.shadow.position.set(pos.x, pos.y, pos.z + DECAL_LIFT);

    this.placeTelemetry(actor, view, pos);
  }

  /**
   * Where the robot would come to rest if the brake went on this instant.
   *
   * Drawing this is the difference between believing the tuning numbers and
   * seeing them. Biggy's marker sits three times further out than Voxxy's, and
   * it is immediately obvious that you have to commit to stopping long before
   * you arrive.
   */
  private placeTelemetry(
    actor: Actor,
    view: RobotView,
    pos: { x: number; y: number; z: number },
  ): void {
    const { body } = actor;
    const speed = body.speed;
    const show = this.telemetry && speed >= 0.3;
    view.stopLine.visible = show;
    view.stopRing.visible = show;
    if (!show) return;

    const distance = body.stoppingDistance;
    const tx = pos.x + (body.vx / speed) * distance;
    const ty = pos.y + (body.vy / speed) * distance;

    const points = view.stopLine.geometry.getAttribute('position');
    points.setXYZ(0, pos.x, pos.y, pos.z + DECAL_LIFT);
    points.setXYZ(1, tx, ty, pos.z + DECAL_LIFT);
    points.needsUpdate = true;

    view.stopRing.position.set(tx, ty, pos.z + DECAL_LIFT);
  }

  // -- skid marks -----------------------------------------------------------

  /**
   * Leave a mark when a robot is sliding sideways.
   *
   * This is the visible consequence of lateral grip: ask Biggy for more turn
   * than 560 N can give and it scrubs across the floor, and now you can see
   * the arc it actually took rather than the one you asked for. Cheap, and it
   * reads as weight long before there is a model.
   */
  private recordSlip(actor: Actor, alpha: number): void {
    const { body } = actor;
    if (body.slipSpeed < SLIP_THRESHOLD) return;
    if (this.marks.length >= MAX_MARKS) this.marks.shift();

    const pos = renderPos(actor, alpha);
    this.marks.push({
      x: pos.x,
      y: pos.y,
      z: pos.z,
      width: body.spec.radius * 0.8,
      // Harder slides leave darker marks, so the trace reads as pressure and
      // not merely as a path.
      life: MARK_LIFE * Math.min(1, body.slipSpeed / (SLIP_THRESHOLD * 3)),
    });
  }

  private ageMarks(dt: number): void {
    for (let i = this.marks.length - 1; i >= 0; i -= 1) {
      this.marks[i].life -= dt;
      if (this.marks[i].life <= 0) this.marks.splice(i, 1);
    }
  }

  private writeMarks(): void {
    for (let i = 0; i < MAX_MARKS; i += 1) {
      const mark = this.marks[i];
      if (mark) {
        SCRATCH.position.set(mark.x, mark.y, mark.z + DECAL_LIFT * 0.6);
        SCRATCH.scale.set(mark.width, mark.width, 1);
        SCRATCH.rotation.set(0, 0, 0);
        SCRATCH.updateMatrix();
        this.markMesh.setMatrixAt(i, SCRATCH.matrix);
        // Fading by colour, not alpha: a mark is the floor's own colour
        // scuffed, so it fades by going back to it. A fixed dark mark is
        // invisible on Chapter I's near-black carpet and far too strong on
        // Chapter II's warm wood; scuffing the floor works in every era.
        const fade = Math.min(1, mark.life / MARK_LIFE) * 0.85;
        SCRATCH_COLOUR.copy(this.floorColour).lerp(this.markColour, fade);
        this.markMesh.setColorAt(i, SCRATCH_COLOUR);
      } else {
        SCRATCH.scale.setScalar(0);
        SCRATCH.updateMatrix();
        this.markMesh.setMatrixAt(i, SCRATCH.matrix);
      }
    }
    this.markMesh.instanceMatrix.needsUpdate = true;
    if (this.markMesh.instanceColor) this.markMesh.instanceColor.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------

/** Which storeys the venue actually has anything on. */
function storeysOf(venue: Venue): Level[] {
  return [...new Set(venue.rooms.map((room) => room.floor))].sort((a, b) => a - b);
}

/**
 * Every box on a storey as one instanced draw call.
 *
 * They are all the same unit cube. Position and scale carry the dimensions and
 * `instanceColor` carries the palette, which is the whole reason the building
 * can be five thousand seats and still cost one draw.
 */
/**
 * The same as `instanceBoxes`, with an ellipsoid in place of the cube.
 *
 * Eight by six segments: enough that a head is not a die and few enough
 * that it still belongs in a building made of boxes.
 */
function instanceBlobs(blobs: Box[], material: MeshLambertMaterial): InstancedMesh {
  const mesh = new InstancedMesh(
    new SphereGeometry(0.5, CROWD_SEGMENTS, CROWD_SEGMENTS - 2),
    material,
    Math.max(blobs.length, 1),
  );

  for (let i = 0; i < blobs.length; i += 1) {
    const { bounds, bottom, top, colour } = blobs[i];
    const height = Math.max(top - bottom, 0.01);
    SCRATCH.position.set(bounds.x + bounds.w / 2, bounds.y + bounds.h / 2, bottom + height / 2);
    SCRATCH.scale.set(Math.max(bounds.w, 0.01), Math.max(bounds.h, 0.01), height);
    SCRATCH.rotation.set(0, 0, 0);
    SCRATCH.updateMatrix();
    mesh.setMatrixAt(i, SCRATCH.matrix);
    mesh.setColorAt(i, SCRATCH_COLOUR.set(colour));
  }

  mesh.count = blobs.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/** Where to draw one activity, and in what state. The screen decides both. */
/** One room's audience inside a storey's baked instance buffers. */
interface SeatedRun {
  box0: number;
  blob0: number;
  /**
   * The people themselves, in the order they were baked.
   *
   * Kept rather than counted because `R` restarts the round and the seats
   * have to come back: emptying overwrites instance matrices in place, and an
   * `InstancedMesh` has no memory of what was in them. Re-deriving from the
   * same people in the same order is cheaper than keeping 2800 matrices
   * against a key the player presses once a session.
   */
  people: Person[];
  perBox: number;
  perBlob: number;
  /** The order they get up in. See `departureOrder`. */
  order: Uint16Array;
  /** How many of them have already gone. Only ever goes up. */
  gone: number;
}

interface SeatedStorey {
  boxMesh: InstancedMesh;
  blobMesh: InstancedMesh;
  seats: Map<string, SeatedRun>;
}

/**
 * The order an audience gets up in — scattered, and the same every time.
 *
 * Emptying a room in seat order is a wipe: a visible line moving across the
 * seating, which reads as the room being deleted rather than as people
 * leaving. Scattered, it reads as a room thinning out. Deterministic, because
 * everything else about this crowd is, and a screenshot harness is worth more
 * when the same room empties the same way twice.
 *
 * A prefix of this array is "who has gone", which is what makes emptying cost
 * only the people who have just left rather than a pass over the whole room.
 */
function departureOrder(count: number): Uint16Array {
  const order = new Uint16Array(count);
  for (let i = 0; i < count; i += 1) order[i] = i;
  // Fisher-Yates off a fixed-seed integer hash, so no RNG has to be threaded
  // in here and no other stream's sequence is disturbed by it.
  let a = 0x9e3779b9 ^ count;
  for (let i = count - 1; i > 0; i -= 1) {
    a = Math.imul(a ^ (a >>> 16), 0x45d9f3b) >>> 0;
    const j = a % (i + 1);
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }
  return order;
}

export interface ObjectiveMarker {
  id: string;
  x: number;
  y: number;
  z: number;
  floor: Level;
  colour: number;
  /** One of many. Drawn as a stud rather than a post. See `markers()`. */
  low?: boolean;
}

/**
 * Write a run of boxes into an instanced mesh at `from`.
 *
 * The same arithmetic `instanceBoxes` does when it builds one, factored out
 * because refilling a room's seats has to reproduce it exactly — the day
 * those two disagree is the day a restarted round puts an audience back six
 * inches to the left.
 */
function writeInstances(mesh: InstancedMesh, from: number, boxes: Box[]): void {
  for (let i = 0; i < boxes.length; i += 1) {
    const { bounds, bottom, top } = boxes[i];
    const height = Math.max(top - bottom, 0.01);
    SCRATCH.position.set(bounds.x + bounds.w / 2, bounds.y + bounds.h / 2, bottom + height / 2);
    SCRATCH.scale.set(Math.max(bounds.w, 0.01), Math.max(bounds.h, 0.01), height);
    SCRATCH.rotation.set(0, 0, 0);
    SCRATCH.updateMatrix();
    mesh.setMatrixAt(from + i, SCRATCH.matrix);
  }
}

function instanceBoxes(boxes: Box[], material: MeshLambertMaterial): InstancedMesh {
  const mesh = new InstancedMesh(
    new BoxGeometry(1, 1, 1),
    material,
    Math.max(boxes.length, 1),
  );

  for (let i = 0; i < boxes.length; i += 1) {
    const { bounds, bottom, top, colour } = boxes[i];
    // Degenerate boxes exist on purpose — the wafer that skins a stairwell
    // wall is one — and a zero scale is an uninvertible matrix, which three
    // will warn about once per frame forever.
    const height = Math.max(top - bottom, 0.01);
    SCRATCH.position.set(bounds.x + bounds.w / 2, bounds.y + bounds.h / 2, bottom + height / 2);
    SCRATCH.scale.set(Math.max(bounds.w, 0.01), Math.max(bounds.h, 0.01), height);
    SCRATCH.rotation.set(0, 0, 0);
    SCRATCH.updateMatrix();
    mesh.setMatrixAt(i, SCRATCH.matrix);
    mesh.setColorAt(i, SCRATCH_COLOUR.set(colour));
  }

  mesh.count = boxes.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/** The four edges of a floor tile, as line-segment vertices. */
function pushOutline(out: number[], tile: Rect, z: number): void {
  const { x, y, w, h } = tile;
  const corners: [number, number][] = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
  for (let i = 0; i < 4; i += 1) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    out.push(a[0], a[1], z, b[0], b[1], z);
  }
}

/**
 * A room's floor plate as solid rectangles, with its stairwells taken out.
 *
 * Rectangle minus rectangle is up to four rectangles — the bands beyond each
 * end of the hole, then the strips either side of it. Applied hole by hole, so
 * a corridor with two flights coming up through it still comes out as a
 * handful of quads.
 */
function floorTiles(room: Room): Rect[] {
  if (!room.voids?.length) return [room.bounds];
  let tiles: Rect[] = [room.bounds];
  for (const hole of room.voids) {
    const next: Rect[] = [];
    for (const tile of tiles) next.push(...subtract(tile, hole));
    tiles = next;
  }
  return tiles;
}

function subtract(a: Rect, b: Rect): Rect[] {
  const x0 = Math.max(a.x, b.x);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y0 = Math.max(a.y, b.y);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  if (x1 <= x0 || y1 <= y0) return [a]; // misses this tile entirely
  const out: Rect[] = [];
  if (y0 > a.y) out.push(rect(a.x, a.y, a.w, y0 - a.y));
  if (y1 < a.y + a.h) out.push(rect(a.x, y1, a.w, a.y + a.h - y1));
  if (x0 > a.x) out.push(rect(a.x, y0, x0 - a.x, y1 - y0));
  if (x1 < a.x + a.w) out.push(rect(x1, y0, a.x + a.w - x1, y1 - y0));
  return out;
}

/** Blend two packed 0xRRGGBB colours. `t` of 0 is all `a`, 1 is all `b`. */
export function mix(a: number, b: number, t: number): number {
  const lerp = (shift: number): number =>
    Math.round(((a >> shift) & 0xff) * (1 - t) + ((b >> shift) & 0xff) * t);
  return (lerp(16) << 16) | (lerp(8) << 8) | lerp(0);
}

/** Multiply a packed 0xRRGGBB colour by a factor. */
export function shade(colour: number, factor: number): number {
  const r = Math.min(255, Math.round(((colour >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((colour >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((colour & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}
