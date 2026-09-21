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
import {
  Crowd,
  PERSON_HEAD_HIGH,
  PERSON_HEAD_WIDE,
  PERSON_HEIGHT,
  PERSON_HIP,
  PERSON_LEG_TOP,
  PERSON_NECK,
  PERSON_SHOULDER,
  PERSON_THICK,
  PERSON_TORSO_WIDE,
  SEATED_LAP_FORWARD,
  SEATED_PERSON_HEIGHT,
  SEATED_SHOULDER,
  SEATED_SPINE_BACK,
  SEATED_THIGH_HIGH,
  SEATED_THIGH_LONG,
  SEATED_TORSO_THICK,
  SEATED_TORSO_TOP,
  type Person,
} from '@/core/Crowd';
import { renderPos } from '@/core/Sim';
import { groundAt, rect, type Level, type Material, type Rect, type Room, type Venue } from '@/core/Venue';
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
/** Boxes per standing person: legs, torso, shoulders. The head is a blob. */
const PERSON_PARTS = 3;

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
   * The people on their feet, rewritten every frame.
   *
   * One mesh for the whole game rather than one per storey, because only the
   * visible storey is ever written into it — a mover on the floor you are not
   * looking at costs nothing at all.
   */
  private readonly crowd: Crowd;
  private readonly moverMesh: InstancedMesh;
  private readonly moverHeads: InstancedMesh;

  constructor(
    camera: OrthographicCamera,
    venue: Venue,
    palette: Palette,
    lightLevel: number,
    crowd: Crowd,
  ) {
    this.camera = camera;
    this.venue = venue;
    this.palette = palette;
    // Before the storeys are built: each one bakes its own seated population
    // in as it goes, which is what makes five thousand people free.
    this.crowd = crowd;

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
      new SphereGeometry(0.5, 8, 6),
      new MeshLambertMaterial({ color: 0xffffff }),
      MAX_MOVERS,
    );
    this.moverHeads.count = 0;
    this.moverHeads.frustumCulled = false;
    this.moverHeads.setColorAt(0, SCRATCH_COLOUR.set(0xffffff));
    this.scene.add(this.moverHeads);
  }

  /** Trousers, clothing and head for one person, in this era's colours. */
  private personColours(person: Person): [number, number, number] {
    const crowd = this.palette.crowd;
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
          person.y - SEATED_SHOULDER / 2,
          SEATED_TORSO_THICK,
          SEATED_SHOULDER,
        ),
        // Overlapping the lap, so hip and thigh are one mass rather than two
        // stacked slabs with a seam between them.
        bottom: person.z + SEATED_THIGH_HIGH * 0.5,
        top: person.z + SEATED_TORSO_TOP,
        colour: clothing,
      },
    ];
  }

  /** Where a seated person's head goes. Drawn as a blob, not a box. */
  private seatedHead(person: Person): Box {
    const [, , head] = this.personColours(person);
    const f = Math.cos(person.heading) >= 0 ? 1 : -1;
    const spine = person.x - f * SEATED_SPINE_BACK;
    return {
      bounds: rect(
        spine - PERSON_HEAD_WIDE / 2,
        person.y - PERSON_HEAD_WIDE / 2,
        PERSON_HEAD_WIDE,
        PERSON_HEAD_WIDE,
      ),
      bottom: person.z + SEATED_TORSO_TOP - 0.03,
      top: person.z + SEATED_PERSON_HEIGHT,
      colour: head,
    };
  }

  /** Put the standing crowd where it is this frame. Visible storey only. */
  private placeMovers(floor: Level): void {
    let i = 0;
    let h = 0;
    for (const person of this.crowd.movers) {
      if (person.floor !== floor || h >= MAX_MOVERS) continue;
      const [trousers, clothing, head] = this.personColours(person);

      /*
       * Legs, torso, two arms — all on the same centre line, so the heading
       * rotates the whole figure and no part has to orbit another.
       *
       * `thick` is front to back and `wide` is side to side. They were the
       * wrong way round in the first version, which turned every walker
       * ninety degrees: perfectly symmetrical at rest and unmistakable the
       * moment anyone walked anywhere.
       */
      i = this.placePart(i, person, 0, PERSON_LEG_TOP, PERSON_THICK * 0.8, PERSON_HIP, trousers);
      i = this.placePart(i, person, PERSON_LEG_TOP, PERSON_NECK, PERSON_THICK, PERSON_TORSO_WIDE, clothing);

      // A shoulder line: the torso is narrow and this sits across the top of
      // it at the full shoulder width. Without it the body is a plain
      // upright box and the head looks stuck on a post.
      i = this.placePart(i, person, PERSON_NECK - 0.15, PERSON_NECK, PERSON_THICK, PERSON_SHOULDER, clothing);

      /*
       * No arms, and that is a measurement rather than laziness.
       *
       * They were built, in a sleeve shade, and they do not register: a
       * real arm hangs INSIDE the shoulder width, so it protrudes about
       * seven centimetres, which at this zoom is two pixels. What would
       * make an arm read is the gap between it and the body, and there is
       * no room to draw one. They cost two of five boxes per walker —
       * forty per cent of the crowd's per-frame work — to say nothing, so
       * the shoulder line does the job alone.
       */

      SCRATCH.position.set(person.x, person.y, person.z + (PERSON_NECK + PERSON_HEIGHT) / 2);
      SCRATCH.scale.set(PERSON_HEAD_WIDE, PERSON_HEAD_WIDE, PERSON_HEAD_HIGH);
      SCRATCH.rotation.set(0, 0, person.heading);
      SCRATCH.updateMatrix();
      this.moverHeads.setMatrixAt(h, SCRATCH.matrix);
      this.moverHeads.setColorAt(h, SCRATCH_COLOUR.set(head));
      h += 1;
    }

    this.moverMesh.count = i;
    this.moverMesh.instanceMatrix.needsUpdate = true;
    if (this.moverMesh.instanceColor) this.moverMesh.instanceColor.needsUpdate = true;

    this.moverHeads.count = h;
    this.moverHeads.instanceMatrix.needsUpdate = true;
    if (this.moverHeads.instanceColor) this.moverHeads.instanceColor.needsUpdate = true;
  }

  /** One box of a walking person, in its own frame. */
  private placePart(
    index: number,
    person: Person,
    from: number,
    to: number,
    thick: number,
    wide: number,
    colour: number,
  ): number {
    SCRATCH.position.set(person.x, person.y, person.z + (from + to) / 2);
    SCRATCH.scale.set(thick, wide, to - from);
    SCRATCH.rotation.set(0, 0, person.heading);
    SCRATCH.updateMatrix();
    this.moverMesh.setMatrixAt(index, SCRATCH.matrix);
    this.moverMesh.setColorAt(index, SCRATCH_COLOUR.set(colour));
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
   * Switch the lights back on over part of the building.
   *
   * Up to three point lights along the zone's long axis, because one light in
   * the middle of a 30 m room lights the middle of a 30 m room. Hung at 4.5 m,
   * which is where a cinema hangs them.
   */
  revealZone(bounds: Rect, floor: Level, level: number): void {
    const storey = this.storeys.get(floor);

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
    const intensity = level * 5 * LAMBERT_SCALE;
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
    }
  }

  /** Put the building back in the dark. Called when a round is restarted. */
  clearReveals(): void {
    for (const light of this.revealed) light.removeFromParent();
    this.revealed.length = 0;
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
    const audience = this.crowd.seated.filter((person) => person.floor === floor);
    if (audience.length) {
      group.add(
        instanceBoxes(
          audience.flatMap((person) => this.seatedBoxes(person)),
          new MeshLambertMaterial(),
        ),
      );
      group.add(
        instanceBlobs(
          audience.map((person) => this.seatedHead(person)),
          new MeshLambertMaterial(),
        ),
      );
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
    for (const part of this.robotParts(spec)) {
      const geometry =
        part.shape === 'box'
          ? new BoxGeometry(part.w, part.d, part.h)
          : new SphereGeometry(0.5, 10, 7);
      const mesh = new Mesh(geometry, new MeshLambertMaterial({ color: part.colour }));
      if (part.shape === 'blob') mesh.scale.set(part.w, part.d, part.h);
      mesh.position.set(part.x ?? 0, part.y ?? 0, part.z + part.h / 2);
      body.add(mesh);
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

    const view: RobotView = { group, body, shadow, stopLine, stopRing };
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

    // Standing ON whatever it is standing on, not on the storey datum: the
    // group's origin is between the machine's feet, and every part measures
    // its own height up from there.
    view.body.position.set(pos.x, pos.y, pos.z + bob);
    view.body.rotation.z = body.heading;

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
  const mesh = new InstancedMesh(new SphereGeometry(0.5, 8, 6), material, Math.max(blobs.length, 1));

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
