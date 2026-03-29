export const uploadToR2 = async (file: File, folder: string = 'shotabdi-abashik'): Promise<string> => {
  const WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'https://shotabdi-abashik.hotelshotabdiabashik.workers.dev';
  const AUTH_KEY = import.meta.env.VITE_CLOUDFLARE_WORKER_SECRET || '123456@';
  
  if (!WORKER_URL || !AUTH_KEY) {
    throw new Error("Cloudflare R2 credentials are not configured.");
  }

  const fileName = `${folder}/${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
  
  const response = await fetch(`${WORKER_URL}/${fileName}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${AUTH_KEY}`,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
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
