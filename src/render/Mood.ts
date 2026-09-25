/**
 * The mood: what an era looks like through the lens, after the lights.
 *
 * The palette and the light level say what the building IS in each era. This
 * says how it is SEEN — Chapter I cold and grainy with its few lights blooming
 * in the dark, Chapter II warm like tungsten on old film, Chapter III clean
 * and bright. Four numbers and a tint per chapter, applied as one pass over
 * the finished frame, plus bloom on whatever is genuinely bright.
 *
 * It lives with the palette (`Palette.grade`) because it is part of the look
 * of an era, which is one of the four things a chapter may change. It costs
 * fill rate, so it runs only on high quality; low draws the scene straight to
 * the canvas exactly as it always has.
 */

import {
  HalfFloatType,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type Camera,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/** One era's lens. Every field is optional; absent is "no change". */
export interface Grade {
  /** Multiplies the finished colour. Packed sRGB, so 0xffffff is neutral. */
  tint?: number;
  /** 1 is unchanged, 0 is greyscale. */
  saturation?: number;
  /** 1 is unchanged; above it, darks darker and lights lighter. */
  contrast?: number;
  /** How far the corners go down, 0..1. */
  vignette?: number;
  /** Film grain, as an amplitude on 0..1 colour. 0.03 is visible, 0.08 is a lot. */
  grain?: number;
  /** Bloom strength on what is already bright. 0 is none. */
  bloom?: number;
}

/*
 * The grade, in display space — after `OutputPass` has converted to sRGB —
 * so that "saturation 0.8" and "a vignette of 0.3" mean what they look like
 * rather than something bent by a gamma curve.
 */
const GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    tint: { value: new Vector3(1, 1, 1) },
    saturation: { value: 1 },
    contrast: { value: 1 },
    vignette: { value: 0 },
    grain: { value: 0 },
    time: { value: 0 },
    aspect: { value: 16 / 9 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec3 tint;
    uniform float saturation;
    uniform float contrast;
    uniform float vignette;
    uniform float grain;
    uniform float time;
    uniform float aspect;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 c = texel.rgb;
      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(luma), c, saturation);
      c = (c - 0.5) * contrast + 0.5;
      c *= tint;

      // Round, not the shape of the screen: a lens darkens its corners, not
      // the long edges of a 16:9 frame.
      vec2 d = (vUv - 0.5) * vec2(aspect, 1.0);
      float v = smoothstep(0.45, 1.05, length(d));
      c *= 1.0 - vignette * v;

      // Grain that moves, or it is a dirty screen rather than film.
      float n = hash(vUv * vec2(1280.0, 720.0) + fract(time * 7.13) * 91.7) - 0.5;
      c += n * grain;

      gl_FragColor = vec4(clamp(c, 0.0, 1.0), texel.a);
    }
  `,
};

/**
 * Only what is already bright blooms: the markers, the ghost light, the lamp
 * on Voxxy, the wormhole. A threshold low enough to catch a lit floor turns
 * Chapter III into fog.
 */
const BLOOM_THRESHOLD = 0.72;
const BLOOM_RADIUS = 0.45;

export class Mood {
  private readonly composer: EffectComposer;
  private readonly render: RenderPass;
  private readonly bloom: UnrealBloomPass;
  private readonly grade: ShaderPass;
  private time = 0;

  constructor(renderer: WebGLRenderer, width: number, height: number) {
    /*
     * Multisampled, because a composer renders into a target and the canvas's
     * own antialiasing does not reach it. Without this every wall edge in the
     * building comes out stair-stepped on high and smooth on low, which is
     * the wrong way round.
     */
    const target = new WebGLRenderTarget(width, height, { type: HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, target);
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.setSize(width, height);

    this.render = new RenderPass(undefined as unknown as Scene, undefined as unknown as Camera);
    // Bloom at half resolution: it is a blur, and a blur does not need every pixel.
    this.bloom = new UnrealBloomPass(new Vector2(width / 2, height / 2), 0, BLOOM_RADIUS, BLOOM_THRESHOLD);
    this.grade = new ShaderPass(GRADE_SHADER);
    this.grade.uniforms.aspect.value = width / height;

    this.composer.addPass(this.render);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(this.grade);
  }

  /** Draw one frame of `scene` through `grade`. */
  draw(scene: Scene, camera: Camera, grade: Grade, dt: number): void {
    this.time += dt;
    this.render.scene = scene;
    this.render.camera = camera;
    this.bloom.strength = grade.bloom ?? 0;
    // A zero-strength bloom still costs its blur chain. Skip it.
    this.bloom.enabled = this.bloom.strength > 0;

    const u = this.grade.uniforms;
    const tint = grade.tint ?? 0xffffff;
    (u.tint.value as Vector3).set(((tint >> 16) & 0xff) / 255, ((tint >> 8) & 0xff) / 255, (tint & 0xff) / 255);
    u.saturation.value = grade.saturation ?? 1;
    u.contrast.value = grade.contrast ?? 1;
    u.vignette.value = grade.vignette ?? 0;
    u.grain.value = grade.grain ?? 0;
    u.time.value = this.time;

    this.composer.render(dt);
  }

  setPixelRatio(ratio: number): void {
    this.composer.setPixelRatio(ratio);
  }

  dispose(): void {
    this.bloom.dispose();
    this.grade.dispose();
    this.composer.dispose();
  }
}
