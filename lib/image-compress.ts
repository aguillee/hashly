/**
 * Compress an image to a target file size using Canvas API.
 * Converts PNGs to JPEG for better compression.
 */
export async function compressImage(
  file: File,
  targetSizeKB: number
): Promise<File> {
  const img = await loadImage(file);

  // Scale down dimensions if image is very large
  let { width, height } = img;
  const maxDimension = targetSizeKB <= 50 ? 512 : targetSizeKB <= 100 ? 768 : 1024;
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  // Binary search for the right JPEG quality to hit target size
  const targetBytes = targetSizeKB * 1024;
  let low = 0.05;
  let high = 0.95;
  let bestBlob: Blob | null = null;

  for (let i = 0; i < 10; i++) {
    const mid = (low + high) / 2;
    const blob = await canvasToBlob(canvas, "image/jpeg", mid);

    if (!bestBlob || Math.abs(blob.size - targetBytes) < Math.abs(bestBlob.size - targetBytes)) {
      bestBlob = blob;
    }

    if (blob.size > targetBytes) {
      high = mid;
    } else {
      low = mid;
    }

    // Close enough (within 10% of target)
    if (Math.abs(blob.size - targetBytes) / targetBytes < 0.1) {
      bestBlob = blob;
      break;
    }
  }

  if (!bestBlob) {
    throw new Error("Failed to compress image");
  }

  const extension = "jpg";
  const name = file.name.replace(/\.[^.]+$/, `.${extension}`);
  return new File([bestBlob], name, { type: "image/jpeg" });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      type,
      quality
    );
  });
}
