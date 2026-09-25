/**
 * Cloudinary Unsigned Media Uploader
 * Provides ~25GB free storage for videos and images with automatic fast CDN delivery
 */

export let lastCloudinaryError = '';

export async function uploadMediaToCloudinary(file: File): Promise<string | null> {
  lastCloudinaryError = '';
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'cpwt6w5h';
  const primaryPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'poses preset';
  const presetsToTry = Array.from(new Set([primaryPreset, 'poses preset', 'poses_preset', 'poses', 'snap_poses', 'snap_preset', 'ml_default']));

  const resourceType = file.type.startsWith('video/') ? 'video' : 'image';

  for (const preset of presetsToTry) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', preset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        lastCloudinaryError = '';
        return data.secure_url;
      }
      if (data.error?.message) {
        lastCloudinaryError = data.error.message;
        console.warn(`Cloudinary preset [${preset}] response:`, data.error.message);
      }
    } catch (err: any) {
      lastCloudinaryError = err?.message || 'Network upload error';
      console.error(`Cloudinary upload error with preset ${preset}:`, err);
    }
  }

  return null;
}
