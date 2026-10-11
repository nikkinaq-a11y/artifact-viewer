import { useEffect } from 'react';
import { useViewer } from '../store';

/**
 * Letters chosen for what they say, not inherited from Unreal. The BP_KeyboardControls
 * legend (P scale, K/L pedestal, F front light) was dropped at Nikki's request on
 * 2026-10-08 in favour of initials a curator can guess:
 *
 *   C camera · D distance · O object · R rotate · S scale
 *   H height (pedestal, and the object on it) · W pedestal width · Z pedestal depth
 *   P pedestal (standard / hidden / white) · L light / stark · B background scene
 *   I image (snapshot)
 *   Tab help
 *
 * Shift reverses whatever has a direction. Z is depth as in the z-axis — the pedestal's
 * front-to-back dimension — since D is taken by distance.
 *
 * R steps the artifact 30° per press around a full turn rather than toggling a continuous
 * spin, so each angle is repeatable. The gallery and the scene readout are deliberately
 * *not* bound to keys — both live behind a permanent tab in their corner, so they are
 * discoverable without knowing a shortcut.
 */
export function useKeybinds() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      // Leave Cmd/Ctrl shortcuts to the browser — Cmd+R is reload, not rotate.
      if (e.metaKey || e.ctrlKey) return;

      const s = useViewer.getState();
      const dir = e.shiftKey ? -1 : 1;

      switch (e.code) {
        case 'KeyC':
          if (e.shiftKey) s.prevCam();
          else s.nextCam();
          break;
        case 'KeyD':
          // Distance only — the view in use is left exactly where it is.
          s.cycleCamDistance();
          break;
        case 'KeyO':
          s.stepObject(dir);
          break;
        case 'KeyR':
          s.stepRotation(dir);
          break;
        case 'KeyS':
          s.adjustScale(dir);
          break;
        case 'KeyH':
          s.adjustPedestal('heightCm', dir);
          break;
        case 'KeyW':
          s.adjustPedestal('widthCm', dir);
          break;
        case 'KeyZ':
          s.adjustPedestal('lengthCm', dir);
          break;
        case 'KeyP':
          // Standard → hidden → white.
          s.cyclePedestal();
          break;
        case 'KeyL':
          // Light ↔ stark. Brightness is the slider on the right edge.
          s.toggleLightSetting();
          break;
        case 'KeyB':
          s.toggleStudioTheme();
          break;
        case 'KeyI':
          s.requestSnapshot();
          break;
        case 'Tab':
          e.preventDefault();
          s.toggleHelp();
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
