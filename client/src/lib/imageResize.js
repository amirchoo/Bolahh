// Downscales an image file before upload so avatars display quickly instead of
// loading a multi-megabyte original (e.g. a full-resolution phone photo) just
// to render a 30-40px circle. Uses createImageBitmap with imageOrientation:
// 'from-image' so EXIF-rotated phone photos still come out right-side-up —
// plain canvas drawImage() ignores EXIF orientation and would flip them.
export async function resizeImageFile(file, maxDim = 512, quality = 0.85) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  let { width, height } = bitmap;
  if (width > maxDim || height > maxDim) {
    if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
    else { width = Math.round((width * maxDim) / height); height = maxDim; }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), file.type, quality);
  });
}
