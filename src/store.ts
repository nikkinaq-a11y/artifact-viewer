import { create } from 'zustand';
import { LIGHT_PRESETS, PEDESTAL_DEFAULTS, type StudioTheme } from './scene/presets';
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

  showHelp: boolean;
  toggleHelp: () => void;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const useViewer = create<ViewerState>((set) => ({
  camIndex: 0,
  nextCam: () => set((s) => ({ camIndex: s.camIndex + 1 })),
  prevCam: () => set((s) => ({ camIndex: s.camIndex - 1 })),

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
    set((s) => ({ studioTheme: s.studioTheme === 'dark' ? 'light' : 'dark' })),

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
    studioTheme: next.studioTheme === 'light' ? 'light' : 'dark',
    objectScale: next.objectScale ?? s.objectScale,
    camIndex: next.camIndex ?? s.camIndex,
  }));
}