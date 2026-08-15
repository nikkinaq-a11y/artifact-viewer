import { useViewer } from '../store';
import { cm } from '../lib/units';
import { STUDIO_THEMES } from './presets';

/**
 * BP_AdjustablePedestal: WidthCm / LengthCm / HeightCm, driven by H / K / L (+Shift).
 * Dimensions live in centimetres in the store to stay directly comparable with the
 * Blueprint's exposed values.
 */
export function Pedestal() {
  const { widthCm, lengthCm, heightCm } = useViewer((s) => s.pedestal);
  const theme = useViewer((s) => s.studioTheme);
  const visible = useViewer((s) => s.pedestalVisible);

  const w = cm(widthCm);
  const l = cm(lengthCm);
  const h = cm(heightCm);

  // Hidden rather than unmounted: the artifact stays seated at the pedestal's height, so
  // toggling leaves it floating in place instead of dropping it to the floor.
  return (
    <mesh visible={visible} castShadow={visible} receiveShadow={visible} position={[0, h / 2, 0]}>
      <boxGeometry args={[w, h, l]} />
      <meshStandardMaterial
        color={STUDIO_THEMES[theme].pedestal}
        roughness={0.75}
        metalness={0}
      />
    </mesh>
  );
}

/** Pedestal top height in metres — where the artifact is seated. */
export function usePedestalTop() {
  return cm(useViewer((s) => s.pedestal.heightCm));
}