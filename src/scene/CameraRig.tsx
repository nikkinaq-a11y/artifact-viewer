import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { PerspectiveCamera, Vector3 } from 'three';
import { useViewer } from '../store';
import { CAMERA_PRESETS, FOCUS_HEIGHT } from './presets';

/** Seconds to blend between presets — the analogue of BlendTime on SetViewTargetWithBlend. */
const BLEND_SECONDS = 0.7;

/** Keeps the camera above the floor while still allowing the low presets to look upward. */
const MIN_POLAR = 0.2;
const MAX_POLAR = 1.95;

const MIN_DISTANCE = 0.8;
const MAX_DISTANCE = 5;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Camera presets plus free orbit.
 *
 * C jumps to the next preset (the Unreal SetViewTargetWithBlend behaviour), and from
 * wherever it lands the user can click-drag to revolve around the artifact. Dragging
 * cancels an in-flight blend so the camera never fights the mouse.
 *
 * While blending, OrbitControls is disabled and the camera is driven directly; letting
 * both run at once means OrbitControls recomputes position from its own spherical state
 * every frame and undoes the blend. On arrival, update() re-syncs its internal state to
 * the new position so orbiting continues smoothly from there.
 */
export function CameraRig() {
  const camIndex = useViewer((s) => s.camIndex);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const controls = useRef<OrbitControlsImpl>(null);

  const blending = useRef(false);
  const t = useRef(0);
  const fromPos = useRef(new Vector3());
  const fromTarget = useRef(new Vector3());
  const fromFov = useRef(28);
  const toPos = useRef(new Vector3());
  const toTarget = useRef(new Vector3());
  const toFov = useRef(28);
  const scratch = useRef(new Vector3());

  useEffect(() => {
    const n = CAMERA_PRESETS.length;
    const preset = CAMERA_PRESETS[((camIndex % n) + n) % n];

    fromPos.current.copy(camera.position);
    fromTarget.current.copy(controls.current?.target ?? new Vector3(0, FOCUS_HEIGHT, 0));
    fromFov.current = camera.fov;

    toPos.current.set(...preset.position);
    toTarget.current.set(...preset.target);
    toFov.current = preset.fov;

    t.current = 0;
    blending.current = true;
    if (controls.current) controls.current.enabled = false;
  }, [camIndex, camera]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!blending.current || !c) return;

    t.current = Math.min(1, t.current + dt / BLEND_SECONDS);
    const e = easeInOutCubic(t.current);

    camera.position.lerpVectors(fromPos.current, toPos.current, e);
    scratch.current.lerpVectors(fromTarget.current, toTarget.current, e);
    c.target.copy(scratch.current);
    camera.lookAt(scratch.current);

    const fov = fromFov.current + (toFov.current - fromFov.current) * e;
    if (Math.abs(camera.fov - fov) > 0.001) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    if (t.current >= 1) {
      blending.current = false;
      c.enabled = true;
      c.update();
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={[0, FOCUS_HEIGHT, 0]}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      zoomSpeed={0.6}
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
      minPolarAngle={MIN_POLAR}
      maxPolarAngle={MAX_POLAR}
      // Taking hold of the camera cancels the blend rather than fighting it.
      onStart={() => {
        blending.current = false;
      }}
    />
  );
}