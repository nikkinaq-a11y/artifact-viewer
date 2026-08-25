/**
 * Scene data ported from LV_BasicObjectCapture1.
 *
 * PHASE 0 HANDOFF: the camera and light values below are plausible reconstructions from
 * the reference render, not the real ones. The Unreal level has 13 CineCameraActors plus
 * RectLights whose transforms/FOV/intensity should replace these verbatim once captured
 * on the Windows machine. Everything here is plain data specifically so that swap is an
 * edit to this file and nothing else.
 */

export type CameraPreset = {
  name: string;
  /** metres, world space */
  position: [number, number, number];
  /** metres, world space — what the camera looks at */
  target: [number, number, number];
  /** vertical FOV, degrees */
  fov: number;
};

/** Height of the artifact's visual centre above the floor, metres. Pedestal top + half artifact. */
export const FOCUS_HEIGHT = 1.25;

const F: [number, number, number] = [0, FOCUS_HEIGHT, 0];

/** How far the level front views rise and fall from the artifact's centre, metres. */
const FRONT_SHIFT = 0.2;

/**
 * Ordered so cycling sweeps one side at a time instead of swinging across the artifact
 * on every press: the straight-on front trio, then the left group working outward, then
 * the right group working outward, then the centred/special views. Only one crossing
 * (Left → Upper Right) remains in a full cycle.
 */
export const CAMERA_PRESETS: CameraPreset[] = [
  { name: 'Front', position: [0, FOCUS_HEIGHT, 2.2], target: F, fov: 28 },

  // Straight-on variants. The camera rises and falls but the optical axis stays level —
  // camera height and target height move together — so these are a rise/fall shift, not a
  // tilt: the artifact travels down or up the frame rather than being looked down or up
  // at. That is the whole point of them, and it is why the target is not F.
  //
  // Pulled back slightly and widened a touch against the plain Front view, because a
  // shifted subject needs the extra frame to stay clear of the edge.
  {
    name: 'Front High',
    position: [0, FOCUS_HEIGHT + FRONT_SHIFT, 2.3],
    target: [0, FOCUS_HEIGHT + FRONT_SHIFT, 0],
    fov: 30,
  },
  {
    name: 'Front Low',
    position: [0, FOCUS_HEIGHT - FRONT_SHIFT, 2.3],
    target: [0, FOCUS_HEIGHT - FRONT_SHIFT, 0],
    fov: 30,
  },

  // Left group — outward from centre
  { name: 'Upper Left', position: [-1.3, 2.0, 1.5], target: F, fov: 30 },
  { name: 'Front Left', position: [-1.5, 1.35, 1.7], target: F, fov: 28 },
  { name: 'Raking Left', position: [-2.0, 1.15, 0.8], target: F, fov: 26 },
  { name: 'Left', position: [-2.2, 1.25, 0], target: F, fov: 28 },

  // Right group — outward from centre
  { name: 'Upper Right', position: [1.3, 2.0, 1.5], target: F, fov: 30 },
  { name: 'Front Right', position: [1.5, 1.35, 1.7], target: F, fov: 28 },
  { name: 'Raking Right', position: [2.0, 1.15, 0.8], target: F, fov: 26 },
  { name: 'Right', position: [2.2, 1.25, 0], target: F, fov: 28 },

  // Centred views
  { name: 'Close', position: [0, 1.3, 1.1], target: F, fov: 22 },
  { name: 'Upper', position: [0, 2.3, 1.6], target: F, fov: 30 },
  { name: 'Lower', position: [0, 0.75, 1.9], target: F, fov: 30 },
  { name: 'Wide', position: [0.6, 1.5, 3.2], target: [0, 1.1, 0], fov: 38 },
];

/**
 * D holds the view and changes only how far back it is taken from — a second framing of
 * every preset rather than 15 more presets. The factor scales the camera's distance from
 * whatever it is looking at, and the FOV is deliberately left alone: matching focal
 * length is what makes the pair read as the same shot from further away rather than a
 * different, wider one.
 */
export const CAMERA_DISTANCES: { name: string; factor: number }[] = [
  { name: 'Standard', factor: 1 },
  { name: 'Far', factor: 1.45 },
];

/** Safe lookup — the index is cycled unbounded and can arrive out of range from a gallery file. */
export function cameraDistance(i: number) {
  const n = CAMERA_DISTANCES.length;
  return CAMERA_DISTANCES[(((Math.trunc(i) || 0) % n) + n) % n];
}

/**
 * Studio background. White is for documentation-style plates where the artifact needs to
 * read against a neutral field; dark is the default gallery look. Horizon splits the two
 * surfaces on purpose — a light blue floor against grey walls — so the floor/wall join is
 * unmistakable and the artifact reads as standing *somewhere* rather than floating in an
 * even field. Dark and light both use one colour for floor and walls, which is exactly
 * what makes that join disappear in them. Silhouette is the odd one out: it is a lighting
 * state as much as a background, and `backlit` is what carries that to the rig.
 */
