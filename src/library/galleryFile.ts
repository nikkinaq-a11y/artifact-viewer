import { unzip, zip } from 'fflate';
import {
  clearArtifacts,
  listArtifactRecords,
  putArtifact,
  type ArtifactRecord,
} from './db';
import type { SupportedFormat } from '../import/loadModel';

/**
 * A curated gallery saved as a single .zip: every artifact's original bytes, any sidecar
 * textures, and the scene setup the curator staged it with. Opening it on another machine
 * reproduces what they saw, which is what makes a collection portable rather than stuck in
 * one browser's storage.
 *
 * Layout inside the zip:
 *   gallery.json                       manifest + scene settings
 *   README.txt                         plain-text summary for anyone opening it by hand
 *   artifacts/<id>/<filename>          the model, under its original name
 *   artifacts/<id>/textures/<name>     sidecar images for models that need them
 */

export const GALLERY_FORMAT_VERSION = 1;

export type SceneSettings = {
  pedestal: { widthCm: number; lengthCm: number; heightCm: number };
  pedestalVisible: boolean;
  lights: Record<string, { on: boolean; intensity: number }>;
  studioTheme: string;
  objectScale: number;
  camIndex: number;
};

type ManifestArtifact = {
  id: string;
  name: string;
  format: SupportedFormat;
  file: string;
  textures: string[];
  sizeBytes: number;
  addedAt: number;
  scaleMultiplier: number;
  yawOffsetDeg: number;
  untextured: boolean;
};

type Manifest = {
  formatVersion: number;
  exportedAt: string;
  settings: SceneSettings;
  artifacts: ManifestArtifact[];
};

const enc = new TextEncoder();
const dec = new TextDecoder();

const asU8 = (b: ArrayBuffer) => new Uint8Array(b);

/** Model files keep their original extension so the zip is legible outside the app. */
const extFor = (format: SupportedFormat, name: string) =>
  /\.[^.]+$/.test(name) ? '' : `.${format === 'gltf' ? 'glb' : format}`;

export async function exportGallery(settings: SceneSettings): Promise<Blob> {
  const records = await listArtifactRecords();
  if (records.length === 0) throw new Error('The gallery is empty — nothing to export.');

  const files: Record<string, Uint8Array> = {};
  const artifacts: ManifestArtifact[] = [];

  for (const r of records) {
    const fileName = `${r.name}${extFor(r.format, r.name)}`;
    files[`artifacts/${r.id}/${fileName}`] = asU8(r.bytes);

    const textureNames: string[] = [];
    for (const t of r.textures ?? []) {
      files[`artifacts/${r.id}/textures/${t.name}`] = asU8(t.bytes);
      textureNames.push(t.name);
    }

    artifacts.push({
      id: r.id,
      name: r.name,
      format: r.format,
      file: fileName,
      textures: textureNames,
      sizeBytes: r.sizeBytes,
      addedAt: r.addedAt,
      scaleMultiplier: r.scaleMultiplier,
      yawOffsetDeg: r.yawOffsetDeg,
      untextured: r.untextured,
    });
  }

  const manifest: Manifest = {
    formatVersion: GALLERY_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    artifacts,
  };

  files['gallery.json'] = enc.encode(JSON.stringify(manifest, null, 2));
  files['README.txt'] = enc.encode(readmeFor(manifest));

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    // Level 0: the payload is already-compressed JPEG and binary mesh data, so deflating
    // it again costs seconds and saves almost nothing.
    zip(files, { level: 0 }, (err, data) => (err ? reject(err) : resolve(data)));
  });

  return new Blob([zipped as BlobPart], { type: 'application/zip' });
}

function readmeFor(m: Manifest): string {
  const lines = [
    'Artifact Viewer — exported gallery',
    '',
    `Exported:  ${new Date(m.exportedAt).toLocaleString()}`,
    `Artifacts: ${m.artifacts.length}`,
    '',
    'Open the Artifact Viewer and use Import gallery to load this file.',
    'The models are also readable directly from the artifacts/ folder if you',
    'need them outside the app.',
    '',
    'Contents:',
    ...m.artifacts.map((a) => `  - ${a.name}  (${a.format.toUpperCase()})`),
  ];
  return lines.join('\n');
}

export type ImportResult = { count: number; settings: SceneSettings | null };

/**
 * Load a gallery zip. Replaces the current library rather than merging — a shared gallery
 * is a curated set, and silently mixing it into whatever was already there makes it
 * impossible to tell what came from where.
 */
export async function importGallery(file: File): Promise<ImportResult> {
  const buf = new Uint8Array(await file.arrayBuffer());

  const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(buf, (err, data) => (err ? reject(err) : resolve(data)));
  });

  const manifestRaw = entries['gallery.json'];
  if (!manifestRaw) throw new Error('Not an Artifact Viewer gallery — gallery.json is missing.');

  const manifest = JSON.parse(dec.decode(manifestRaw)) as Manifest;
  if (manifest.formatVersion > GALLERY_FORMAT_VERSION) {
    throw new Error(
      `This gallery was made by a newer version of the app (format ${manifest.formatVersion}).`,
    );
  }

  await clearArtifacts();

  let count = 0;
  for (const a of manifest.artifacts) {
    const bytes = entries[`artifacts/${a.id}/${a.file}`];
    if (!bytes) continue;

    const record: ArtifactRecord = {
      id: a.id,
      name: a.name,
      format: a.format,
      bytes: toArrayBuffer(bytes),
      textures: a.textures
        .map((name) => {
          const t = entries[`artifacts/${a.id}/textures/${name}`];
          return t ? { name, bytes: toArrayBuffer(t) } : null;
        })
        .filter((t): t is { name: string; bytes: ArrayBuffer } => t !== null),
      sizeBytes: a.sizeBytes,
      addedAt: a.addedAt,
      scaleMultiplier: a.scaleMultiplier ?? 1,
      yawOffsetDeg: a.yawOffsetDeg ?? 0,
      untextured: a.untextured ?? false,
    };

    await putArtifact(record);
    count += 1;
  }

  return { count, settings: manifest.settings ?? null };
}

/** fflate hands back views into a larger buffer; IndexedDB needs a standalone copy. */
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.byteOffset === 0 && u8.byteLength === u8.buffer.byteLength
    ? (u8.buffer as ArrayBuffer)
    : (u8.slice().buffer as ArrayBuffer);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}