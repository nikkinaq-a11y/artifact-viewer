import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { Studio } from './scene/Studio';
import { Pedestal } from './scene/Pedestal';
import { Lighting } from './scene/Lighting';
import { Environment } from './scene/Environment';
import { CameraRig } from './scene/CameraRig';
import { ArtifactMesh } from './scene/ArtifactMesh';
import { Snapshot } from './scene/Snapshot';
import { ContactShadow } from './scene/ContactShadow';
import { HeightSlider } from './ui/HeightSlider';
import { LightSlider } from './ui/LightSlider';
import {
  CAMERA_DISTANCES,
  CAMERA_PRESETS,
  CAMERA_FAR,
  CONTACT_SHADOW,
  FLOOR_FOG,
  ROTATION_STEP_DEG,
  ROTATION_STEPS,
  STUDIO_THEMES,
  cameraDistance,
  LIGHT_LEVELS,
} from './scene/presets';
import { currentArtifact, useViewer } from './store';
import { useKeybinds } from './ui/keybinds';
import { cm } from './lib/units';
import { DropZone } from './import/DropZone';
import { GalleryPanel } from './library/GalleryPanel';
import { listArtifactMeta } from './library/db';
import { seedLibraryOnce } from './library/seed';
import { useImportFiles } from './import/useImport';
import { isTauri } from '@tauri-apps/api/core';
import './App.css';

/** Always the newest release — see .github/workflows/release-mac.yml. */
const MAC_DOWNLOAD_URL =
  'https://github.com/nikkinaq-a11y/artifact-viewer/releases/latest/download/Artifact-Viewer-Mac.dmg';

function Hud() {
  const camIndex = useViewer((s) => s.camIndex);
  const camDistance = useViewer((s) => s.camDistance);
  const pedestal = useViewer((s) => s.pedestal);
  const rotationStep = useViewer((s) => s.rotationStep);
  const objectScale = useViewer((s) => s.objectScale);
  const showHelp = useViewer((s) => s.showHelp);
  const showHud = useViewer((s) => s.showHud);
  const toggleHud = useViewer((s) => s.toggleHud);
  const pedestalMode = useViewer((s) => s.pedestalMode);
  const lightSetting = useViewer((s) => s.lightSetting);
  const lightLevel = useViewer((s) => s.lightLevel);
  const theme = useViewer((s) => s.studioTheme);
  const artifacts = useViewer((s) => s.artifacts);
  const objectIndex = useViewer((s) => s.objectIndex);
  const meta = useViewer(currentArtifact);

  const n = CAMERA_PRESETS.length;
  const preset = CAMERA_PRESETS[((camIndex % n) + n) % n];
  const distance = cameraDistance(camDistance);

  // Under a backlit theme the whole rig is off, so reporting the F setting would describe
  // lights that are not currently doing anything.
  const backlit = STUDIO_THEMES[theme].backlit ?? false;

  // rotationStep is unbounded (and can go negative), so wrap it for display only.
  const rotationIndex = ((rotationStep % ROTATION_STEPS) + ROTATION_STEPS) % ROTATION_STEPS;
  const rotationDeg = rotationIndex * ROTATION_STEP_DEG;

  return (
    <>
      <div className={`hud${showHud ? '' : ' is-closed'}`}>
        {/* The camera readout doubles as the collapse control, so the panel can be
            reduced to a single chip without losing the one value that actually changes as
            you work through the presets — the same bargain the gallery tab makes with its
            count. Collapsed, this chip is all that is left in the corner. */}
        <button
          type="button"
          className="hud-tab"
          onClick={toggleHud}
          aria-expanded={showHud}
          title={showHud ? 'Reduce scene readout' : 'Show scene readout'}
        >
          <span className="hud-cam-index">
            {String((((camIndex % n) + n) % n) + 1).padStart(2, '0')}
          </span>
          <span className="hud-cam-name">{preset.name}</span>
          {showHud && <span className="hud-cam-total">of {n}</span>}
          <span className="hud-chevron">{showHud ? '×' : '▴'}</span>
        </button>

        {showHud && (
          <div className="hud-body">
            {artifacts.length > 0 && (
              <div className="hud-row">
                <span className="hud-key">Object</span>
                {meta?.name} <span className="dim">({objectIndex + 1}/{artifacts.length})</span>
              </div>
            )}
            <div className="hud-row">
              <span className="hud-key">Distance</span>
              {distance.name}
            </div>
            <div className="hud-row">
              <span className="hud-key">Pedestal</span>
              {pedestalMode === 'hidden' ? (
                <span className="dim">hidden — P for white</span>
              ) : (
                <>
                  {`${pedestal.widthCm} × ${pedestal.lengthCm} × ${pedestal.heightCm} cm`}
                  {pedestalMode === 'white' && <span className="dim"> · white</span>}
                </>
              )}
            </div>
            <div className="hud-row">
              <span className="hud-key">Rotation</span>
              {rotationDeg}° <span className="dim">· step {rotationIndex + 1}/{ROTATION_STEPS}</span>
            </div>
            <div className="hud-row">
              <span className="hud-key">Scale</span>
              {objectScale.toFixed(2)}×
            </div>
            {backlit ? (
              <div className="hud-row">
                <span className="hud-key">Lighting</span>
                silhouette <span className="dim">· rig off</span>
              </div>
            ) : (
              <div className="hud-row">
                <span className="hud-key">Lighting</span>
                {lightSetting}{' '}
                <span className="dim">
                  · {lightLevel + 1}/{LIGHT_LEVELS.length}
                </span>
              </div>
            )}
            <div className="hud-hint">Tab for controls</div>
          </div>
        )}
      </div>

      {showHelp && (
        <div className="help">
          <h2>Controls</h2>
          <ul>
            <li><b>C</b> switch camera view <span className="dim">(Shift+C back)</span></li>
            <li>
              <b>D</b> camera distance —{' '}
              {CAMERA_DISTANCES.map((d) => d.name.toLowerCase()).join(' / ')}
            </li>
            <li><b>O</b> cycle object <span className="dim">(Shift+O back)</span></li>
            <li>
              <b>R</b> rotate {ROTATION_STEP_DEG}° <span className="dim">(Shift+R to undo)</span>
            </li>
            <li><b>S</b> object scale <span className="dim">(Shift+S smaller)</span></li>
            <li>
              <b>H</b> height — pedestal and object together{' '}
              <span className="dim">(Shift+H lower)</span>
            </li>
            <li><b>W</b> pedestal width <span className="dim">(Shift+W narrower)</span></li>
            <li><b>Z</b> pedestal depth <span className="dim">(Shift+Z shallower)</span></li>
            <li><b>P</b> pedestal — standard / hidden / white</li>
            <li>
              <b>L</b> lighting — light / stark{' '}
              <span className="dim">(no effect in silhouette)</span>
            </li>
            <li><b>B</b> scene — dark / white / horizon / silhouette</li>
            <li><b>I</b> save an image <span className="dim">(PNG snapshot, scene only)</span></li>
          </ul>
          <p className="dim">Click and drag to revolve · scroll to zoom</p>
          <p className="dim">Brightness — the light slider on the right edge, five steps</p>
          <p className="dim">Upper and lower views: camera height slider on the right edge</p>
          <p className="dim">Gallery — top right corner</p>
          <p className="dim">Click the camera chip, lower left, to reduce this panel</p>
          <p className="dim">Click + Tab to close</p>
          {/* The website and the Mac app are the same build; only the website offers it. */}
          {!isTauri() && (
            <p>
              <a className="help-download" href={MAC_DOWNLOAD_URL}>
                Download the Mac app
              </a>{' '}
              <span className="dim">— works fully offline</span>
            </p>
          )}
        </div>
      )}
    </>
  );
}