export type StudioTheme = 'dark' | 'light' | 'horizon' | 'silhouette';

/**
 * Cycle order for B. Dark first (the gallery default), then white, then horizon, then
 * silhouette — the order matters beyond taste: one press from the default still lands on
 * white, which is what the verify scripts and any existing demo script expect. Silhouette
 * goes last because it is the strongest departure from a lit studio.
 */
export const STUDIO_THEME_ORDER: StudioTheme[] = ['dark', 'light', 'horizon', 'silhouette'];

export const STUDIO_THEMES: Record<
  StudioTheme,
  {
    wall: string;
    /** Floor colour. Equal to `wall` in the themes that read as one continuous field. */
    floor: string;
    pedestal: string;
    background: string;
    envIntensity: number;
    /** Opacity of the grounding contact shadow, which needs to differ per background. */
    contactShadowOpacity: number;
    /**
     * The HUD and gallery sit on a light backdrop in this theme and need dark-on-light
     * styling. Kept separate from the theme name because two very different themes want
     * it — the white cyclorama, and silhouette's glowing wall.
     */
    overlaysOnLight?: boolean;
    /**
     * Turns the back wall into an unlit white panel and switches the whole light rig off,
     * so nothing lights the artifact and it falls to black against the glow. Both halves
     * are required: a lit artifact in front of a lightbox is not a silhouette, and an
     * unlit artifact in front of a dark wall is just invisible.
     */
    backlit?: boolean;
  }
> = {
  dark: {
    wall: '#0a0a0b',
    floor: '#0a0a0b',
    pedestal: '#0c0c0e',
    background: '#050506',
    // Low enough that the key light's shadow side is not lifted off black by image-based
    // lighting alone — the rig below is tuned on the assumption that this contributes
    // almost nothing, and raising it undoes that.
    envIntensity: 0.03,
    contactShadowOpacity: 0.65,
  },
  // A white cyclorama bounces a great deal of light in reality, so the environment is
  // lifted to keep the room from reading as flat grey card.
  light: {
    wall: '#f2f2f4',
    floor: '#f2f2f4',
    pedestal: '#e8e8ea',
    background: '#fafafa',
    envIntensity: 0.85,
    contactShadowOpacity: 0.4,
    overlaysOnLight: true,
  },
  horizon: {
    // Mid grey walls, deliberately darker than the floor so the two never blend under
    // the key light. The pedestal goes darker still, or it merges into the blue.
    wall: '#7c8087',
    // Same hue and lightness as a plain pale blue, just carrying more chroma — enough
    // that the floor reads as blue rather than blue-grey once the dim floor lighting and
    // ACES tonemapping have desaturated it.
    floor: '#acd4f1',
    pedestal: '#5a5e64',
    background: '#6e727a',
    // Between dark and white: these surfaces bounce real light, but nothing like a white
    // cyclorama, and lifting it further flattens the very contrast the theme exists for.
    envIntensity: 0.45,
    contactShadowOpacity: 0.5,
  },
  silhouette: {
    // The side walls, floor and pedestal are never lit in this theme, so these colours
    // are close to irrelevant — they all resolve to black. Kept dark rather than black so
    // that nothing turns to mud if a future change puts any light back into the room.
    wall: '#141416',
    floor: '#141416',
    pedestal: '#0b0b0c',
    // Matches the glowing wall so the wide and far framings, which can see past the wall's
    // edges, do not band the frame with a dark border around the lightbox.
    background: '#ffffff',
    // Any image-based lighting at all would put a rim of detail back on the artifact and
    // stop it reading as a flat cut-out, which is the entire look.
    envIntensity: 0,
    contactShadowOpacity: 0.3,
    backlit: true,
    // The lit wall fills most of the frame, so dark overlay panels wash out against it.
    overlaysOnLight: true,
  },
};

export type LightPreset = {
  id: string;
  label: string;
  position: [number, number, number];
  /** Euler XYZ in radians — rect lights emit along -Z of their local frame. */
  rotation: [number, number, number];
  /** metres */
  width: number;
  height: number;
  intensity: number;
  color: string;
  /** Whether it starts switched on. */
  on: boolean;
};

/**
 * Mirrors the UE RectLight rig (Full_Exposure2 / RectLight2 in the level). three.js
 * RectAreaLight is the direct analogue; note RectAreaLightUniformsLib.init() must run
 * once or these render black.
 *
 * The rig is tuned for range rather than brightness. The key sits low enough that ACES
 * still has room above the brightest highlight on a pale scan, and the fill, bounce and
 * ambient are all small enough that the side of the artifact facing away from the key
 * falls to true black instead of a lifted grey. That contrast is the base studio look;
 * the front light is the deliberate way out of it, not a fault in it.
 */
