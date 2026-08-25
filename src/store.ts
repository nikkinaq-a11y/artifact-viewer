import { create } from 'zustand';
import {
  CAMERA_DISTANCES,
  LIGHT_PRESETS,
  PEDESTAL_DEFAULTS,
  STUDIO_THEME_ORDER,
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

  lights: Record<string, { on: boolean; intensity: number }>;
  toggleLight: (id: string) => void;
  setLightIntensity: (id: string, v: number) => void;


  pedestal: { widthCm: number; lengthCm: number; heightCm: number };
  adjustPedestal: (key: 'widthCm' | 'lengthCm' | 'heightCm', dir: 1 | -1) => void;

  /**
   * Unbounded step counter, not wrapped to 0..11. Letting it run past a full turn keeps
   * the animation monotonic, so stepping from 11 to 12 eases forward through 360° rather
   * than unwinding all the way back to zero.
   */
  rotationStep: number;
  stepRotation: (dir: 1 | -1) => void;

  /** Multiplier on the artifact's auto-fit scale — P / Shift+P in Unreal. */
  objectScale: number;
  adjustScale: (dir: 1 | -1) => void;

  studioTheme: StudioTheme;
  /** Advances through STUDIO_THEME_ORDER — B is a cycle, not a two-way switch. */
  toggleStudioTheme: () => void;

  /**
   * Hides the pedestal without moving the artifact, leaving it floating in space. The
   * artifact keeps its seated height so toggling does not reframe the shot.
   */
  pedestalVisible: boolean;
  togglePedestal: () => void;

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
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const useViewer = create<ViewerState>((set) => ({
  camIndex: 0,
  nextCam: () => set((s) => ({ camIndex: s.camIndex + 1 })),
  prevCam: () => set((s) => ({ camIndex: s.camIndex - 1 })),

  camDistance: 0,
  cycleCamDistance: () =>
    set((s) => ({ camDistance: (s.camDistance + 1) % CAMERA_DISTANCES.length })),

  lights: Object.fromEntries(
    LIGHT_PRESETS.map((l) => [l.id, { on: l.on, intensity: l.intensity }]),
  ),
  toggleLight: (id) =>
    set((s) => ({ lights: { ...s.lights, [id]: { ...s.lights[id], on: !s.lights[id].on } } })),
  setLightIntensity: (id, v) =>
    set((s) => ({ lights: { ...s.lights, [id]: { ...s.lights[id], intensity: v } } })),


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

  pedestalVisible: true,
  togglePedestal: () => set((s) => ({ pedestalVisible: !s.pedestalVisible })),

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
}));

/** The metadata for the artifact currently on the pedestal, if any. */
export const currentArtifact = (s: ViewerState): ArtifactMeta | undefined =>
  s.artifacts[s.objectIndex];

/** Everything a gallery export needs to reproduce how the curator staged the scene. */
export function captureSettings(): SceneSettings {
  const s = useViewer.getState();
  return {
    pedestal: { ...s.pedestal },
    pedestalVisible: s.pedestalVisible,
    lights: structuredClone(s.lights),
    studioTheme: s.studioTheme,
    objectScale: s.objectScale,
    camIndex: s.camIndex,
    camDistance: s.camDistance,
  };
}

/** Restore a staged scene from an imported gallery, ignoring anything unrecognised. */
export function applySettings(next: SceneSettings | null): void {
  if (!next) return;
  useViewer.setState((s) => ({
    pedestal: { ...s.pedestal, ...next.pedestal },
    pedestalVisible: next.pedestalVisible ?? s.pedestalVisible,
    // Merge rather than replace: a gallery from an older version may not know about
    // lights added since, and those should keep their defaults.
    lights: { ...s.lights, ...next.lights },
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
  }));
}