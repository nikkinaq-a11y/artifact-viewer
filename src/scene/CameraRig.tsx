import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { PerspectiveCamera, Vector3 } from 'three';
import { useViewer } from '../store';
import { CAMERA_PRESETS, FOCUS_HEIGHT, cameraDistance } from './presets';

/** Seconds to blend between presets — the analogue of BlendTime on SetViewTargetWithBlend. */
const BLEND_SECONDS = 0.7;

/** Keeps the camera above the floor while still allowing the low presets to look upward. */
const MIN_POLAR = 0.2;
const MAX_POLAR = 1.95;

const MIN_DISTANCE = 0.8;
// Has to clear the furthest preset at the largest CAMERA_DISTANCES factor, or OrbitControls
// clamps the camera back in on its first update and quietly undoes the D blend.
const MAX_DISTANCE = 7;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Camera presets plus free orbit.
 *
 * C jumps to the next preset (the Unreal SetViewTargetWithBlend behaviour), and from
 * wherever it lands the user can click-drag to revolve around the artifact. Dragging
 * cancels an in-flight blend so the camera never fights the mouse.
 *
 * D changes only how far back the shot is taken from, which is a different move to C and
 * is blended differently — see the effect below.
 *
 * While blending, OrbitControls is disabled and the camera is driven directly; letting
 * both run at once means OrbitControls recomputes position from its own spherical state
 * every frame and undoes the blend. On arrival, update() re-syncs its internal state to
 * the new position so orbiting continues smoothly from there.
 */
export function CameraRig() {
  const camIndex = useViewer((s) => s.camIndex);
  const camDistance = useViewer((s) => s.camDistance);
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

  // Which move this effect is running: null until the first pass, so mounting always
  // takes the preset branch rather than looking like a distance change of zero.
  const lastIndex = useRef<number | null>(null);
  const lastFactor = useRef(1);

  useEffect(() => {
    const n = CAMERA_PRESETS.length;
    const preset = CAMERA_PRESETS[((camIndex % n) + n) % n];
    const factor = cameraDistance(camDistance).factor;

    fromPos.current.copy(camera.position);
    fromTarget.current.copy(controls.current?.target ?? new Vector3(0, FOCUS_HEIGHT, 0));
    fromFov.current = camera.fov;

    if (lastIndex.current === camIndex) {
      // Distance only. This dollies the view actually on screen instead of snapping back
      // to the preset, so a shot the user has orbited or scrolled to keeps its angle and
      // only moves out or in — that is what "without changing the camera position in use"
      // has to mean once free orbit exists. Scaling about the live orbit target, not the
      // preset's, is what preserves the framing; the FOV is left where it is so the pair
      // reads as the same lens from further away.
      const ratio = factor / lastFactor.current;
      toTarget.current.copy(fromTarget.current);
      toPos.current
        .subVectors(fromPos.current, fromTarget.current)
        .multiplyScalar(ratio)
        .add(fromTarget.current);
      toFov.current = fromFov.current;
    } else {
      // A new preset arrives at its authored framing, pushed out along its own view
      // direction by the current distance factor.
      toTarget.current.set(...preset.target);
      toPos.current
        .set(...preset.position)
        .sub(toTarget.current)
        .multiplyScalar(factor)
        .add(toTarget.current);
      toFov.current = preset.fov;
    }

    lastIndex.current = camIndex;
    lastFactor.current = factor;

    t.current = 0;
    blending.current = true;
    if (controls.current) controls.current.enabled = false;
  }, [camIndex, camDistance, camera]);

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