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
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp' as any // Force WebP conversion
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
    const fileName = url.split('/').pop();
    if (!fileName) return;
    
    await fetch(`${WORKER_URL}/${fileName}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${AUTH_KEY}`,
      }
    });
  } catch (error) {
    console.error("Error deleting from R2:", error);
  }
};
