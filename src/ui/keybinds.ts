import { useEffect } from 'react';
import { useViewer } from '../store';

/**
 * Matches the BP_KeyboardControls legend so muscle memory and any existing demo script
 * carry over:
 *   C camera · O object · R rotate · P scale · H height · K width · L length · Tab help
 * Shift reverses the adjustment, exactly as the Unreal legend describes.
 *
 * R steps the artifact 30° per press around a full turn rather than toggling a
 * continuous spin, so each angle is repeatable.
 *
 * B and V have no Unreal equivalent: background theme, and hiding the pedestal so the
 * artifact floats. The gallery is deliberately *not* bound to a key — it lives behind a
 * permanent tab in the corner so it is discoverable without knowing a shortcut.
 */
export function useKeybinds() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      const s = useViewer.getState();
      const dir = e.shiftKey ? -1 : 1;

      switch (e.code) {
        case 'KeyC':
          e.shiftKey ? s.prevCam() : s.nextCam();
          break;
        case 'KeyO':
          s.stepObject(dir);
          break;
        case 'KeyB':
          s.toggleStudioTheme();
          break;
        case 'KeyV':
          s.togglePedestal();
          break;
        case 'KeyF':
          // The front light BP_PhotoViewerController defines but never binds a key to.
          s.toggleLight('front');
          break;
        case 'KeyR':
          s.stepRotation(dir);
          break;
        case 'KeyP':
          s.adjustScale(dir);
          break;
        case 'KeyH':
          s.adjustPedestal('heightCm', dir);
          break;
        case 'KeyK':
          s.adjustPedestal('widthCm', dir);
          break;
        case 'KeyL':
          s.adjustPedestal('lengthCm', dir);
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