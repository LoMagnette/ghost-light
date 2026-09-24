/**
 * The wormhole: a vortex on the floor, and a column of light standing on it.
 *
 * Drawn and nothing else. It never collides and the simulation never hears of
 * it — the robot that goes through is animated by a pose on the renderer (see
 * `BlockoutRenderer.setPose`), not moved, so the physics stays fixed-step and
 * deterministic right up to the moment the chapter hands over.
 *
 * Flat on the floor rather than stood up facing the camera. The view is
 * isometric and fixed, so a disc lying in the floor plane is drawn as the
 * same ellipse every tile and seat in the building is: it reads as a hole IN
 * the building, where a disc turned to face the viewer would read as a sticker
 * on the screen.
 */

import {
  AdditiveBlending,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';

/** Across the vortex at full size, metres. Wider than Biggy, who never uses it. */
export const WORMHOLE_RADIUS = 1.8;
/** How tall the column of light stands, metres. Clears a storey-0 ceiling. */
const COLUMN_HEIGHT = 7.0;

/*
 * Spiral arms turning inwards around a dark centre, and a bright rim.
 *
 * The centre is DARK on purpose. A bright core reads as a light on the floor;
 * a dark one surrounded by light reads as depth, which is the whole of what
 * "a hole in the building" has to say. `open` scales everything, so the same
 * material opens, holds and closes.
 */
const DISC_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DISC_FRAGMENT = /* glsl */ `
  uniform float time;
  uniform float open;
  uniform vec3 colour;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;

    float a = atan(p.y, p.x);
    // Three arms, wound tighter towards the middle, turning inwards.
    float arms = sin(a * 3.0 + log(r + 0.04) * 7.0 + time * 5.0) * 0.5 + 0.5;
    float swirl = smoothstep(0.35, 1.0, arms) * smoothstep(0.08, 0.5, r) * (1.0 - r * 0.55);
    float rim = smoothstep(0.84, 0.97, r) * (1.0 - smoothstep(0.97, 1.0, r));
    float hole = 1.0 - smoothstep(0.0, 0.32, r);

    vec3 light = colour * (swirl * 1.5 + rim * 2.2) + vec3(1.0) * rim * 0.35;
    vec3 c = mix(light, vec3(0.0), hole * 0.85);
    float alpha = clamp(swirl + rim + hole * 0.95, 0.0, 1.0) * open;
    gl_FragColor = vec4(c, alpha);
  }
`;

/*
 * The column: brightest at the floor and gone by the top, with a slow
 * shimmer running up it. Additive, so it lights whatever it stands in front
 * of rather than painting over it.
 */
const COLUMN_FRAGMENT = /* glsl */ `
  uniform float time;
  uniform float open;
  uniform vec3 colour;
  varying vec2 vUv;

  void main() {
    float fade = pow(1.0 - vUv.y, 2.2);
    float shimmer = 0.75 + 0.25 * sin(vUv.y * 22.0 - time * 7.0 + vUv.x * 18.0);
    gl_FragColor = vec4(colour * fade * shimmer * 0.55 * open, 1.0);
  }
`;

export class Wormhole {
  readonly object = new Group();

  private readonly disc: ShaderMaterial;
  private readonly column: ShaderMaterial;
  private readonly discMesh: Mesh;
  private readonly columnMesh: Mesh;
  private time = 0;

  /**
   * @param colour packed sRGB, as every palette colour is. Handed to the
   *   shader unconverted: a raw `ShaderMaterial` is not colour-managed on the
   *   way out, so the bytes that go in are the bytes that come out.
   */
  constructor(colour: number) {
    const rgb = new Vector3(((colour >> 16) & 0xff) / 255, ((colour >> 8) & 0xff) / 255, (colour & 0xff) / 255);

    this.disc = new ShaderMaterial({
      uniforms: { time: { value: 0 }, open: { value: 0 }, colour: { value: rgb } },
      vertexShader: DISC_VERTEX,
      fragmentShader: DISC_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
      side: DoubleSide,
    });
    this.column = new ShaderMaterial({
      uniforms: { time: { value: 0 }, open: { value: 0 }, colour: { value: rgb.clone() } },
      vertexShader: DISC_VERTEX,
      fragmentShader: COLUMN_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    });

    // A plane is drawn in its own xy, which in this z-up world IS the floor.
    this.discMesh = new Mesh(new PlaneGeometry(2, 2), this.disc);
    // Open-ended; a cylinder is built along y, so it is stood up onto z.
    this.columnMesh = new Mesh(new CylinderGeometry(1, 1, COLUMN_HEIGHT, 32, 1, true), this.column);
    this.columnMesh.rotation.x = Math.PI / 2;
    // Drawn after the building, and the column after the disc it stands on.
    this.discMesh.renderOrder = 10;
    this.columnMesh.renderOrder = 11;

    this.object.add(this.discMesh, this.columnMesh);
    this.object.visible = false;
  }

  /**
   * Put it somewhere, at some size.
   *
   * `open` is 0..1 and does double duty on purpose: it is both how big the
   * vortex is and how bright, so one number opens it, holds it and shuts it,
   * and a half-open wormhole is never a full-size ghost of one.
   */
  place(x: number, y: number, z: number, open: number, dt: number): void {
    this.time += dt;
    const shown = Math.max(0, Math.min(1, open));
    this.object.visible = shown > 0.001;
    if (!this.object.visible) return;

    // Just clear of the floor, or it fights the carpet for the same depth.
    this.object.position.set(x, y, z + 0.03);
    const r = WORMHOLE_RADIUS * (0.25 + 0.75 * shown);
    this.discMesh.scale.set(r, r, 1);
    // Narrower than the disc: it stands in the hole, not around it.
    this.columnMesh.scale.set(r * 0.42, 1, r * 0.42);
    this.columnMesh.position.z = COLUMN_HEIGHT / 2;
    // Spin the disc as well as its pattern — the pattern alone looks painted.
    this.discMesh.rotation.z = -this.time * 0.9;

    for (const m of [this.disc, this.column]) {
      m.uniforms.time.value = this.time;
      m.uniforms.open.value = shown;
    }
  }

  dispose(): void {
    this.object.removeFromParent();
    this.discMesh.geometry.dispose();
    this.columnMesh.geometry.dispose();
    this.disc.dispose();
    this.column.dispose();
  }
}
