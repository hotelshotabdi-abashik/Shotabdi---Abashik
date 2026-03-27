import React, { useState, useRef } from 'react';
import { useContent } from '../context/ContentContext';
import { Edit2, Upload, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface EditableImageProps {
  contentKey: string;
  defaultSrc: string;
  className?: string;
  alt?: string;
  folder?: string;
  forceSvg?: boolean;
}

export const EditableImage: React.FC<EditableImageProps> = ({ contentKey, defaultSrc, className = '', alt = '', folder = '', forceSvg = false }) => {
  const { content, editMode, updateContent } = useContent();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSrc = content[contentKey] === 'deleted' ? '' : (content[contentKey] || defaultSrc);

  const handleSave = async () => {
    if (value.trim()) {
      await updateContent(contentKey, value);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue('');
    setIsEditing(false);
  };

  const handleDelete = async () => {
    const WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'https://shotabdi-abashik.hotelshotabdiabashik.workers.dev';
    const AUTH_KEY = import.meta.env.VITE_CLOUDFLARE_WORKER_SECRET || '123456@';

    if (currentSrc && currentSrc.startsWith(WORKER_URL)) {
      try {
        toast.loading('Deleting image...', { id: 'delete' });
        const prevFileName = currentSrc.replace(`${WORKER_URL}/`, '');
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
    
    await updateContent(contentKey, 'deleted');
    setValue('');
    setIsEditing(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 5) { // 5MB limit
        toast.error('Image must be less than 5MB');
        return;
      }

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
        if (currentSrc && currentSrc.startsWith(WORKER_URL)) {
          try {
            const prevFileName = currentSrc.replace(`${WORKER_URL}/`, '');
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
            // Don't fail the upload if delete fails
          }
        }
        
        setValue(url);
        toast.success('Image uploaded successfully', { id: 'upload' });
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload image', { id: 'upload' });
      }
    }
  };

  const renderImage = (src: string) => {
    if (!src) {
      if (editMode) {
        return <div className={`bg-slate-200 flex items-center justify-center ${className}`}><span className="text-slate-400 text-sm">No Image</span></div>;
      }
      return null;
    }
    if (forceSvg && !src.toLowerCase().endsWith('.svg') && !src.startsWith('data:image/svg')) {
      return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <image href={src} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
        </svg>
      );
    }
    return <img src={src} alt={alt} className={className} referrerPolicy="no-referrer" />;
  };

  if (editMode) {
    if (isEditing) {
      return (
        <div className={`relative inline-block ${className}`}>
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-20 rounded-lg p-4">
            <input
              type="text"
              placeholder="Enter image URL or upload"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full p-2 mb-2 rounded text-black"
            />
            <div className="flex space-x-2 w-full">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-white text-slate-800 px-3 py-2 rounded flex items-center justify-center hover:bg-slate-100"
              >
                <Upload className="w-4 h-4 mr-2" /> Upload
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          {renderImage(value || currentSrc)}
        </div>
      );
    }

    return (
      <div className={`relative group inline-block ${className}`}>
        {renderImage(currentSrc)}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center rounded-lg space-x-2">
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 bg-red-600 text-white p-2 rounded-full shadow-lg transform transition-all hover:scale-110"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          {currentSrc !== defaultSrc && currentSrc !== '' && (
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 bg-slate-800 text-white p-2 rounded-full shadow-lg transform transition-all hover:scale-110"
              title="Delete Image"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return renderImage(currentSrc);
};
