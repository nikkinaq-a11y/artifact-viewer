import { useViewer } from '../store';
import { CAMERA_HEIGHT_RANGE, CAMERA_PRESETS } from '../scene/presets';

/**
 * Camera height for the tilted views (Upper and Lower). A vertical slider on the right
 * edge — up is higher — that raises or lowers the camera and what it looks at together,
 * so the angle of the view is kept and only the vantage height changes. Shown only on a
 * view that offers it; each view remembers its own setting.
 */
export function HeightSlider() {
  const camIndex = useViewer((s) => s.camIndex);
  const camHeights = useViewer((s) => s.camHeights);
  const setCamHeight = useViewer((s) => s.setCamHeight);

  const n = CAMERA_PRESETS.length;
  const preset = CAMERA_PRESETS[((camIndex % n) + n) % n];
  if (!preset.heightAdjustable) return null;

  const value = camHeights[preset.name] ?? 0;
  const cmValue = Math.round(value * 100);
  const rangeCm = Math.round(CAMERA_HEIGHT_RANGE * 100);

  return (
    <div className="rail-slider">
      <div className="rail-slider-label">Camera height</div>
      <div className="rail-slider-value">
        {cmValue > 0 ? '+' : ''}
        {cmValue} cm
      </div>
      <input
        type="range"
        aria-label={`${preset.name} camera height`}
        min={-rangeCm}
        max={rangeCm}
        step={1}
        value={cmValue}
        onChange={(e) => setCamHeight(preset.name, Number(e.target.value) / 100)}
        // The keyboard shortcuts ignore keys while an input has focus, so letting go of
        // the slider hands focus back or every shortcut would go dead after one drag.
        onPointerUp={(e) => e.currentTarget.blur()}
        onDoubleClick={() => setCamHeight(preset.name, 0)}
        title="Drag to raise or lower the camera · double-click to reset"
      />
    </div>
  );
}
