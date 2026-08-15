import { useCallback, useState } from 'react';
import { applySettings, captureSettings, useViewer } from '../store';
import { deleteArtifact, listArtifactMeta } from './db';
import { clearModels, dropModel } from './models';
import { useImportFiles } from '../import/useImport';
import { ACCEPTED_EXTENSIONS } from '../import/loadModel';
import { downloadBlob, exportGallery, importGallery } from './galleryFile';

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

/**
 * The artifact roster. This is what replaces re-packaging the Unreal build: adding and
 * removing objects happens here at runtime, per machine.
 */
export function GalleryPanel() {
  const artifacts = useViewer((s) => s.artifacts);
  const open = useViewer((s) => s.showGallery);
  const objectIndex = useViewer((s) => s.objectIndex);
  const selectObject = useViewer((s) => s.selectObject);
  const removeArtifactMeta = useViewer((s) => s.removeArtifactMeta);
  const toggleGallery = useViewer((s) => s.toggleGallery);
  const setArtifacts = useViewer((s) => s.setArtifacts);
  const setImportError = useViewer((s) => s.setImportError);

  // Packing a gallery of 100 MB scans takes a moment; the buttons report their own state
  // rather than borrowing the import modal, which is about loading a single model.
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const importFiles = useImportFiles();

  const remove = async (id: string) => {
    await deleteArtifact(id);
    dropModel(id);
    removeArtifactMeta(id);
  };

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length) void importFiles(files);
      e.target.value = '';
    },
    [importFiles],
  );

  const doExport = async () => {
    setBusy('export');
    setImportError(null);
    try {
      const blob = await exportGallery(captureSettings());
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `artifact-gallery-${stamp}.zip`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusy(null);
    }
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy('import');
    setImportError(null);
    try {
      const { count, settings } = await importGallery(file);
      // Parsed models are keyed by artifact id, and importing replaces the library, so
      // the cache has to go or removed artifacts would linger in memory.
      clearModels();
      applySettings(settings);
      setArtifacts(await listArtifactMeta());
      selectObject(0);
      if (count === 0) setImportError('That gallery contained no artifacts.');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not read that gallery file.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`gallery${open ? '' : ' is-closed'}`}>
      {/* The tab stays put whether the panel is open or shut, so the gallery is always
          visible as an affordance rather than something you have to know a key for. */}
      <button type="button" className="gallery-tab" onClick={toggleGallery}>
        <span>Gallery</span>
        <span className="gallery-count">{artifacts.length}</span>
        <span className="gallery-chevron">{open ? '×' : '▾'}</span>
      </button>

      {!open ? null : artifacts.length === 0 ? (
        <div className="gallery-empty">Nothing added yet — drag an FBX onto the window.</div>
      ) : (
        <ul className="gallery-list">
          {artifacts.map((a, i) => (
            <li key={a.id} className={i === objectIndex ? 'is-active' : undefined}>
              <button type="button" className="gallery-pick" onClick={() => selectObject(i)}>
                <span className="gallery-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="gallery-name">{a.name}</span>
                <span className="gallery-meta">
                  {a.untextured && <span className="gallery-warn">no texture</span>}
                  {a.format.toUpperCase()} · {mb(a.sizeBytes)}
                </span>
              </button>
              <button
                type="button"
                className="gallery-remove"
                onClick={() => void remove(a.id)}
                aria-label={`Remove ${a.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Packaging: a curated gallery is portable as one file, so it can be handed to a
          colleague, archived, or moved to another machine. */}
      {open && (
        <div className="gallery-pack">
          <button
            type="button"
            onClick={() => void doExport()}
            disabled={artifacts.length === 0 || busy !== null}
          >
            {busy === 'export' ? 'Exporting…' : 'Export gallery'}
          </button>
          <label className={busy ? 'is-busy' : undefined}>
            {busy === 'import' ? 'Importing…' : 'Import gallery'}
            <input type="file" accept=".zip" onChange={onImport} hidden disabled={busy !== null} />
          </label>
        </div>
      )}

      {/* Add bar — the gallery is where you manage the roster, so adding belongs here as
          well as on the whole-window drop target. */}
      {open && (
        <label className="gallery-add">
          <span className="gallery-add-plus">+</span>
          <span>Add artifact</span>
          <span className="gallery-add-hint">drag in, or click to choose</span>
          <input
            type="file"
            accept={`${ACCEPTED_EXTENSIONS.join(',')},.mtl,image/*`}
            multiple
            onChange={onPick}
            hidden
          />
        </label>
      )}
    </div>
  );
}