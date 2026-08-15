import { useViewer } from '../store';
import { STUDIO_THEMES } from './presets';

/**
 * The room from BP_RoomRig / the Cube..Cube5 wall actors: a three-sided dark enclosure
 * with a floor. Walls are single-sided boxes so the camera can sit outside them.
 */
const ROOM = { width: 8, depth: 8, height: 4.5, thickness: 0.1 };

export function Studio() {
  const theme = useViewer((s) => s.studioTheme);
  const wallColor = STUDIO_THEMES[theme].wall;

  const { width, depth, height, thickness } = ROOM;

  return (
    <group>
      {/* Floor */}
      <mesh receiveShadow position={[0, -thickness / 2, 0]}>
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial color={wallColor} roughness={0.92} metalness={0} />
      </mesh>

      {/* Back wall */}
      <mesh receiveShadow position={[0, height / 2, -depth / 2]}>
        <boxGeometry args={[width, height, thickness]} />
        <meshStandardMaterial color={wallColor} roughness={0.95} metalness={0} />
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