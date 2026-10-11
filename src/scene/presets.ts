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
  /**
   * Offers the camera-height slider for this view. The slider raises and lowers camera and
   * target together, so the angle the view is looking down or up at is kept exactly and
   * only where it is taken from moves. Only the tilted views want it: on a level view it
   * would just re-create the rise/fall variants that were deliberately cut.
   */
  heightAdjustable?: boolean;
};

/** Height of the artifact's visual centre above the floor, metres. Pedestal top + half artifact. */
export const FOCUS_HEIGHT = 1.25;

const F: [number, number, number] = [0, FOCUS_HEIGHT, 0];

/**
 * Front-facing views only. The artifact turns on R, so the camera never has to travel
 * round it to show another side — orbiting to the side views just duplicated what a
 * rotation step already gives, with the lighting rig no longer where it was designed to
 * be seen from. Every preset here sits on the centre line (x = 0) looking along -Z.
 *
 * One straight-on view at the artifact's own height, then looking down and up, then the
 * close and wide framings. The straight-on view used to come as a high / mid / low trio;
 * the high and low versions were cut once the tilted views got their own height slider.
 */
export const CAMERA_PRESETS: CameraPreset[] = [
  { name: 'Front', position: [0, FOCUS_HEIGHT, 2.2], target: F, fov: 28 },

  // Tilted views — looking down onto and up at the artifact from the front.
  { name: 'Upper', position: [0, 2.3, 1.6], target: F, fov: 30, heightAdjustable: true },
  { name: 'Lower', position: [0, 0.75, 1.9], target: F, fov: 30, heightAdjustable: true },

  // Framings
  { name: 'Close', position: [0, 1.3, 1.1], target: F, fov: 22 },
  { name: 'Wide', position: [0, 1.5, 3.2], target: [0, 1.1, 0], fov: 38 },
];

/**
 * Range of the camera-height slider on the tilted views, metres either side of the
 * authored height. Because the angle is held, the artifact travels down or up the frame as
 * the camera rises or falls; at 60 cm it was already at the frame edge, so the travel stops
 * where it is still comfortably in shot.
 */
export const CAMERA_HEIGHT_RANGE = 0.35;

/**
 * D holds the view and changes only how far it is taken from — framings of every preset
 * rather than three times as many presets. The factor scales the camera's distance from
 * whatever it is looking at, and the FOV is deliberately left alone: matching focal length
 * is what makes the set read as the same shot from nearer or further rather than a
 * different, wider one.
 *
 * Far is the default and the first stop; D then moves in. The steps shrink the distance by
 * about a third each time, so the move in is a real change rather than a nudge — Near puts
 * the Close preset about 65 cm from the artifact. MIN_DISTANCE in CameraRig has to sit
 * below the nearest of these, or OrbitControls clamps the camera back out.
 */
export const CAMERA_DISTANCES: { name: string; factor: number }[] = [
  { name: 'Far', factor: 1.34 },
  { name: 'Mid', factor: 0.92 },
  { name: 'Near', factor: 0.6 },
];

/** Safe lookup — the index is cycled unbounded and can arrive out of range from a gallery file. */
export function cameraDistance(i: number) {
  const n = CAMERA_DISTANCES.length;
  return CAMERA_DISTANCES[(((Math.trunc(i) || 0) % n) + n) % n];
}

/**
 * Studio background. There are no walls: the artifact stands on an open floor that fades
 * into a flat backdrop colour, so `background` *is* the backdrop. White is for
 * documentation-style plates where the artifact needs to read against a neutral field;
 * dark is the default gallery look. Horizon holds floor and backdrop apart on purpose — a
 * light blue floor against grey — so the horizon line is unmistakable and the artifact
 * reads as standing *somewhere* rather than floating in an even field. Silhouette is the
 * odd one out: it is a lighting state as much as a background, and `backlit` is what
 * carries that to the rig.
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
    floor: string;
    pedestal: string;
    /** The backdrop. Also the fog colour, so the far floor fades into it with no edge. */
    background: string;
    /**
     * Fog distances for this theme, metres, overriding FLOOR_FOG. Where the fade sits sets
     * how soft the horizon is: the further out and narrower the band, the closer to the
     * true horizon it lands and the sharper the line.
     */
    fog?: { near: number; far: number };
    envIntensity: number;
    /** Opacity of the grounding contact shadow, which needs to differ per background. */
    contactShadowOpacity: number;
    /**
     * The HUD and gallery sit on a light backdrop in this theme and need dark-on-light
     * styling. Kept separate from the theme name because two very different themes want
     * it — the white cyclorama, and silhouette's white field.
     */
    overlaysOnLight?: boolean;
    /**
     * Removes the floor, leaves the white backdrop untouched by tone mapping, and switches
     * the whole light rig off, so nothing lights the artifact and it falls to black against
     * pure white. Both halves are required: a lit artifact in front of white is not a
     * silhouette, and an unlit artifact in front of something dark is just invisible.
     */
    backlit?: boolean;
  }
