/**
 * Cloudinary Unsigned Media Uploader & Video Optimization Engine
 * Provides ~25GB free storage for videos and images with automatic fast CDN delivery
 * Automatically transcodes mobile (.mov / HEVC / iPhone) to universal H.264 MP4
 */

export let lastCloudinaryError = '';

/**
 * Ensures any video URL (especially iPhone / mobile .mov recordings)
 * is delivered as an optimized H.264 MP4 that plays on 100% of mobile and desktop browsers.
 */
export function formatOptimizedVideoUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;

  // Cloudinary video transformation
  if (url.includes('cloudinary.com') && url.includes('/video/upload/')) {
    let clean = url.replace(/\.(mov|qt|m4v|webm|avi|mkv|3gp|wmv)$/i, '.mp4');
    if (!clean.includes('/video/upload/f_mp4')) {
      clean = clean.replace('/video/upload/', '/video/upload/f_mp4,vc_h264/');
    }
    return clean;
  }

  return url;
}

/**
 * Extracts a high-res video poster thumbnail from Cloudinary at 1.0 second,
 * ensuring the video card NEVER stays black even before playback starts.
 */
export function formatOptimizedCoverUrl(videoUrl?: string, coverUrl?: string): string {
  // If a valid custom cover image is already provided (and not a blob)
  if (coverUrl && !coverUrl.startsWith('blob:') && !coverUrl.includes('placeholder') && !coverUrl.includes('photo-1519741347686')) {
    return coverUrl;
  }

  // If video is hosted on Cloudinary, extract frame at 1.0s as high quality JPG
  if (videoUrl && videoUrl.includes('cloudinary.com') && videoUrl.includes('/video/upload/')) {
    let poster = videoUrl;
    if (poster.includes('/video/upload/f_mp4') || poster.includes('/video/upload/so_')) {
      poster = poster.replace(/\/video\/upload\/[^/]+\//, '/video/upload/so_1.0,f_jpg,q_auto/');
    } else {
      poster = poster.replace('/video/upload/', '/video/upload/so_1.0,f_jpg,q_auto/');
    }
    return poster.replace(/\.[a-zA-Z0-9]+$/, '.jpg');
  }

  return coverUrl || 'https://images.unsplash.com/photo-1519741347686-cfcbf6bde2af?w=800';
}

/**
 * Instantly captures a frame from a local video File (selected on mobile)
 * using an off-screen HTML5 canvas so the preview is never black while uploading.
 */
export function generateVideoThumbnailFromBlob(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve('');
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;

      const timer = setTimeout(() => {
        try { URL.revokeObjectURL(objectUrl); } catch {}
        resolve('');
      }, 4000);

      video.onloadeddata = () => {
        try {
          video.currentTime = Math.min(1.0, video.duration > 0 ? Math.min(0.8, video.duration / 2) : 0.5);
        } catch {
          // Fallback if seek not supported
        }
      };

      video.onseeked = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 720;
          canvas.height = video.videoHeight || 1280;
          const ctx = canvas.getContext('2d');
          if (ctx && canvas.width > 0 && canvas.height > 0) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            URL.revokeObjectURL(objectUrl);
            resolve(dataUrl);
            return;
          }
        } catch (e) {
          console.warn('Canvas snapshot warning:', e);
        }
        try { URL.revokeObjectURL(objectUrl); } catch {}
        resolve('');
      };

      video.onerror = () => {
        clearTimeout(timer);
        try { URL.revokeObjectURL(objectUrl); } catch {}
        resolve('');
      };
    } catch {
      resolve('');
    }
  });
}

export async function uploadMediaToCloudinary(file: File): Promise<string | null> {
  lastCloudinaryError = '';
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'cpwt6w5h';
  const primaryPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'poses preset';
  const presetsToTry = Array.from(new Set([primaryPreset, 'poses preset', 'poses_preset', 'poses', 'snap_poses', 'snap_preset', 'ml_default']));

  const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|qt|m4v|webm|avi|mkv|3gp|wmv)$/i.test(file.name);
  const resourceType = isVideo ? 'video' : 'image';

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
        return isVideo ? formatOptimizedVideoUrl(data.secure_url) : data.secure_url;
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

/**
 * Permanently delete media from Cloudinary (both video and image)
 * via server-side API route.
 */
export async function deleteMediaFromCloudinary(urlOrPublicId?: string | null): Promise<boolean> {
  if (!urlOrPublicId) return false;
  try {
    const res = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlOrPublicId }),
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn('Cloudinary delete exception:', err);
    return false;
  }
}
