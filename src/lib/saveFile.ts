import { downloadBlob } from '../library/galleryFile';

/**
 * The one way the app hands a file to the user — gallery exports and snapshots both come
 * through here, so whatever it takes to save on a given platform is fixed in one place.
 */
export async function saveFile(blob: Blob, filename: string): Promise<void> {
  downloadBlob(blob, filename);
}
