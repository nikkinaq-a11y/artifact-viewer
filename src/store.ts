import { create } from 'zustand';
import {
  CAMERA_DISTANCES,
  CAMERA_HEIGHT_RANGE,
  DEFAULT_LIGHT_LEVEL,
  LIGHT_LEVELS,
  LIGHT_SETTING_ORDER,
  PEDESTAL_MODE_ORDER,
  PEDESTAL_DEFAULTS,
  STUDIO_THEME_ORDER,
  type LightSetting,
  type PedestalMode,
  type StudioTheme,
} from './scene/presets';
import type { ArtifactMeta } from './library/db';
import type { SceneSettings } from './library/galleryFile';

/**
 * The state BP_PhotoViewerController holds: CurrentCamIndex, CurrentObjectIndex,
 * per-light on/off + intensity, wall colour, pedestal dimensions, rotation and scale.
 */
type ViewerState = {
  camIndex: number;
  nextCam: () => void;
  prevCam: () => void;

  /**
   * Index into CAMERA_DISTANCES. Held apart from camIndex on purpose: D is a second
   * framing of whatever view is already up, so changing it must not disturb which preset
   * is in use.
   */
  camDistance: number;
  cycleCamDistance: () => void;

  /**
   * Height offset for the views that offer the slider, metres, keyed by preset name. Kept
   * per view so the high and low angles each remember their own setting. Camera and
   * target move together, so the angle of the view never changes — only where it is
   * taken from.
   */
  camHeights: Record<string, number>;
  setCamHeight: (name: string, metres: number) => void;

  /** L toggles light / stark. The values behind each are LIGHT_SETTINGS in presets.ts. */
  lightSetting: LightSetting;
  toggleLightSetting: () => void;
  /** Index into LIGHT_LEVELS — the five-step brightness slider. */
  lightLevel: number;
  setLightLevel: (level: number) => void;


  pedestal: { widthCm: number; lengthCm: number; heightCm: number };
  adjustPedestal: (key: 'widthCm' | 'lengthCm' | 'heightCm', dir: 1 | -1) => void;

  /**
   * Unbounded step counter, not wrapped to 0..11. Letting it run past a full turn keeps
   * the animation monotonic, so stepping from 11 to 12 eases forward through 360° rather
   * than unwinding all the way back to zero.
   */
  rotationStep: number;
  stepRotation: (dir: 1 | -1) => void;

  /** Multiplier on the artifact's auto-fit scale — S / Shift+S (P in the Unreal legend). */
  objectScale: number;
  adjustScale: (dir: 1 | -1) => void;

  studioTheme: StudioTheme;
  /** Advances through STUDIO_THEME_ORDER — B is a cycle, not a two-way switch. */
  toggleStudioTheme: () => void;

  /**
   * P: standard (the theme's colour) → hidden → white. Hidden keeps the artifact at its
   * seated height, floating, so changing mode never reframes the shot.
   */
  pedestalMode: PedestalMode;
  cyclePedestal: () => void;

  /** Metadata only; the parsed scene graphs live in library/models.ts. */
  artifacts: ArtifactMeta[];
  objectIndex: number;
  setArtifacts: (a: ArtifactMeta[]) => void;
  addArtifactMeta: (a: ArtifactMeta) => void;
  removeArtifactMeta: (id: string) => void;
  stepObject: (dir: 1 | -1) => void;
  selectObject: (index: number) => void;

  /** Progress for an in-flight import, shown as a modal. null when idle. */
  importing: { name: string; note: string } | null;
  setImporting: (v: { name: string; note: string } | null) => void;
  importError: string | null;
  setImportError: (v: string | null) => void;

  showGallery: boolean;
  toggleGallery: () => void;

  /**
   * Collapses the lower-left readout to its camera chip, the same bargain the gallery tab
   * makes with its count: the panel gets out of the way of the artifact without the one
   * value that changes as you work through the presets disappearing with it.
   */
  showHud: boolean;
  toggleHud: () => void;

  showHelp: boolean;
  toggleHelp: () => void;

  /**
   * I: bumped to ask the canvas for a snapshot. A counter rather than a flag so two
   * presses in a row are two snapshots; the capture itself lives inside the Canvas,
   * where the renderer is.
   */
  snapshotRequest: number;
  requestSnapshot: () => void;

  /** Short confirmation shown after a snapshot is saved. */
  notice: string | null;
  setNotice: (v: string | null) => void;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const useViewer = create<ViewerState>((set) => ({
  camIndex: 0,
  nextCam: () => set((s) => ({ camIndex: s.camIndex + 1 })),
  prevCam: () => set((s) => ({ camIndex: s.camIndex - 1 })),

  camDistance: 0,
  cycleCamDistance: () =>
    set((s) => ({ camDistance: (s.camDistance + 1) % CAMERA_DISTANCES.length })),

  camHeights: {},
  setCamHeight: (name, metres) =>
    set((s) => ({
      camHeights: {
        ...s.camHeights,
        [name]: clamp(metres, -CAMERA_HEIGHT_RANGE, CAMERA_HEIGHT_RANGE),
      },
    })),

  lightSetting: 'light',
  toggleLightSetting: () =>
    set((s) => {
      const i = LIGHT_SETTING_ORDER.indexOf(s.lightSetting);
      return { lightSetting: LIGHT_SETTING_ORDER[(i + 1) % LIGHT_SETTING_ORDER.length] };
    }),
  lightLevel: DEFAULT_LIGHT_LEVEL,
  setLightLevel: (level) =>
    set({ lightLevel: clamp(Math.round(level), 0, LIGHT_LEVELS.length - 1) }),


  pedestal: {
    widthCm: PEDESTAL_DEFAULTS.widthCm,
    lengthCm: PEDESTAL_DEFAULTS.lengthCm,
    heightCm: PEDESTAL_DEFAULTS.heightCm,
  },
  adjustPedestal: (key, dir) =>
    set((s) => {
      const d = PEDESTAL_DEFAULTS;
      const bounds = {
        widthCm: [d.minWidthCm, d.maxWidthCm],
        lengthCm: [d.minLengthCm, d.maxLengthCm],
        heightCm: [d.minHeightCm, d.maxHeightCm],
      }[key];
      return {
        pedestal: {
          ...s.pedestal,
          [key]: clamp(s.pedestal[key] + dir * d.stepCm, bounds[0], bounds[1]),
        },
      };
    }),

  rotationStep: 0,
  stepRotation: (dir) => set((s) => ({ rotationStep: s.rotationStep + dir })),

  objectScale: 1,
  adjustScale: (dir) => set((s) => ({ objectScale: clamp(s.objectScale + dir * 0.05, 0.25, 3) })),

  studioTheme: 'dark',
  toggleStudioTheme: () =>
    set((s) => {
      const i = STUDIO_THEME_ORDER.indexOf(s.studioTheme);
      return { studioTheme: STUDIO_THEME_ORDER[(i + 1) % STUDIO_THEME_ORDER.length] };
    }),

  pedestalMode: 'standard',
  cyclePedestal: () =>
    set((s) => {
      const i = PEDESTAL_MODE_ORDER.indexOf(s.pedestalMode);
      return { pedestalMode: PEDESTAL_MODE_ORDER[(i + 1) % PEDESTAL_MODE_ORDER.length] };
    }),

  artifacts: [],
  objectIndex: 0,
  setArtifacts: (artifacts) => set({ artifacts }),
  addArtifactMeta: (a) =>
    set((s) => ({
      artifacts: [...s.artifacts, a],
      // Jump to whatever was just added — the expected result of dropping a file in.
      objectIndex: s.artifacts.length,
    })),
  removeArtifactMeta: (id) =>
    set((s) => {
      const artifacts = s.artifacts.filter((a) => a.id !== id);
      return {
        artifacts,
        objectIndex: artifacts.length ? Math.min(s.objectIndex, artifacts.length - 1) : 0,
      };
    }),
  stepObject: (dir) =>
    set((s) => {
      if (s.artifacts.length === 0) return {};
      const n = s.artifacts.length;
      return { objectIndex: (((s.objectIndex + dir) % n) + n) % n };
    }),
  selectObject: (index) => set({ objectIndex: index }),

  importing: null,
  setImporting: (importing) => set({ importing }),
  importError: null,
  setImportError: (importError) => set({ importError }),

  showGallery: false,
  toggleGallery: () => set((s) => ({ showGallery: !s.showGallery })),

  showHud: true,
  toggleHud: () => set((s) => ({ showHud: !s.showHud })),

  showHelp: false,
  toggleHelp: () => set((s) => ({ showHelp: !s.showHelp })),

  snapshotRequest: 0,
  requestSnapshot: () => set((s) => ({ snapshotRequest: s.snapshotRequest + 1 })),

  notice: null,
  setNotice: (notice) => set({ notice }),
}));

/** The metadata for the artifact currently on the pedestal, if any. */
export const currentArtifact = (s: ViewerState): ArtifactMeta | undefined =>
  s.artifacts[s.objectIndex];

/** Everything a gallery export needs to reproduce how the curator staged the scene. */
export function captureSettings(): SceneSettings {
  const s = useViewer.getState();
  return {
    pedestal: { ...s.pedestal },
    // Kept for galleries opened by older builds, which only know visible or not.
    pedestalVisible: s.pedestalMode !== 'hidden',
    pedestalMode: s.pedestalMode,
    lightSetting: s.lightSetting,
    lightLevel: s.lightLevel,
    studioTheme: s.studioTheme,
    objectScale: s.objectScale,
    camIndex: s.camIndex,
    camDistance: s.camDistance,
    camHeights: { ...s.camHeights },
  };
}

/** Restore a staged scene from an imported gallery, ignoring anything unrecognised. */
export function applySettings(next: SceneSettings | null): void {
  if (!next) return;
  useViewer.setState((s) => ({
    pedestal: { ...s.pedestal, ...next.pedestal },
    pedestalMode: PEDESTAL_MODE_ORDER.includes(next.pedestalMode as PedestalMode)
      ? (next.pedestalMode as PedestalMode)
      : next.pedestalVisible === false
        ? 'hidden'
        : 'standard',
    // Galleries written before light / stark only have the old per-light switches; their
    // dramatic switch is what stark replaced. Saved intensities are deliberately ignored:
    // there was never a control for them, so they only carry the old, too-bright tuning.
    lightSetting: LIGHT_SETTING_ORDER.includes(next.lightSetting as LightSetting)
      ? (next.lightSetting as LightSetting)
      : next.lights?.dramatic?.on
        ? 'stark'
        : 'light',
    lightLevel:
      Number.isInteger(next.lightLevel) &&
      (next.lightLevel as number) >= 0 &&
      (next.lightLevel as number) < LIGHT_LEVELS.length
        ? (next.lightLevel as number)
        : DEFAULT_LIGHT_LEVEL,
    // Checked against the known themes rather than trusted: the field is a plain string
    // in the gallery format, and a file written by a newer version may name one this
    // build has never heard of.
    studioTheme: STUDIO_THEME_ORDER.includes(next.studioTheme as StudioTheme)
      ? (next.studioTheme as StudioTheme)
      : 'dark',
    objectScale: next.objectScale ?? s.objectScale,
    camIndex: next.camIndex ?? s.camIndex,
    // Indexed straight into CAMERA_DISTANCES, and a gallery written by another build can
    // name a step this one does not have, so it is range-checked rather than defaulted.
    camDistance:
      Number.isInteger(next.camDistance) &&
      (next.camDistance as number) >= 0 &&
      (next.camDistance as number) < CAMERA_DISTANCES.length
        ? (next.camDistance as number)
        : s.camDistance,
    // Clamped one by one: a hand-edited or newer file could carry anything here.
    camHeights:
      next.camHeights && typeof next.camHeights === 'object'
        ? Object.fromEntries(
            Object.entries(next.camHeights)
              .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
              .map(([k, v]) => [k, clamp(v, -CAMERA_HEIGHT_RANGE, CAMERA_HEIGHT_RANGE)]),
          )
        : s.camHeights,
  }));
}