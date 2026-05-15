import React, { useState, useRef } from 'react';
import { Edit2, Upload, X, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { uploadToR2, deleteFromR2 } from '../lib/r2';

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

    try {
      toast.loading('Deleting image...', { id: 'delete' });
      await deleteFromR2(value);
      toast.success('Image deleted', { id: 'delete' });
    } catch (deleteError) {
      console.error('Failed to delete image:', deleteError);
      toast.error('Failed to delete', { id: 'delete' });
    }
    
    onChange('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        toast.loading('Uploading media...', { id: 'upload' });
        const url = await uploadToR2(file, folder);
        
        // Delete previous media if it's ours
        if (value) {
          try {
            await deleteFromR2(value);
          } catch (deleteError) {
            console.error('Failed to delete previous media:', deleteError);
          }
        }
        
        onChange(url);
        toast.success(`${file.type.startsWith('video') ? 'Video' : 'Image'} uploaded successfully`, { id: 'upload' });
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload', { id: 'upload' });
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
          <img src={value} alt="Uploaded" className="w-full h-32 object-cover rounded-md" referrerPolicy="no-referrer" loading="eager" fetchPriority="high" decoding="async" />
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
        accept="image/*,video/*"
        className="hidden"
      />
    </div>
  );
};
