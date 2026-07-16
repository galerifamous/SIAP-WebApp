/**
 * Resizes and compresses an image (File or Base64 data URL) to a maximum width and height.
 * Returns a Promise that resolves to a compressed JPEG Base64 data URL.
 */
export function resizeAndCompressImage(
  source: File | string,
  maxWidth = 150,
  maxHeight = 180,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImage = (base64Str: string) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Str);
          return;
        }

        // Fill background with white (handles transparency beautifully if JPEG format is used)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to highly optimized, compact JPEG format
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };

      img.onerror = (err) => {
        console.error("Error loading image for compression:", err);
        resolve(base64Str);
      };

      img.src = base64Str;
    };

    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          processImage(reader.result);
        } else {
          reject(new Error("Failed to read file as string"));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(source);
    } else {
      processImage(source);
    }
  });
}
