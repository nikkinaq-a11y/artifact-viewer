import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SupportedFormat, TextureFile } from '../import/loadModel';

/**
 * The artifact library lives entirely on the viewer's machine — no server, no accounts,
 * works offline. Original file bytes are stored rather than a converted mesh: it is
 * lossless, keeps the record re-openable by other tools, and avoids a conversion step
 * that could silently degrade a scan. The cost is storage, revisited if it bites.
 */
export type ArtifactRecord = {
  id: string;
  name: string;
  format: SupportedFormat;
  bytes: ArrayBuffer;
  /** Sidecar images dropped with the model, for FBX that reference textures externally. */
  textures: TextureFile[];
  sizeBytes: number;
  addedAt: number;
  /** True when the model rendered without any colour map — surfaced in the gallery. */
  untextured: boolean;
  /** Per-artifact nudges so a badly-oriented scan is corrected once and stays corrected. */
  scaleMultiplier: number;
  yawOffsetDeg: number;
};

/** Metadata only — payloads are deliberately excluded so lists stay cheap. */
export type ArtifactMeta = Omit<ArtifactRecord, 'bytes' | 'textures'>;

interface ViewerDB extends DBSchema {
  artifacts: { key: string; value: ArtifactRecord };
}

let dbPromise: Promise<IDBPDatabase<ViewerDB>> | null = null;

function db() {
  dbPromise ??= openDB<ViewerDB>('artifact-viewer', 1, {
    upgrade(database) {
      database.createObjectStore('artifacts', { keyPath: 'id' });
    },
  });
  return dbPromise;
}

export async function putArtifact(record: ArtifactRecord): Promise<void> {
  await (await db()).put('artifacts', record);
}

export async function getArtifact(id: string): Promise<ArtifactRecord | undefined> {
  return (await db()).get('artifacts', id);
}

export async function deleteArtifact(id: string): Promise<void> {
  await (await db()).delete('artifacts', id);
}

/** Full records including payloads — used by gallery export. */
export async function listArtifactRecords(): Promise<ArtifactRecord[]> {
  const all = await (await db()).getAll('artifacts');
  return all.sort((a, b) => a.addedAt - b.addedAt);
}

export async function clearArtifacts(): Promise<void> {
  await (await db()).clear('artifacts');
}

export async function listArtifactMeta(): Promise<ArtifactMeta[]> {
  const all = await (await db()).getAll('artifacts');
  return all
    .map(({ bytes: _bytes, textures: _textures, ...meta }) => meta)
    .sort((a, b) => a.addedAt - b.addedAt);
}