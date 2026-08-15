import { useCallback } from 'react';
import { useViewer } from '../store';
import {
  ACCEPTED_EXTENSIONS,
  formatOf,
  isImageFile,
  isMaterialFile,
  loadModel,
  triangleCount,
  type TextureFile,
} from './loadModel';
import { putArtifact, type ArtifactMeta } from '../library/db';
import { setModel } from '../library/models';

const HEAVY_TRIANGLES = 1_500_000;

/**
 * Import dropped or picked files into the library.
 *
 * Images in the same drop are treated as sidecar textures for the models in that drop.
 * Most museum scans embed their texture inside the FBX, but a few only reference an
 * absolute path from the exporting machine — those load black unless the .jpg comes with
 * them, so dropping model + image together is supported rather than requiring a
 * re-export.
 *
 * Parsing runs on the main thread behind a progress modal. That is deliberate for v1:
 * FBXLoader and texture decode both want DOM APIs, and these files are mostly 3-16 MB.
 * The very large Museo scans are the case that would justify a Worker.
 */
export function useImportFiles() {
  const setImporting = useViewer((s) => s.setImporting);
  const setImportError = useViewer((s) => s.setImportError);
  const addArtifactMeta = useViewer((s) => s.addArtifactMeta);

  return useCallback(
    async (files: File[]) => {
      setImportError(null);

      const models = files.filter((f) => formatOf(f.name));
      // Images and .mtl files belong to the models in the same drop, not on their own.
      const support = files.filter((f) => isImageFile(f.name) || isMaterialFile(f.name));

      if (models.length === 0) {
        setImportError(
          support.length
            ? 'Textures and .mtl files must be dropped together with the model they belong to.'
            : `Supported formats: ${ACCEPTED_EXTENSIONS.join(' ')}`,
        );
        return;
      }

      const textures: TextureFile[] = await Promise.all(
        support.map(async (f) => ({ name: f.name, bytes: await f.arrayBuffer() })),
      );

      const warnings: string[] = [];

      for (const file of models) {
        const format = formatOf(file.name)!;
        const label = file.name.replace(/\.[^.]+$/, '');

        try {
          setImporting({ name: label, note: 'Reading file…' });
          const bytes = await file.arrayBuffer();

          // Yield once so the modal paints before the parse blocks the main thread.
          setImporting({ name: label, note: 'Parsing mesh…' });
          await new Promise((r) => setTimeout(r, 0));

          const { group, missing } = await loadModel(bytes, format, textures);

          const untextured = missing.length > 0;
          if (untextured) {
            warnings.push(
              `${label} needs ${missing.join(', ')} — drag the .fbx and its image in together.`,
            );
          }

          const tris = triangleCount(group);
          if (tris > HEAVY_TRIANGLES) {
            warnings.push(`${label} is ~${tris.toLocaleString()} triangles and may run slowly.`);
          }

          const meta: ArtifactMeta = {
            id: crypto.randomUUID(),
            name: label,
            format,
            sizeBytes: file.size,
            addedAt: Date.now(),
            scaleMultiplier: 1,
            yawOffsetDeg: 0,
            untextured,
          };

          setImporting({ name: label, note: 'Saving to library…' });
          await putArtifact({ ...meta, bytes, textures });

          setModel(meta.id, group);
          addArtifactMeta(meta);
        } catch (err) {
          warnings.push(`${label} — ${err instanceof Error ? err.message : 'failed to load'}`);
        } finally {
          setImporting(null);
        }
      }

      if (warnings.length) setImportError(warnings.join('  •  '));
    },
    [addArtifactMeta, setImporting, setImportError],
  );
}