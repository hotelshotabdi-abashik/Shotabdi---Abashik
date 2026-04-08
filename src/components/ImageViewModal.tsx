import React from 'react';
import { X } from 'lucide-react';
import { useContent } from '../context/ContentContext';

interface ImageViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedImage: any;
}

export const ImageViewModal: React.FC<ImageViewModalProps> = ({ isOpen, onClose, selectedImage }) => {
  const { content } = useContent();

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !selectedImage) return null;

  const logoUrl = content.site_logo || 'https://pub-c0b44c83d9824fb19234fdfbbd92001e.r2.dev/logo/shotabdi%20logo.png';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-0 md:p-4" onClick={onClose}>
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-[110] p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
      
      <div 
        className="bg-white md:rounded-2xl overflow-hidden w-full h-[100dvh] md:h-auto md:max-h-[90vh] max-w-6xl flex flex-col md:flex-row shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image Section */}
        <div className="w-full md:w-2/3 bg-black flex items-center justify-center relative flex-1 md:flex-none md:min-h-[60vh]">
          <img 
            src={selectedImage.url} 
            alt={selectedImage.title || 'Gallery Image'} 
            className="max-w-full max-h-full object-contain"
            referrerPolicy="no-referrer"
            loading="eager" fetchPriority="high" decoding="async"
          />
        </div>
        
        {/* Details Section */}
        <div className="w-full md:w-1/3 bg-white flex flex-col h-[45dvh] md:h-auto md:max-h-[90vh] overflow-y-auto">
          <div className="p-4 md:p-6 border-b border-slate-100 flex items-center gap-4 shrink-0">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 leading-tight">Hotel Shotabdi Abashik</h3>
              <p className="text-xs text-slate-500">
                {selectedImage.createdAt ? new Date(selectedImage.createdAt).toLocaleDateString() : ''}
              </p>
            </div>
          </div>
          
          <div className="p-4 md:p-6 flex-1 overflow-y-auto">
            {selectedImage.title && (
              <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-2 md:mb-3">{selectedImage.title}</h2>
            )}
            {selectedImage.description ? (
              <p className="text-sm md:text-base text-slate-700 whitespace-pre-wrap leading-relaxed">
                {selectedImage.description}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">No description provided.</p>
            )}
            
            {selectedImage.keywords && (
              <div className="mt-4 md:mt-6 flex flex-wrap gap-2">
                {selectedImage.keywords.split(',').map((kw: string, i: number) => (
                  <span key={i} className="text-xs md:text-sm text-blue-600 bg-blue-50 px-2 md:px-3 py-1 rounded-full">
                    #{kw.trim().replace(/\s+/g, '')}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
