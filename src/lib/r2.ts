import imageCompression from 'browser-image-compression';

export const uploadToR2 = async (file: File, folder: string = 'shotabdi-abashik'): Promise<string> => {
  const WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'https://shotabdi-abashik.hotelshotabdiabashik.workers.dev';
  const AUTH_KEY = import.meta.env.VITE_CLOUDFLARE_WORKER_SECRET || '123456@';
  
  if (!WORKER_URL || !AUTH_KEY) {
    throw new Error("Cloudflare R2 credentials are not configured.");
  }

  let fileToUpload = file;
  let contentType = file.type;
  let finalFileName = file.name;

  // Image Compression and WebP Conversion
  if (file.type.startsWith('image/')) {
    try {
      const options = {
        maxSizeMB: 0.8, // Slightly more aggressive for faster loading
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp' as any
      };
      
      const compressedFile = await imageCompression(file, options);
      fileToUpload = new File([compressedFile], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
        type: 'image/webp'
      });
      contentType = 'image/webp';
      finalFileName = fileToUpload.name;
    } catch (error) {
      console.error("Image compression failed, uploading original:", error);
    }
  } else if (file.type.startsWith('video/')) {
    // For videos, we ensure it's treated as mp4 if possible or at least has the right mime type
    // In-browser transcoding is limited, but we can ensure the extension is correct for the request
    if (!file.name.toLowerCase().endsWith('.mp4')) {
      finalFileName = file.name.replace(/\.[^/.]+$/, "") + ".mp4";
      contentType = 'video/mp4';
    }
  }

  const fileName = `${folder}/${Date.now()}_${finalFileName.replace(/\s+/g, '-')}`;
  
  const response = await fetch(`${WORKER_URL}/${fileName}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${AUTH_KEY}`,
      'Content-Type': contentType || 'application/octet-stream',
    },
    body: fileToUpload,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }
  
  return `${WORKER_URL}/${fileName}`;
};

export const deleteFromR2 = async (url: string): Promise<void> => {
  const WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'https://shotabdi-abashik.hotelshotabdiabashik.workers.dev';
  const AUTH_KEY = import.meta.env.VITE_CLOUDFLARE_WORKER_SECRET || '123456@';
  
  if (!WORKER_URL || !AUTH_KEY) return;
  
  try {
    let pathToDelete = '';
    
    if (url.includes(WORKER_URL)) {
      pathToDelete = url.split(`${WORKER_URL}/`)[1];
    } else if (url.includes('pub-c0b44c83d9824fb19234fdfbbd92001e.r2.dev')) {
      pathToDelete = url.split('pub-c0b44c83d9824fb19234fdfbbd92001e.r2.dev/')[1];
    } else if (url.includes('workers.dev')) {
      pathToDelete = url.split('.dev/')[1];
    } else {
      // Fallback: try to get everything after the second slash or domain
      const parts = url.split('/');
      if (parts.length > 3) {
        pathToDelete = parts.slice(3).join('/');
      } else {
        pathToDelete = parts.pop() || '';
      }
    }
    
    if (!pathToDelete) return;
    
    await fetch(`${WORKER_URL}/${pathToDelete}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${AUTH_KEY}`,
      }
    });
  } catch (error) {
    console.error("Error deleting from R2:", error);
  }
};

export const fixR2Url = (url: string | null | undefined): string => {
  if (!url) return '';
  const WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'https://shotabdi-abashik.hotelshotabdiabashik.workers.dev';
  const OLD_DOMAIN = 'shotabdi-abashik.bd';
  
  if (url.includes(OLD_DOMAIN)) {
    return url.replace(new RegExp(`https?://${OLD_DOMAIN}`, 'g'), WORKER_URL);
  }
  
  return url;
};
