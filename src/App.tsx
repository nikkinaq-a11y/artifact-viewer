import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { ACESFilmicToneMapping } from 'three';
import { Studio } from './scene/Studio';
import { Pedestal } from './scene/Pedestal';
import { Lighting } from './scene/Lighting';
import { Environment } from './scene/Environment';
import { CameraRig } from './scene/CameraRig';
import { ArtifactMesh } from './scene/ArtifactMesh';
import {
  CAMERA_PRESETS,
  ROTATION_STEP_DEG,
  ROTATION_STEPS,
  STUDIO_THEMES,
} from './scene/presets';
import { currentArtifact, useViewer } from './store';
import { useKeybinds } from './ui/keybinds';
import { cm } from './lib/units';
import { DropZone } from './import/DropZone';
import { GalleryPanel } from './library/GalleryPanel';
import { listArtifactMeta } from './library/db';
import './App.css';

function Hud() {
  const camIndex = useViewer((s) => s.camIndex);
  const pedestal = useViewer((s) => s.pedestal);
  const rotationStep = useViewer((s) => s.rotationStep);
  const objectScale = useViewer((s) => s.objectScale);
  const showHelp = useViewer((s) => s.showHelp);
  const pedestalVisible = useViewer((s) => s.pedestalVisible);
  const frontLightOn = useViewer((s) => s.lights.front?.on ?? false);
  const artifacts = useViewer((s) => s.artifacts);
  const objectIndex = useViewer((s) => s.objectIndex);
  const meta = useViewer(currentArtifact);

  const n = CAMERA_PRESETS.length;
  const preset = CAMERA_PRESETS[((camIndex % n) + n) % n];

  // rotationStep is unbounded (and can go negative), so wrap it for display only.
  const rotationIndex = ((rotationStep % ROTATION_STEPS) + ROTATION_STEPS) % ROTATION_STEPS;
  const rotationDeg = rotationIndex * ROTATION_STEP_DEG;

  return (
    <>
      <div className="hud">
        <div className="hud-cam">
          <span className="hud-cam-index">
            {String((((camIndex % n) + n) % n) + 1).padStart(2, '0')}
          </span>
          <span className="hud-cam-name">{preset.name}</span>
          <span className="hud-cam-total">of {n}</span>
        </div>

        {artifacts.length > 0 && (
          <div className="hud-row">
            <span className="hud-key">Object</span>
            {meta?.name} <span className="dim">({objectIndex + 1}/{artifacts.length})</span>
          </div>
        )}
        <div className="hud-row">
          <span className="hud-key">Pedestal</span>
          {pedestalVisible ? (
            `${pedestal.widthCm} × ${pedestal.lengthCm} × ${pedestal.heightCm} cm`
          ) : (
            <span className="dim">hidden — V to show</span>
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
        {frontLightOn && (
          <div className="hud-row">
            <span className="hud-key">Front light</span>
            on
          </div>
        )}
        <div className="hud-hint">Tab for controls</div>
      </div>

      {showHelp && (
        <div className="help">
          <h2>Controls</h2>
          <ul>
            <li><b>C</b> switch camera view <span className="dim">(Shift+C back)</span></li>
            <li><b>O</b> cycle object <span className="dim">(Shift+O back)</span></li>
            <li>
              <b>R</b> rotate {ROTATION_STEP_DEG}° <span className="dim">(Shift+R to undo)</span>
            </li>
            <li><b>P</b> object scale <span className="dim">(Shift+P to undo)</span></li>
            <li><b>H</b> pedestal height <span className="dim">(Shift+H to undo)</span></li>
            <li><b>K</b> pedestal width <span className="dim">(Shift+K to undo)</span></li>
            <li><b>L</b> pedestal length <span className="dim">(Shift+L to undo)</span></li>
            <li><b>B</b> background — dark / white / horizon</li>
            <li><b>V</b> show / hide pedestal</li>
            <li><b>F</b> front light on / off</li>
          </ul>
          <p className="dim">Click and drag to revolve · scroll to zoom</p>
          <p className="dim">Gallery — top right corner</p>
          <p className="dim">Click + Tab to close</p>
        </div>
      )}
    </>
  );
}

export default function App() {
  useKeybinds();
  const pedestalTop = cm(useViewer((s) => s.pedestal.heightCm));
  const theme = useViewer((s) => s.studioTheme);
  const pedestalVisible = useViewer((s) => s.pedestalVisible);
  const setArtifacts = useViewer((s) => s.setArtifacts);

  // Restore the library on load — artifacts persist per machine, not per session.
  useEffect(() => {
    void listArtifactMeta().then(setArtifacts);
  }, [setArtifacts]);

  const t = STUDIO_THEMES[theme];

  return (
    <div className={`app theme-${theme}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 28, near: 0.05, far: 100, position: [0, 1.25, 2.2] }}
        gl={{
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        <color attach="background" args={[t.background]} />

        <CameraRig />
        <Environment intensity={t.envIntensity} />
        <Lighting />
        <Studio />
        <Pedestal />
        <ArtifactMesh />

        {/* Grounding contact on the pedestal top — stands in for the ambient occlusion
            Lumen resolves for free. See PLAN.md Appendix A. Goes away with the pedestal,
            since a floating artifact has nothing to cast onto. */}
        {pedestalVisible && (
          <ContactShadows
            position={[0, pedestalTop + 0.001, 0]}
            scale={1.2}
            resolution={1024}
            blur={2.4}
            opacity={t.contactShadowOpacity}
            far={0.6}
          />
        )}
      </Canvas>

      <Hud />
      <DropZone />
      {/* Always mounted — the tab is a permanent affordance and expands in place. */}
      <GalleryPanel />
    </div>
  );
}