/** Brief confirmation, for now only after a snapshot. Clears itself. */
function Notice() {
  const notice = useViewer((s) => s.notice);
  const setNotice = useViewer((s) => s.setNotice);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(id);
  }, [notice, setNotice]);

  return notice ? (
    <div className="notice" role="status">
      {notice}
    </div>
  ) : null;
}

export default function App() {
  useKeybinds();
  const pedestalTop = cm(useViewer((s) => s.pedestal.heightCm));
  const theme = useViewer((s) => s.studioTheme);
  const pedestalVisible = useViewer((s) => s.pedestalMode !== 'hidden');
  const setArtifacts = useViewer((s) => s.setArtifacts);
  const selectObject = useViewer((s) => s.selectObject);
  const importFiles = useImportFiles();

  // Restore the library on load — artifacts persist per machine, not per session. A
  // first run on a machine with a local starter gallery loads that instead (seed.ts).
  useEffect(() => {
    void (async () => {
      const list = await listArtifactMeta();
      if (list.length === 0 && (await seedLibraryOnce(importFiles))) {
        setArtifacts(await listArtifactMeta());
        // Each import jumps to itself; start on the first of the set, not the last.
        selectObject(0);
        return;
      }
      setArtifacts(list);
    })();
  }, [setArtifacts, selectObject, importFiles]);

  const t = STUDIO_THEMES[theme];

  // Two unrelated themes put the overlays on a light backdrop — the white cyclorama and
  // silhouette's lit wall — so the dark-on-light styling is carried by its own class
  // rather than by the theme name. `theme-${theme}` still lands on the element either way.
  const onLight = t.overlaysOnLight ?? false;

  return (
    <div className={`app theme-${theme}${onLight ? ' on-light' : ''}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 28, near: 0.05, far: CAMERA_FAR, position: [0, 1.25, 2.2] }}
        gl={{
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        <color attach="background" args={[t.background]} />
        {/* Fog in the backdrop colour fades the floor into the background, starting well
            beyond the furthest camera so the artifact itself is never touched. Horizon
            turns it off so its floor meets the sky at the true horizon (see presets). */}
        {t.fog !== null && (
          <fog
            attach="fog"
            args={[t.background, (t.fog ?? FLOOR_FOG).near, (t.fog ?? FLOOR_FOG).far]}
          />
        )}

        <CameraRig />
        <Environment intensity={t.envIntensity} />
        <Lighting />
        <Studio />
        <Pedestal />
        <ArtifactMesh />
        <Snapshot />

        {/* Grounding contact on the pedestal top — stands in for the ambient occlusion
            Lumen resolves for free: a dark line where the base touches, with no direction
            of its own, so it never argues with the key light's shadow (see CONTACT_SHADOW).
            Goes away with the pedestal, since a floating artifact has nothing to cast onto. */}
        {pedestalVisible && !t.backlit && (
          <ContactShadow
            y={pedestalTop + 0.001}
            size={1.2}
            blur={CONTACT_SHADOW.blur}
            opacity={CONTACT_SHADOW.opacity}
            far={CONTACT_SHADOW.far}
          />
        )}
      </Canvas>

      <Hud />
      {/* One column down the right edge, so the two sliders never overlap. */}
      <div className="right-rail">
        <HeightSlider />
        <LightSlider />
      </div>
      <Notice />
      <DropZone />
      {/* Always mounted — the tab is a permanent affordance and expands in place. */}
      <GalleryPanel />
    </div>
  );
}