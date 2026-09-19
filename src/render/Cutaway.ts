/**
 * Seeing a robot that is standing behind something.
 *
 * The camera is fixed, so sooner or later the building gets between it and the
 * machine you are driving — a column, a seat bank, the parapet along the
 * corridor. The 2D renderer's answer was to draw robots over everything, which
 * works only because a painter's algorithm has no depth to argue with. With a
 * real depth buffer the wall wins, correctly, and the player loses the robot.
 *
 * So the wall gives way instead, in a soft disc around each robot: anything
 * BETWEEN the camera and a robot fades to `CUTAWAY_FADE`, everything else
 * stays solid. Not the whole wall — a wall here is 125 m long and fading one
 * would dissolve half the building to show one machine. A disc is also the
 * honest shape, because what is being asked for is "let me see THERE".
 *
 * It is a screen-space test and therefore a shader one: the alternative is to
 * work out on the CPU which of six thousand boxes occlude which robot, and
 * then to make those particular instances translucent, which an InstancedMesh
 * cannot do — it has one material and therefore one opacity.
 *
 * The cost is one extra pass over the storey's geometry. The solid pass
 * discards the disc and writes depth as usual; the ghost pass draws ONLY the
 * disc, translucent and without writing depth, after the robots. At the rim
 * the ghost is fully opaque, so the two meet with no seam.
 */

import { MeshLambertMaterial, Vector4 } from 'three';

/** Most robots the cutaway tracks at once. The largest cast is three. */
export const CUTAWAY_MAX = 3;

/**
 * Opacity a wall drops to in the middle of the cutaway.
 *
 * Not zero, on purpose. A hole reads as a hole in the building; a ghost reads
 * as something being in the way, which is the fact the player actually needs —
 * you are about to drive into whatever this is.
 */
const CUTAWAY_FADE = 0.22;

/** Metres of fade between the solid building and the clear centre. */
const CUTAWAY_FEATHER = 0.65;

/**
 * How far in front of a robot a surface has to be before it starts to fade,
 * and how far before it has faded completely. Metres, along the view axis.
 *
 * The near number is not zero: a seat block a robot is standing beside is
 * level with it, not in front of it, and dissolving the furniture a machine is
 * touching makes the building feel unreliable.
 */
const CUTAWAY_NEAR = 0.2;
const CUTAWAY_FAR = 0.8;

/**
 * Radius of one robot's disc, metres. Scales with the machine: Droid is 2 m
 * tall and needs roughly half again the hole Voxxy does.
 *
 * Deliberately tight — a little over the robot's own silhouette and no more.
 * Generous was tried first and it eats scenery that is merely NEAR the robot
 * rather than in front of it: a column a metre and a half to one side, clearly
 * hiding nothing, loses its top and reads as a bug in the building. The effect
 * is at its best when a player does not notice it is there.
 */
export function cutawayRadius(radius: number, height: number): number {
  return radius * 1.2 + height * 0.5;
}

export interface CutawayUniforms {
  /** xyz is a robot's centre in VIEW space; w is its radius. */
  uCutaway: { value: Vector4[] };
  uCutawayCount: { value: number };
}

export function createCutawayUniforms(): CutawayUniforms {
  return {
    uCutaway: { value: Array.from({ length: CUTAWAY_MAX }, () => new Vector4()) },
    uCutawayCount: { value: 0 },
  };
}

const COMMON = /* glsl */ `
uniform vec4 uCutaway[${CUTAWAY_MAX}];
uniform int uCutawayCount;
varying vec3 vCutawayView;
`;

const MASK = /* glsl */ `
float cutawayMask() {
  float mask = 0.0;
  for (int i = 0; i < ${CUTAWAY_MAX}; i++) {
    if (i >= uCutawayCount) break;
    vec4 robot = uCutaway[i];
    // View space looks down -z, so a fragment NEARER the camera than the robot
    // has the LARGER z. Only what is in front of the robot is in the way.
    float ahead = smoothstep(
      ${CUTAWAY_NEAR.toFixed(2)},
      ${CUTAWAY_FAR.toFixed(2)},
      vCutawayView.z - robot.z
    );
    // Orthographic, so view-space x and y ARE screen position: no divide.
    float radial = 1.0 - smoothstep(
      robot.w,
      robot.w + ${CUTAWAY_FEATHER.toFixed(2)},
      length(vCutawayView.xy - robot.xy)
    );
    mask = max(mask, ahead * radial);
  }
  return mask;
}
`;

/**
 * A material for the building that knows about the cutaway.
 *
 * `ghost` picks which side of the disc boundary this material draws: the solid
 * pass everything outside it, the ghost pass everything inside. They share the
 * uniform objects, so one update moves both.
 */
export function cutawayMaterial(uniforms: CutawayUniforms, ghost: boolean): MeshLambertMaterial {
  const material = new MeshLambertMaterial(
    ghost
      ? // Depth stays READ but is never written: the disc is drawn over the
        // robot deliberately, and two translucent walls in the same disc must
        // not fight over which of them is in front.
        { transparent: true, depthWrite: false }
      : {},
  );

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader =
      COMMON +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vCutawayView = mvPosition.xyz;`,
      );

    shader.fragmentShader =
      COMMON +
      MASK +
      shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        float cutaway = cutawayMask();
        if (${ghost ? 'cutaway <= 0.001' : 'cutaway > 0.001'}) discard;`,
      );

    if (ghost) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
        // Solid at the rim, where the pass that discarded this fragment left
        // off, fading to CUTAWAY_FADE at the centre. The two passes meet at
        // full opacity, so there is no seam to see.
        gl_FragColor.a *= mix(1.0, ${CUTAWAY_FADE.toFixed(2)}, cutaway);`,
      );
    }
  };

  // three caches compiled programs by material type and defines, and knows
  // nothing about what onBeforeCompile injected — so without this the solid
  // pass and the ghost pass are handed the same program and one of them is
  // silently wrong.
  material.customProgramCacheKey = () => (ghost ? 'cutaway-ghost' : 'cutaway-solid');

  return material;
}
