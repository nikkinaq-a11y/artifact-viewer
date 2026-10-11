import { useEffect, useMemo, useRef } from 'react';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { Object3D, RectAreaLight, SpotLight } from 'three';
import { useViewer } from '../store';
import {
  AMBIENT_COLOR,
  KEY_SHADOW,
  FOCUS_HEIGHT,
  LIGHT_LEVELS,
  LIGHT_PRESETS,
  LIGHT_SETTINGS,
  STUDIO_THEMES,
} from './presets';

/**
 * Mirrors the UE RectLight rig. RectAreaLight is three.js's analogue of Unreal's
 * RectLight, but it renders black unless the LTC lookup textures are initialised once
 * before any rect light is created.
 */
RectAreaLightUniformsLib.init();

/**
 * One light setting (L: light / stark) at one brightness level (the slider), everything
 * else follows from LIGHT_SETTINGS. The silhouette theme overrides both: every lamp goes
 * out so the artifact reads as a flat black cut-out against white.
 */
export function Lighting() {
  const setting = useViewer((s) => s.lightSetting);
  const level = useViewer((s) => s.lightLevel);
  const theme = useViewer((s) => s.studioTheme);
  const spot = useRef<SpotLight>(null);
  const target = useRef<Object3D>(null);

  const backlit = STUDIO_THEMES[theme].backlit ?? false;
  const cfg = LIGHT_SETTINGS[setting];
  // Silhouette is just a level of zero: nothing lights the artifact.
  const k = backlit ? 0 : (LIGHT_LEVELS[level] ?? 1);

  // A spotLight aims at its `target` object, which must itself be in the scene graph.
  useEffect(() => {
    if (spot.current && target.current) spot.current.target = target.current;
  }, []);

  // Rect lights are not JSX-declarative-friendly for target aiming, so build them once
  // and mutate intensity/visibility on state change.
  const objects = useMemo(
    () =>
      LIGHT_PRESETS.map((p) => {
        const l = new RectAreaLight(p.color, 0, p.width, p.height);
        l.position.set(...p.position);
        // A light's lookAt turns its -Z to the target, which is the side a rect light
        // emits from — so an aim point needs no hand-worked rotation.
        if (p.aim) l.lookAt(...p.aim);
        else l.rotation.set(...p.rotation);
        return { preset: p, light: l };
      }),
    [],
  );

  useEffect(() => {
    for (const { preset, light } of objects) {
      const base = cfg.rects[preset.id];
      light.visible = base !== undefined && k > 0;
      light.intensity = (base ?? 0) * k;
    }
  }, [objects, cfg, k]);

  return (
    <>
      {objects.map(({ preset, light }) => (
        <primitive key={preset.id} object={light} />
      ))}

      {/* three.js RectAreaLight cannot cast shadows, so the soft shaping and the shadowing
          are split across two kinds of light: the rect panels above model the object, and
          this spot casts the shadow. It also carries most of the key light, because any
          rect light shines into the spot's shadow and lifts it — see LIGHT_SETTINGS.

          The target matters: a spotLight with no target aims at the world origin, which
          is the floor under the pedestal — that lights the pedestal instead of the
          artifact and flattens the whole composition. */}
      <object3D ref={target} position={[0, FOCUS_HEIGHT, 0]} />
      <spotLight
        ref={spot}
        position={cfg.spot.position}
        angle={cfg.spot.angle}
        penumbra={cfg.spot.penumbra}
        decay={2}
        distance={12}
        intensity={cfg.spot.intensity * k}
        color={cfg.spot.color}
        castShadow
        shadow-mapSize-width={KEY_SHADOW.mapSize}
        shadow-mapSize-height={KEY_SHADOW.mapSize}
        shadow-bias={KEY_SHADOW.bias}
        shadow-normalBias={KEY_SHADOW.normalBias}
        shadow-radius={KEY_SHADOW.radius}
        shadow-camera-near={0.5}
        shadow-camera-far={6}
      />

      {/* Ambient stands in for the inter-reflection Lumen provides, and is the one control
          that decides whether the darkest shadow is black or merely dark. */}
      <ambientLight intensity={cfg.ambient * k} color={AMBIENT_COLOR} />
    </>
  );
}
