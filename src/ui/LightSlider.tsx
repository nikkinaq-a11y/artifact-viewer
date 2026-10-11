import { useViewer } from '../store';
import { LIGHT_LEVELS, STUDIO_THEMES } from '../scene/presets';

/**
 * Brightness: five fixed steps rather than a free dial, so a staged look can be named and
 * repeated ("light, step 2"). Applies to whichever setting L has up. Hidden in silhouette,
 * where the rig is off and the slider would do nothing.
 */
export function LightSlider() {
  const level = useViewer((s) => s.lightLevel);
  const setLevel = useViewer((s) => s.setLightLevel);
  const backlit = useViewer((s) => STUDIO_THEMES[s.studioTheme].backlit ?? false);
  if (backlit) return null;

  return (
    <div className="rail-slider">
      <div className="rail-slider-label">Light</div>
      <div className="rail-slider-value">
        {level + 1} / {LIGHT_LEVELS.length}
      </div>
      <input
        type="range"
        className="is-stepped"
        aria-label="Light brightness"
        min={0}
        max={LIGHT_LEVELS.length - 1}
        step={1}
        value={level}
        onChange={(e) => setLevel(Number(e.target.value))}
        // Keyboard shortcuts ignore keys while an input has focus, so hand focus back.
        onPointerUp={(e) => e.currentTarget.blur()}
        title="Drag to brighten or dim the light"
      />
    </div>
  );
}
