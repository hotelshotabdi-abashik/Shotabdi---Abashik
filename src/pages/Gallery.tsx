import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useContent } from '../context/ContentContext';
import { EditableText } from '../components/EditableText';
import { uploadToR2, deleteFromR2 } from '../lib/r2';
import { Trash2, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { ConfirmModal } from '../components/ConfirmModal';

export default function Gallery() {
  const { t } = useLanguage();
  const { content, editMode, updateContent } = useContent();
  const [uploading, setUploading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const images: string[] = content.galleryImages || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadToR2(file);
      const newImages = [...images, url];
      await updateContent('galleryImages', newImages);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (index: number, url: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Image',
      message: 'Are you sure you want to delete this image from the gallery? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteFromR2(url);
          const newImages = [...images];
          newImages.splice(index, 1);
          await updateContent('galleryImages', newImages);
          toast.success('Image deleted successfully');
        } catch (error) {
          console.error(error);
          toast.error('Failed to delete image');
        }
      }
    });
  };

  return (
    <div className="bg-slate-50 py-16 min-h-screen">
      <Helmet>
        <title>Gallery | Hotel Shotabdi Abashik</title>
        <meta name="description" content="View photos of Hotel Shotabdi Abashik. See our rooms, facilities, and the beautiful surroundings in Sylhet." />
        <meta name="keywords" content="Hotel Shotabdi Abashik photos, Sylhet hotel gallery, room pictures Sylhet" />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">
            <EditableText contentKey="gallery_title" defaultText={t('গ্যালারি', 'Gallery')} />
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            <EditableText contentKey="gallery_subtitle" defaultText={t('আমাদের হোটেলের কিছু দৃশ্য।', 'Some views of our hotel.')} multiline />
          </p>
          <div className="w-24 h-1 bg-red-600 mx-auto rounded-full mt-6"></div>
        </div>

        {editMode && (
          <div className="mb-8 flex justify-center">
            <label className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors cursor-pointer font-medium shadow-md">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              {uploading ? 'Uploading...' : 'Upload New Image'}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {images.map((src, index) => (
            <div key={index} className="rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow aspect-w-4 aspect-h-3 relative group">
              <img src={src} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              {editMode && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={() => handleDelete(index, src)}
                    className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 transform hover:scale-110 transition-all shadow-lg"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {images.length === 0 && !uploading && (
            <div className="col-span-full text-center py-12 text-slate-500">
              {t('কোনো ছবি পাওয়া যায়নি।', 'No images found.')}
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        confirmText="Delete"
      />
    </div>
  );
}
