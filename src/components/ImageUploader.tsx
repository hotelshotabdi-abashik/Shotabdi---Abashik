import React, { useState, useRef } from 'react';
import { Edit2, Upload, X, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange, folder = 'shotabdi-abashik/general', className = '' }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDelete = async () => {
    if (!value) return;

    const WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'https://shotabdi-abashik.hotelshotabdiabashik.workers.dev';
    const AUTH_KEY = import.meta.env.VITE_CLOUDFLARE_WORKER_SECRET || '123456@';

    if (value.startsWith(WORKER_URL)) {
      try {
        toast.loading('Deleting image...', { id: 'delete' });
        const prevFileName = value.replace(`${WORKER_URL}/`, '');
        if (prevFileName) {
          await fetch(`${WORKER_URL}/${prevFileName}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${AUTH_KEY}`,
            }
          });
        }
        toast.success('Image deleted from storage', { id: 'delete' });
      } catch (deleteError) {
        console.error('Failed to delete image:', deleteError);
        toast.error('Failed to delete image from storage', { id: 'delete' });
      }
    }
    
    onChange('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 5) { // 5MB limit
        toast.error('Image must be less than 5MB');
        return;
      }

      setIsUploading(true);
      try {
        toast.loading('Uploading image...', { id: 'upload' });
        const cleanFileName = file.name.replace(/\s+/g, '-');
        const fileName = folder ? `${folder}/${Date.now()}_${cleanFileName}` : `${Date.now()}_${cleanFileName}`;
        const WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'https://shotabdi-abashik.hotelshotabdiabashik.workers.dev';
        const AUTH_KEY = import.meta.env.VITE_CLOUDFLARE_WORKER_SECRET || '123456@';
        
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
        
        const url = `${WORKER_URL}/${fileName}`;
        
        // Delete previous image if it's hosted on our worker
        if (value && value.startsWith(WORKER_URL)) {
          try {
            const prevFileName = value.replace(`${WORKER_URL}/`, '');
            if (prevFileName) {
              await fetch(`${WORKER_URL}/${prevFileName}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${AUTH_KEY}`,
                }
              });
            }
          } catch (deleteError) {
            console.error('Failed to delete previous image:', deleteError);
          }
        }
        
        onChange(url);
        toast.success('Image uploaded successfully', { id: 'upload' });
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload image', { id: 'upload' });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  return (
    <div className={`relative border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-50 ${className}`}>
      {value ? (
        <div className="relative w-full group">
          <img src={value} alt="Uploaded" className="w-full h-32 object-cover rounded-md" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-md">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-white text-slate-800 rounded-full hover:bg-slate-200"
              title="Change Image"
              disabled={isUploading}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
              title="Delete Image"
              disabled={isUploading}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <ImageIcon className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-white px-3 py-1.5 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            {isUploading ? 'Uploading...' : 'Upload Image'}
          </button>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};
