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

/**
 * Ordered so cycling sweeps one side at a time instead of swinging across the artifact
 * on every press: Front, then the left group working outward, then the right group
 * working outward, then the centred/special views. Only one crossing (Left → Upper
 * Right) remains in a full cycle.
 */
export const CAMERA_PRESETS: CameraPreset[] = [
  { name: 'Front', position: [0, 1.25, 2.2], target: F, fov: 28 },

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
 * Studio background. White is for documentation-style plates where the artifact needs to
 * read against a neutral field; dark is the default gallery look. Horizon splits the two
 * surfaces on purpose — a light blue floor against grey walls — so the floor/wall join is
 * unmistakable and the artifact reads as standing *somewhere* rather than floating in an
 * even field. Dark and light both use one colour for floor and walls, which is exactly
 * what makes that join disappear in them.
 */
export type StudioTheme = 'dark' | 'light' | 'horizon';

/**
 * Cycle order for B. Dark first (the gallery default), then white, then horizon — the
 * order matters beyond taste: one press from the default still lands on white, which is
 * what the verify scripts and any existing demo script expect.
 */
export const STUDIO_THEME_ORDER: StudioTheme[] = ['dark', 'light', 'horizon'];

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
  }
> = {
  dark: {
    wall: '#0a0a0b',
    floor: '#0a0a0b',
    pedestal: '#0c0c0e',
    background: '#050506',
    envIntensity: 0.05,
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
    intensity: 22,
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
    intensity: 5,
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
    intensity: 12,
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
    // detail and inscriptions rather than a general-purpose key light.
    id: 'front',
    label: 'Front',
    position: [0, 1.42, 1.5],
    rotation: [-0.11, 0, 0],
    width: 0.8,
    height: 0.8,
    intensity: 9,
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
    intensity: 2.2,
    color: '#ffe9d5',
    on: true,
  },
];

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