import { useEffect, useMemo, useRef } from 'react';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { Object3D, RectAreaLight, SpotLight } from 'three';
import { useViewer } from '../store';
import {
  AMBIENT_LIGHT,
  FOCUS_HEIGHT,
  KEY_SHADOW_INTENSITY,
  LIGHT_PRESETS,
  STUDIO_THEMES,
} from './presets';

/**
 * Mirrors the UE RectLight rig. RectAreaLight is three.js's analogue of Unreal's
 * RectLight, but it renders black unless the LTC lookup textures are initialised once
 * before any rect light is created.
 */
RectAreaLightUniformsLib.init();

export function Lighting() {
  const lights = useViewer((s) => s.lights);
  const theme = useViewer((s) => s.studioTheme);
  const spot = useRef<SpotLight>(null);
  const target = useRef<Object3D>(null);

  /**
   * The silhouette theme is a lighting state, not just a background: every lamp goes out
   * so the artifact is rendered by nothing at all and reads as a flat black cut-out
   * against the lit wall. The switches are overridden rather than written, so leaving the
   * theme restores whatever rig the user had set up before entering it.
   */
  const backlit = STUDIO_THEMES[theme].backlit ?? false;

  // A spotLight aims at its `target` object, which must itself be in the scene graph.
  useEffect(() => {
    if (spot.current && target.current) spot.current.target = target.current;
  }, []);

  // Rect lights are not JSX-declarative-friendly for target aiming, so build them once
  // and mutate intensity/visibility on state change.
  const objects = useMemo(
    () =>
      LIGHT_PRESETS.map((p) => {
        const l = new RectAreaLight(p.color, p.intensity, p.width, p.height);
        l.position.set(...p.position);
        l.rotation.set(...p.rotation);
        return { preset: p, light: l };
      }),
    [],
  );

  useEffect(() => {
    for (const { preset, light } of objects) {
      const s = lights[preset.id];
      light.visible = s.on && !backlit;
      light.intensity = s.intensity;
    }
  }, [lights, objects, backlit]);

  const keyOn = !backlit && (lights.key?.on ?? true);
  const frontOn = !backlit && (lights.front?.on ?? false);

  return (
    <>
      {objects.map(({ preset, light }) => (
        <primitive key={preset.id} object={light} />
      ))}

      {/* three.js RectAreaLight cannot cast shadows, so the soft studio shaping and the
          shadowing are split across two lights: the rect rig above does the look, and
          this spot — roughly co-located with the key — does the cast shadow. In Unreal a
          single RectLight does both via Virtual Shadow Maps.

          The target matters: a spotLight with no target aims at the world origin, which
          is the floor under the pedestal — that lights the pedestal instead of the
          artifact and flattens the whole composition. */}
      <object3D ref={target} position={[0, FOCUS_HEIGHT, 0]} />
      <spotLight
        ref={spot}
        position={[-1.35, 2.25, 1.35]}
        angle={0.30}
        penumbra={0.9}
        decay={2}
        distance={12}
        intensity={
          keyOn ? (frontOn ? KEY_SHADOW_INTENSITY.withFront : KEY_SHADOW_INTENSITY.base) : 0
        }
        color="#fff4e8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
      />

      {/* Very low ambient stands in for the floor/wall inter-reflection Lumen provides,
          and is the single control that decides whether the darkest shadow is black or
          merely dark — see AMBIENT_LIGHT. It rises with the front light so that switching
          F on opens the shadows across the whole object rather than only the face the
          front light happens to reach, and goes out entirely under a backlit theme. */}
      <ambientLight
        intensity={backlit ? 0 : frontOn ? AMBIENT_LIGHT.withFront : AMBIENT_LIGHT.base}
        color={AMBIENT_LIGHT.color}
      />
    </>
  );
}