> = {
  dark: {
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
    floor: '#f2f2f4',
    pedestal: '#e8e8ea',
    background: '#fafafa',
    envIntensity: 0.85,
    contactShadowOpacity: 0.4,
    overlaysOnLight: true,
  },
  horizon: {
    // Same hue and lightness as a plain pale blue, just carrying more chroma — enough
    // that the floor reads as blue rather than blue-grey once the dim floor lighting and
    // ACES tonemapping have desaturated it.
    floor: '#acd4f1',
    // Mid grey backdrop, deliberately darker than the floor so the two never blend at the
    // horizon. The pedestal goes darker still, or it merges into the blue.
    pedestal: '#5a5e64',
    background: '#7c8087',
    // The horizon line is the point of this theme, so the floor fades out late and over a
    // short band — a crisp line rather than the soft dissolve the other themes want.
    fog: { near: 26, far: 44 },
    // Between dark and white: these surfaces bounce real light, but nothing like a white
    // cyclorama, and lifting it further flattens the very contrast the theme exists for.
    envIntensity: 0.45,
    contactShadowOpacity: 0.5,
  },
  silhouette: {
    // There is no floor in this theme and the pedestal is never lit, so it resolves to
    // black. Kept dark rather than black so nothing turns to mud if a future change puts
    // any light back into the room. `floor` is unused while `backlit` holds.
    floor: '#141416',
    pedestal: '#0b0b0c',
    background: '#ffffff',
    // Any image-based lighting at all would put a rim of detail back on the artifact and
    // stop it reading as a flat cut-out, which is the entire look.
    envIntensity: 0,
    contactShadowOpacity: 0.3,
    backlit: true,
    // The white field fills the frame, so dark overlay panels wash out against it.
    overlaysOnLight: true,
  },
};

/**
 * Fog in the backdrop colour, metres from the camera: where it starts and where the floor
 * has fully dissolved into the background. Starts past the furthest camera position (Wide
 * at Far, about 4.7 m) so the artifact and pedestal are never tinted by it.
 */
export const FLOOR_FOG = { near: 6, far: 24 };

/** Floor size, metres. Has to run past the furthest fog `far` in every theme, or its edge shows. */
export const FLOOR_SIZE = 120;

export type LightPreset = {
  id: string;
  position: [number, number, number];
  /** Euler XYZ in radians — rect lights emit along -Z of their local frame. */
  rotation: [number, number, number];
  /** Aim point, metres. When set it replaces `rotation`: the panel is turned to face it. */
  aim?: [number, number, number];
  /** metres */
  width: number;
  height: number;
  color: string;
};

/**
 * The rect-light panels, mirroring the UE RectLight rig (Full_Exposure2 / RectLight2).
 * Placement only — how bright each one is, and whether it is on at all, belongs to the
 * light setting in LIGHT_SETTINGS. RectAreaLightUniformsLib.init() must run once or these
 * render black.
 *
 * Sizes are deliberately small and close. Large rect lights flood the room and wash the
 * pedestal out to mid-grey; the reference render has the pedestal nearly black with the
 * artifact carrying almost all the luminance.
 */