export const LIGHT_PRESETS: LightPreset[] = [
  // Sizes are deliberately small and close. Large rect lights flood the room and wash
  // the pedestal out to mid-grey; the reference render has the pedestal nearly black with
  // the artifact carrying almost all the luminance.
  {
    id: 'key',
    label: 'Key',
    position: [-0.95, 1.75, 1.05],
    rotation: [-0.32, -0.72, 0],
    width: 0.7,
    height: 0.9,
    // Held below the point where a light-toned scan clips: the shadow detail this rig is
    // built around is worth more than the last stop of highlight.
    intensity: 15,
    color: '#fff4e8',
    on: true,
  },
  {
    id: 'fill',
    label: 'Fill',
    position: [1.15, 1.45, 0.95],
    rotation: [-0.16, 0.88, 0],
    width: 0.7,
    height: 0.7,
    // Barely present. Enough to keep the shadow edge from reading as a hard clip, not
    // enough to open the shadow itself — that is the front light's job.
    intensity: 1.6,
    color: '#eaf0ff',
    on: true,
  },
  {
    id: 'rim',
    label: 'Rim',
    position: [0.55, 1.85, -1.1],
    rotation: [-0.3, Math.PI - 0.45, 0],
    width: 0.5,
    height: 0.6,
    intensity: 7,
    color: '#ffffff',
    on: true,
  },
  {
    // Mirrors the FrontLight / bFrontLightOn / SavedFrontIntensity variables that exist in
    // BP_PhotoViewerController but are bound to no key — the logic is there, dormant, and
    // the light itself lives in LV_ReflectiveObjectCapture rather than the baseline level.
    // Off by default here for the same reason; F switches it on.
    //
    // Front-on lighting flattens form, so it is a deliberate choice for reading surface
    // detail and inscriptions rather than a general-purpose key light. Wide enough to
    // wrap around the sides rather than punch a bright disc onto the front, but no taller
    // than the artifact and sitting above the pedestal top with almost no downward tilt:
    // a larger or lower panel spills straight onto the pedestal and washes it to mid
    // grey, which is the one thing the reference render is emphatic about not doing.
    //
    // With the raised ambient in AMBIENT_LIGHT.withFront, switching it on takes the whole
    // object to an even medium reading light with no part of it still at black.
    id: 'front',
    label: 'Front',
    position: [0, 1.52, 1.5],
    rotation: [-0.05, 0, 0],
    width: 1.25,
    height: 0.95,
    intensity: 10,
    color: '#fff6ec',
    on: false,
  },
  {
    id: 'bounce',
    label: 'Bounce',
    // Stands in for the Lumen bounce off the pedestal top that three.js has no GI for.
    // See PLAN.md Appendix A — this is the single largest fidelity delta. Kept weak and
    // close so it lifts the artifact's underside without lighting the pedestal itself.
    position: [0, 1.02, 0.42],
    rotation: [1.15, 0, 0],
    width: 0.5,
    height: 0.35,
    intensity: 0.9,
    color: '#ffe9d5',
    on: true,
  },
];

/**
 * Ambient stand-in for the floor/wall inter-reflection Lumen provides.
 *
 * `base` is almost nothing on purpose: the base studio is meant to leave the artifact's
 * shadow side at true black, and ambient is the one light that reaches everywhere, so any
 * real amount of it lifts those shadows off zero and there is no getting them back.
 *
 * `withFront` is the other half of the front light. Switching F on is meant to read as
 * the room being brought up to an even working level for reading surface detail — not as
 * one more lamp aimed at the front — so the general level rises with it and the shadows
 * come off black everywhere, including the faces the front light never reaches.
 */
export const AMBIENT_LIGHT = {
  color: '#8090a8',
  base: 0.012,
  // Enough to take the unlit faces off black, held below the point where it starts
  // lifting the pedestal and the walls along with the artifact.
  withFront: 0.07,
};

/**
 * The shadow-casting spot co-located with the key. RectAreaLight cannot cast shadows in
 * three.js, so the rig's look and its cast shadow are split across two lights; this is
 * the shadow half, and its intensity has to move with the key's or the cast reads
 * brighter than the light supposedly making it.
 *
 * It drops when the front light is on for the same reason the ambient rises: a flat
 * working light and a hard directional cast shadow are not the same room.
 */
export const KEY_SHADOW_INTENSITY = {
  base: 17,
  withFront: 11,
};

/** BP_AdjustablePedestal defaults. PHASE 0: replace with the real cm values. */
export const PEDESTAL_DEFAULTS = {
  widthCm: 40,
  lengthCm: 40,
  heightCm: 100,
  minWidthCm: 20,
  maxWidthCm: 120,
  minLengthCm: 20,
  maxLengthCm: 120,
  minHeightCm: 40,
  maxHeightCm: 160,
  stepCm: 5,
};

/**
 * R steps the artifact around a full turn in fixed increments rather than spinning it
 * continuously, so any given angle is repeatable — the useful behaviour when comparing
 * or documenting a piece. Yaw only; the artifact stays upright on the pedestal.
 *
 * 12 steps = 30° each, which matches the 0,30,0 rotation rate BP_RotatingObject used.
 */
export const ROTATION_STEPS = 12;
export const ROTATION_STEP_DEG = 360 / ROTATION_STEPS;
