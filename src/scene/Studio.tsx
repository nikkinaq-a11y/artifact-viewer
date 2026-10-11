import { useViewer } from '../store';
import { FLOOR_SIZE, STUDIO_THEMES } from './presets';

/**
 * The stage: an open floor and nothing else. The Unreal room's walls (BP_RoomRig / the
 * Cube..Cube5 actors) were taken out — the backdrop is now the scene background colour,
 * and the floor is effectively infinite (FLOOR_SIZE). Most themes fade it into the backdrop
 * with fog in the same colour, so it reads as a seamless cyclorama; Horizon runs without
 * fog so the floor meets the sky at the true horizon. See FLOOR_FOG in presets.ts.
 */
const FLOOR = { size: FLOOR_SIZE, thickness: 0.1 };

export function Studio() {
  const theme = useViewer((s) => s.studioTheme);
  const { floor: floorColor, backlit } = STUDIO_THEMES[theme];

  // Silhouette has no floor at all: the pedestal and artifact stand as one black cut-out
  // against pure white, and an unlit floor would only add a black band across the bottom
  // of the frame.
  if (backlit) return null;

  const { size, thickness } = FLOOR;

  return (
    <mesh receiveShadow position={[0, -thickness / 2, 0]}>
      <boxGeometry args={[size, thickness, size]} />
      <meshStandardMaterial color={floorColor} roughness={0.92} metalness={0} />
    </mesh>
  );
}
