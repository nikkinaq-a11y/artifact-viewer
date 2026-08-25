import { useViewer } from '../store';
import { STUDIO_THEMES } from './presets';

/**
 * The room from BP_RoomRig / the Cube..Cube5 wall actors: a three-sided dark enclosure
 * with a floor. Walls are single-sided boxes so the camera can sit outside them.
 */
const ROOM = { width: 8, depth: 8, height: 4.5, thickness: 0.1 };

export function Studio() {
  const theme = useViewer((s) => s.studioTheme);
  // Floor and walls are separate colours so a theme can hold them apart. Dark and light
  // set both to the same value; horizon is the one that pulls them apart deliberately.
  const { wall: wallColor, floor: floorColor, backlit } = STUDIO_THEMES[theme];

  const { width, depth, height, thickness } = ROOM;

  return (
    <group>
      {/* Floor */}
      <mesh receiveShadow position={[0, -thickness / 2, 0]}>
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial color={floorColor} roughness={0.92} metalness={0} />
      </mesh>

      {/* Back wall. Under a backlit theme it stops being a surface the rig lights and
          becomes the light source itself — an unlit white panel, the lightbox the
          artifact is silhouetted against.

          Two details carry that: the material is basic rather than standard, since the
          rig is switched off in this theme and a lit material would render black; and
          tone mapping is off for it, because ACES rolls a value of 1.0 down to roughly
          0.8 and the panel has to reach true white to read as a glow rather than as a
          pale grey wall. It also stops receiving shadows — a cast shadow falling across
          a lightbox gives the illusion away immediately. */}
      <mesh receiveShadow={!backlit} position={[0, height / 2, -depth / 2]}>
        <boxGeometry args={[width, height, thickness]} />
        {backlit ? (
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        ) : (
          <meshStandardMaterial color={wallColor} roughness={0.95} metalness={0} />
        )}
      </mesh>

      {/* Left wall */}
      <mesh receiveShadow position={[-width / 2, height / 2, 0]}>
        <boxGeometry args={[thickness, height, depth]} />
        <meshStandardMaterial color={wallColor} roughness={0.95} metalness={0} />
      </mesh>

      {/* Right wall */}
      <mesh receiveShadow position={[width / 2, height / 2, 0]}>
        <boxGeometry args={[thickness, height, depth]} />
        <meshStandardMaterial color={wallColor} roughness={0.95} metalness={0} />
      </mesh>
    </group>
  );
}
