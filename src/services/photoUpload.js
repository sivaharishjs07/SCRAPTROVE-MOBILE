/**
 * Photo preparation and upload, shared by every screen that sends photos
 * (seller pickup, bulk pickup, dealer registration, order completion).
 *
 * Camera photos are 12-50 MP. Sent as-is they are several MB (a third more
 * as base64), which times out on slow connections and can exhaust memory
 * on low-end phones. Each photo is therefore resized so its long side is at
 * most MAX_EDGE px and re-encoded as JPEG before upload; typical result is
 * a few hundred KB. Re-encoding also drops EXIF metadata (e.g. GPS).
 *
 * The request itself is unchanged: POST /upload { data: <base64>, type }.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { uploadPhoto } from './api';

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.7;

// Resize actions for an image of the given size: scale the longer side down
// to MAX_EDGE, keep the aspect ratio, never upscale.
function resizeActions(width, height) {
  if (!width || !height) return null; // unknown size, see preparePhoto
  if (Math.max(width, height) <= MAX_EDGE) return [];
  return width >= height
    ? [{ resize: { width: MAX_EDGE } }]
    : [{ resize: { height: MAX_EDGE } }];
}

/**
 * Resize + JPEG re-encode one picked photo.
 * `asset` is an expo-image-picker asset ({ uri, width, height }) or a bare
 * { uri }. Returns { uri, base64 }; `uri` is a new temporary file.
 */
export async function preparePhoto(asset) {
  const uri = asset?.uri;
  if (!uri) throw new Error('No photo selected');
  let actions = resizeActions(asset.width, asset.height);
  if (actions === null) {
    // Size not known: read it first (one extra decode, rare).
    const probe = await ImageManipulator.manipulateAsync(uri, []);
    actions = resizeActions(probe.width, probe.height) || [];
    deleteCachedFile(probe.uri);
  }
  const out = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  return { uri: out.uri, base64: out.base64 };
}

/**
 * Prepare and upload one photo. Resolves with the hosted URL; rejects on
 * any failure (the axios error is passed through so callers can show the
 * server's message, see uploadErrorMessage).
 */
export async function uploadPhotoAsset(asset) {
  const prepared = await preparePhoto(asset);
  try {
    const res = await uploadPhoto(prepared.base64, 'image/jpeg');
    const url = res?.data?.url;
    if (!url) throw new Error('Upload returned no URL');
    return url;
  } finally {
    deleteCachedFile(prepared.uri);
  }
}

/**
 * Upload photos one after another (keeps only one photo in memory at a
 * time). Stops at the first failure and rejects, so a caller never submits
 * an order or registration with photos silently missing.
 */
export async function uploadPhotoAssets(assets) {
  const urls = [];
  for (const asset of assets || []) {
    // eslint-disable-next-line no-await-in-loop
    urls.push(await uploadPhotoAsset(asset));
  }
  return urls;
}

/** User-facing text for an upload error: the server's own message if any. */
export function uploadErrorMessage(err, fallback) {
  return err?.response?.data?.error || fallback;
}

// Only ever delete files inside this app's cache directory (where the
// picker and the manipulator put their copies), never anything else.
function deleteCachedFile(uri) {
  const cache = FileSystem.cacheDirectory;
  if (!uri || !cache || !uri.startsWith(cache)) return;
  FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}

/** Remove the picker's cached copies once they are no longer needed. */
export function deleteLocalPhotos(assets) {
  for (const a of assets || []) deleteCachedFile(typeof a === 'string' ? a : a?.uri);
}
