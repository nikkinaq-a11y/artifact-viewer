import { useCallback, useEffect, useRef, useState } from 'react';
import { useViewer } from '../store';
import { useImportFiles } from './useImport';
import { ACCEPTED_EXTENSIONS } from './loadModel';

/**
 * Whole-window drag target. Dropping an FBX straight from Finder is the headline
 * interaction, so the drop area is the page itself rather than a small panel.
 */
export function DropZone() {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const importFiles = useImportFiles();

  const importing = useViewer((s) => s.importing);
  const importError = useViewer((s) => s.importError);
  const setImportError = useViewer((s) => s.setImportError);
  const artifacts = useViewer((s) => s.artifacts);

  useEffect(() => {
    // dragenter/dragleave fire for every child element, so track depth rather than
    // toggling on each event or the overlay flickers as the cursor crosses the HUD.
    const onEnter = (e: DragEvent) => {
      e.preventDefault();
      depth.current += 1;
      if (e.dataTransfer?.types.includes('Files')) setDragging(true);
    };
    const onOver = (e: DragEvent) => e.preventDefault();
    const onLeave = (e: DragEvent) => {
      e.preventDefault();
      depth.current -= 1;
      if (depth.current <= 0) {
        depth.current = 0;
        setDragging(false);
      }
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) void importFiles(files);
    };

    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [importFiles]);

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length) void importFiles(files);
      e.target.value = '';
    },
    [importFiles],
  );

  return (
    <>
      {dragging && (
        <div className="drop-overlay">
          <div className="drop-card">
            <div className="drop-title">Drop to add artifact</div>
            <div className="drop-sub">fbx · glb · gltf · obj · stl · ply · usd</div>
          </div>
        </div>
      )}

      {importing && (
        <div className="modal">
          <div className="modal-card">
            <div className="modal-title">{importing.name}</div>
            <div className="modal-note">{importing.note}</div>
            <div className="modal-bar"><span /></div>
          </div>
        </div>
      )}

      {importError && (
        <div className="toast" role="alert">
          {importError}
          <button type="button" onClick={() => setImportError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {artifacts.length === 0 && !importing && (
        <div className="empty">
          <div className="empty-title">Drag a model onto this window</div>
          <div className="empty-sub">
            fbx · glb · gltf · obj · stl · ply · usd — if the texture is not embedded,
            drag the image in alongside it.
          </div>
          <label className="empty-pick">
            Or choose a file
            <input type="file" accept={`${ACCEPTED_EXTENSIONS.join(",")},.mtl,image/*`} multiple onChange={onPick} hidden />
          </label>
        </div>
      )}
    </>
  );
}