export const LIGHT_PRESETS: LightPreset[] = [
  {
    id: 'key',
    position: [-0.95, 1.75, 1.05],
    rotation: [-0.32, -0.72, 0],
    width: 0.7,
    height: 0.9,
    color: '#fff4e8',
  },
  {
    id: 'fill',
    position: [1.15, 1.45, 0.95],
    rotation: [-0.16, 0.88, 0],
    width: 0.7,
    height: 0.7,
    color: '#eaf0ff',
  },
  {
    id: 'rim',
    position: [0.55, 1.85, -1.1],
    rotation: [-0.3, Math.PI - 0.45, 0],
    width: 0.5,
    height: 0.6,
    color: '#ffffff',
  },
  {
    // A wide, low-tilt panel from the front (the FrontLight BP_PhotoViewerController
    // defines). Part of the light setting at a gentle level, so the shadow side reads as
    // dark rather than as black. No taller than the artifact and sitting above the pedestal
    // top: a larger or lower panel spills onto the pedestal and washes it to grey.
    id: 'front',
    position: [0, 1.52, 1.5],
    rotation: [-0.05, 0, 0],
    width: 1.25,
    height: 0.95,
    color: '#fff6ec',
  },
  {
    // Stands in for the Lumen bounce off the pedestal top that three.js has no GI for.
    // See PLAN.md Appendix A. Kept weak and close so it lifts the artifact's underside
    // without lighting the pedestal itself.
    id: 'bounce',
    position: [0, 1.02, 0.42],
    rotation: [1.15, 0, 0],
    width: 0.5,
    height: 0.35,
    color: '#ffe9d5',
  },
  {
    // The stark key: a small panel high to the side and only slightly forward. Small makes
    // the edge hard, and coming from the side splits the object into a lit half and a
    // black half.
    id: 'stark',
    position: [-1.35, 1.95, 0.25],
    rotation: [0, 0, 0],
    aim: [0, FOCUS_HEIGHT, 0],
    width: 0.32,
    height: 0.38,
    color: '#ffe8cc',
  },
];

/** The two settings L toggles between. */
export type LightSetting = 'light' | 'stark';
export const LIGHT_SETTING_ORDER: LightSetting[] = ['light', 'stark'];

/**
 * Everything about how bright the scene is, per setting, at the middle brightness level.
 *
 * `rects` names the panels from LIGHT_PRESETS that are on in this setting, with their
 * intensity; any panel not named is off. Rect-light intensity is per unit area, which is
 * why the small stark panel needs a far larger number than the big ones.
 *
 * **Why the spot carries so much.** RectAreaLight cannot cast shadows in three.js, so the
 * cast shadow comes from this spot alone. Whatever light the rect panels add falls straight
 * into that shadow and lifts it. When the rect key was the main light, shadows on the
 * pedestal came out pale and patchy, light where they should have been dark. So the rect
 * key is now kept low, for soft modelling on the object, and the spot, which casts the
 * shadow, does most of the lighting. Shadows then go properly dark.
 *
 * **light** is the everyday setting: shaped light from the upper left, with the front
 * panel and a little ambient keeping the shadow side readable rather than black. It
 * replaces the old studio and front settings, and is deliberately gentler than front was.
 * Pale scans clipped under the old levels.
 *
 * **stark** is one hard side light and a cool rim from behind, with no fill, bounce or
 * ambient, so half the object falls away into darkness.
 */
export const LIGHT_SETTINGS: Record<
  LightSetting,
  {
    rects: Record<string, number>;
    ambient: number;
    spot: {
      position: [number, number, number];
      intensity: number;
      angle: number;
      penumbra: number;
      color: string;
    };
  }
> = {
  light: {
    rects: { key: 5, fill: 1.2, rim: 5, front: 2.2, bounce: 0.6 },
    ambient: 0.03,
    spot: {
      position: [-1.35, 2.25, 1.35],
      intensity: 16,
      angle: 0.32,
      penumbra: 0.55,
      color: '#fff4e8',
    },
  },
  stark: {
    rects: { stark: 90, rim: 16 },
    ambient: 0,
    spot: {
      position: [-1.6, 2.3, 0.3],
      intensity: 55,
      angle: 0.26,
      penumbra: 0.35,
      color: '#ffe8cc',
    },
  },
};

/** Ambient light colour — a cool stand-in for the inter-reflection Lumen provides. */
export const AMBIENT_COLOR = '#8090a8';

/**
 * The five brightness steps on the slider, as multipliers on every light in the current
 * setting. Level 3 (index 2) is the setting as tuned above. The top step is held well
 * below the old front light, which blew out pale scans.
 */
export const LIGHT_LEVELS = [0.45, 0.65, 1, 1.3, 1.6];
export const DEFAULT_LIGHT_LEVEL = 2;

/**
 * P cycles the pedestal: the theme's own colour (dark in the gallery theme), hidden, then
 * white. Hidden keeps the artifact at its seated height, floating.
 */
export type PedestalMode = 'standard' | 'hidden' | 'white';
export const PEDESTAL_MODE_ORDER: PedestalMode[] = ['standard', 'hidden', 'white'];
/** A white that reads as white under the rig without clipping to a flat glare. */
export const WHITE_PEDESTAL = '#d6d6d9';

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
