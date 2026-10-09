import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { currentArtifact, useViewer } from '../store';
import { CAMERA_PRESETS, cameraDistance } from './presets';
import { saveFile } from '../lib/saveFile';

/** Characters macOS Finder and Windows both refuse, or that read as a path separator. */
const unsafe = /[\\/:*?"<>|]+/g;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * I: saves the canvas as a PNG — the scene only, with none of the HUD, gallery or help
 * overlay, since those are HTML laid over the canvas and never part of it.
 *
 * The canvas is created without `preserveDrawingBuffer` (keeping it costs every frame),
 * so its contents are only guaranteed until the browser composites. Rendering a fresh
 * frame here and reading it straight back in the same task gets a full image without
 * paying that cost all the time; toBlob copies the bitmap synchronously when called.
 */
export function Snapshot() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const request = useViewer((s) => s.snapshotRequest);

  useEffect(() => {
    if (request === 0) return;

    const s = useViewer.getState();
    const n = CAMERA_PRESETS.length;
    const view = CAMERA_PRESETS[((s.camIndex % n) + n) % n].name;
    const distance = cameraDistance(s.camDistance).name;
    const object = currentArtifact(s)?.name.replace(/\.[^.]+$/, '') ?? 'Empty pedestal';

    const d = new Date();
    const stamp =
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    const filename = `${object} - ${view} - ${distance} - ${stamp}.png`.replace(unsafe, '-');

    gl.render(scene, camera);
    gl.domElement.toBlob((blob) => {
      if (!blob) {
        s.setNotice('Snapshot failed — the canvas could not be read.');
        return;
      }
      void saveFile(blob, filename).then(
        (saved) => s.setNotice(saved ? `Snapshot saved — ${filename}` : 'Snapshot not saved.'),
        () => s.setNotice('Snapshot could not be saved.'),
      );
    }, 'image/png');
  }, [request, gl, scene, camera]);

  return null;
}
