import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useContent } from '../context/ContentContext';
import { EditableText } from '../components/EditableText';
import { uploadToR2, deleteFromR2 } from '../lib/r2';
import { Trash2, Upload, Loader2, X, Image as ImageIcon, Edit2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { ConfirmModal } from '../components/ConfirmModal';
import { Link } from 'react-router-dom';

export interface GalleryImage {
  id: string;
  url: string;
  title: string;
  description: string;
  keywords: string;
  createdAt: number;
}

export default function Gallery() {
  const { t } = useLanguage();
  const { content, editMode, updateContent } = useContent();
  const [uploading, setUploading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    file: null as File | null,
    title: '',
    description: '',
    keywords: ''
  });

  const rawImages: any[] = content.galleryImages || [];
  const images: GalleryImage[] = rawImages
    .map((img, idx) => {
      if (typeof img === 'string') {
        return {
          id: `img-${idx}-${Date.now()}`,
          url: img,
          title: '',
          description: '',
          keywords: '',
          createdAt: Date.now() - (idx * 1000) // Ensure different timestamps for old data
        };
      }
      return img;
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  const handleOpenUploadModal = (index: number | null = null) => {
    if (index !== null) {
      const img = images[index];
      setFormData({
        file: null,
        title: img.title || '',
        description: img.description || '',
        keywords: img.keywords || ''
      });
      setEditingIndex(index);
    } else {
      setFormData({ file: null, title: '', description: '', keywords: '' });
      setEditingIndex(null);
    }
    setIsUploadModalOpen(true);
  };

  const handleSaveImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIndex === null && !formData.file) {
      toast.error('Please select an image');
      return;
    }

    setUploading(true);
    try {
      let url = editingIndex !== null ? images[editingIndex].url : '';
      
      if (formData.file) {
        url = await uploadToR2(formData.file);
        // If editing and we uploaded a new file, delete the old one
        if (editingIndex !== null && images[editingIndex].url.includes('workers.dev')) {
          await deleteFromR2(images[editingIndex].url).catch(console.error);
        }
      }

      const newImage: GalleryImage = {
        id: editingIndex !== null ? images[editingIndex].id : `img-${Date.now()}`,
        url,
        title: formData.title,
        description: formData.description,
        keywords: formData.keywords,
        createdAt: editingIndex !== null ? images[editingIndex].createdAt : Date.now()
      };

      let newImages = [...images];
      if (editingIndex !== null) {
        newImages[editingIndex] = newImage;
      } else {
        newImages.unshift(newImage); // Add to top
      }

      // Enforce 50 image limit
      if (newImages.length > 50) {
        const imagesToDelete = newImages.slice(50);
        newImages = newImages.slice(0, 50);
        
        // Delete from R2
        for (const img of imagesToDelete) {
          if (img.url.includes('workers.dev')) {
            await deleteFromR2(img.url).catch(console.error);
          }
        }
        
        // Notify admin (simulated via toast for now, could be an email log)
        toast.info(`Gallery limit reached. ${imagesToDelete.length} oldest posts were automatically deleted to save space.`);
        
        // Log to emailLogs if possible
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: 'hotelshotabdiabashik@gmail.com',
              subject: 'Gallery Cleanup Notification',
              text: `The gallery cleanup process has run. ${imagesToDelete.length} old posts were deleted to maintain the 50-image limit.`
            })
          });
        } catch (err) {
          console.error("Failed to send cleanup notification:", err);
        }
      }

      await updateContent('galleryImages', newImages);
      toast.success(editingIndex !== null ? 'Image updated successfully' : 'Image uploaded successfully');
      setIsUploadModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save image');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (index: number, url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'Delete Image',
      message: 'Are you sure you want to delete this image from the gallery? This action cannot be undone.',
      onConfirm: async () => {
        try {
          if (url.includes('workers.dev')) {
            await deleteFromR2(url);
          }
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

  const allKeywords = Array.from(new Set(images.flatMap(img => img.keywords ? img.keywords.split(',').map(k => k.trim()) : []))).filter(Boolean).join(', ');
  const metaKeywords = `Hotel Shotabdi Abashik photos, Sylhet hotel gallery, room pictures Sylhet${allKeywords ? ', ' + allKeywords : ''}`;

  return (
    <div className="bg-white py-16 min-h-screen">
      <Helmet>
        <title>Gallery | Hotel Shotabdi Abashik</title>
        <meta name="description" content="View photos of Hotel Shotabdi Abashik. See our rooms, facilities, and the beautiful surroundings in Sylhet." />
        <meta name="keywords" content={metaKeywords} />
        <meta property="og:title" content="Gallery | Hotel Shotabdi Abashik" />
        <meta property="og:description" content="View photos of Hotel Shotabdi Abashik. See our rooms, facilities, and the beautiful surroundings in Sylhet." />
        <meta property="og:image" content={images[0]?.url || ''} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
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
            <button 
              onClick={() => handleOpenUploadModal(null)}
              className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors font-medium shadow-md"
            >
              <Upload className="w-5 h-5" />
              Upload New Image
            </button>
          </div>
        )}

        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 w-full">
          {images.map((img, index) => (
            <Link 
              key={img.id} 
              to={`/gallery/${img.id || index}`}
              className="relative overflow-hidden shadow-md hover:shadow-xl transition-all group cursor-pointer bg-white rounded-2xl break-inside-avoid mb-4 block"
            >
              <img src={img.url} alt={img.title || `Gallery ${index + 1}`} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
              
              {/* SEO Hidden Text */}
              <div className="sr-only">
                <h2>{img.title}</h2>
                <p>{img.description}</p>
                <p>{img.keywords}</p>
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                {img.title && <h3 className="text-white font-bold text-lg truncate">{img.title}</h3>}
                {img.description && <p className="text-slate-200 text-sm line-clamp-2 mt-1">{img.description}</p>}
                <div className="mt-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white">
                    <Search className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {editMode && (
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenUploadModal(index); }}
                    className="bg-white/90 text-blue-600 p-2 rounded-full hover:bg-white transform hover:scale-110 transition-all shadow-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(index, img.url, e); }}
                    className="bg-red-600/90 text-white p-2 rounded-full hover:bg-red-600 transform hover:scale-110 transition-all shadow-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Upload/Edit Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingIndex !== null ? 'Edit Image Details' : 'Upload New Image'}
              </h2>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSaveImage} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image File {editingIndex === null && '*'}</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500">
                        {formData.file ? formData.file.name : (editingIndex !== null ? 'Click to replace image (optional)' : 'Click to select image')}
                      </p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => setFormData({...formData, file: e.target.files?.[0] || null})}
                    />
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full border-slate-300 rounded-xl shadow-sm focus:border-red-500 focus:ring-red-500"
                  placeholder="e.g., Deluxe Room View"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border-slate-300 rounded-xl shadow-sm focus:border-red-500 focus:ring-red-500"
                  rows={3}
                  placeholder="Describe the image for visitors..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Keywords (SEO)</label>
                <input 
                  type="text" 
                  value={formData.keywords}
                  onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                  className="w-full border-slate-300 rounded-xl shadow-sm focus:border-red-500 focus:ring-red-500"
                  placeholder="e.g., hotel, sylhet, deluxe room, view"
                />
                <p className="text-xs text-slate-500 mt-1">Comma separated keywords for Google Search</p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-6 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={uploading || (editingIndex === null && !formData.file)}
                  className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {uploading ? 'Saving...' : 'Save Image'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
