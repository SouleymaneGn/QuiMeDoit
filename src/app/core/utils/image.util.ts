/** Côté le plus long d'une photo de justificatif : lisible à l'écran, ~200-400 Ko en JPEG. */
const PHOTO_MAX_SIZE = 1600;
const PHOTO_QUALITY = 0.8;

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de lire l'image."));
    };
    img.src = url;
  });
}

/** Réduit une photo (carnet, reçu, facture) à 1600 px maximum et la ré-encode en JPEG. */
export async function compressPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choisissez une image (photo, PNG ou JPG).');
  }
  const img = await loadImage(file);
  const scale = Math.min(1, PHOTO_MAX_SIZE / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d')!;
  // Fond blanc : un PNG transparent ne devient pas noir en JPEG.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error("Impossible de préparer la photo."))),
      'image/jpeg',
      PHOTO_QUALITY
    )
  );
}
