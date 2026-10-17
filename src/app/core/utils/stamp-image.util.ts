import { loadImage } from './image.util';

/** Côté le plus long du cachet enregistré : assez net pour un PDF A4, assez léger pour la base. */
const MAX_SIZE = 400;
/** Au-delà de cette luminosité, un pixel est considéré comme le papier blanc de la photo. */
const PAPER_LUMINANCE = 205;
/** Marge (px) conservée autour du cachet après recadrage. */
const CROP_PADDING = 8;

/**
 * Prépare un cachet à partir d'une photo ou d'un fichier :
 * 1. fond blanc du papier rendu transparent (optionnel) — le cachet se pose alors
 *    sur le relevé comme un vrai tampon ;
 * 2. recadrage serré autour de l'encre ;
 * 3. réduction à 400 px maximum, export PNG (data URL).
 */
export async function prepareStampImage(file: File, removeBackground = true): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choisissez une image (photo, PNG ou JPG).');
  }
  const img = await loadImage(file);

  // Première passe à taille réduite (le recadrage se fait sur cette image).
  const scale = Math.min(1, (MAX_SIZE * 2) / Math.max(img.width, img.height));
  const work = document.createElement('canvas');
  work.width = Math.round(img.width * scale);
  work.height = Math.round(img.height * scale);
  const ctx = work.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, work.width, work.height);

  const data = ctx.getImageData(0, 0, work.width, work.height);
  const px = data.data;
  let minX = work.width;
  let minY = work.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < work.height; y++) {
    for (let x = 0; x < work.width; x++) {
      const i = (y * work.width + x) * 4;
      const luminance = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      if (removeBackground && luminance >= PAPER_LUMINANCE) {
        px[i + 3] = 0;
      }
      if (px[i + 3] > 24) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  ctx.putImageData(data, 0, 0);

  if (maxX < 0) {
    throw new Error("Aucun cachet détecté sur l'image : essayez une photo plus contrastée.");
  }

  // Recadrage + réduction finale.
  const cropX = Math.max(0, minX - CROP_PADDING);
  const cropY = Math.max(0, minY - CROP_PADDING);
  const cropW = Math.min(work.width, maxX + CROP_PADDING + 1) - cropX;
  const cropH = Math.min(work.height, maxY + CROP_PADDING + 1) - cropY;
  const finalScale = Math.min(1, MAX_SIZE / Math.max(cropW, cropH));

  const out = document.createElement('canvas');
  out.width = Math.round(cropW * finalScale);
  out.height = Math.round(cropH * finalScale);
  out.getContext('2d')!.drawImage(work, cropX, cropY, cropW, cropH, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}
