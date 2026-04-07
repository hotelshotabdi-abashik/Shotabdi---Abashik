import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Map, Compass, Car, MapPin, Navigation, Search, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useContent } from '../context/ContentContext';
import { useAuth } from '../context/AuthContext';
import { EditableText } from '../components/EditableText';
import { ImageUploader } from '../components/ImageUploader';
import { ConfirmModal } from '../components/ConfirmModal';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

const defaultTourSpots = [
  { id: '1', name: 'SUST Campus & Shahid Minar', location: 'Kumargaon', distance: '1.5 km', type: 'University / Monument', imageUrl: 'https://picsum.photos/seed/sust/400/300', mapUrl: '' },
  { id: '2', name: 'Hazrat Shahjalal Mazar Sharif', location: 'Dargah Mahalla', distance: '6.0 km', type: 'Religious / Historical', imageUrl: 'https://picsum.photos/seed/shahjalal/400/300', mapUrl: '' },
  { id: '3', name: 'Hazrat Shah Paran Mazar Sharif', location: 'Khadim Nagar', distance: '13.0 km', type: 'Religious / Historical', imageUrl: 'https://picsum.photos/seed/shahparan/400/300', mapUrl: '' },
  { id: '4', name: 'Ali Amjad\'s Clock & Keane Bridge', location: 'Surma River', distance: '6.5 km', type: 'Historical Landmark', imageUrl: 'https://picsum.photos/seed/keane/400/300', mapUrl: '' },
  { id: '5', name: 'Sylhet Shahi Eidgah', location: 'Shahi Eidgah', distance: '7.5 km', type: 'Historical / Religious', imageUrl: 'https://picsum.photos/seed/eidgah/400/300', mapUrl: '' },
  { id: '6', name: 'Malnicherra Tea Estate', location: 'Airport Road', distance: '8.5 km', type: 'Nature / Tea Garden', imageUrl: 'https://picsum.photos/seed/malnicherra/400/300', mapUrl: '' },
  { id: '7', name: 'Lakkatura Tea Garden', location: 'Airport Road', distance: '8.0 km', type: 'Nature / Tea Garden', imageUrl: 'https://picsum.photos/seed/lakkatura/400/300', mapUrl: '' },
  { id: '8', name: 'Osmani Museum', location: 'Kotwali', distance: '5.5 km', type: 'Museum', imageUrl: 'https://picsum.photos/seed/osmani/400/300', mapUrl: '' },
  { id: '9', name: 'Adventure World Amusement Park', location: 'Airport Road', distance: '9.5 km', type: 'Amusement Park', imageUrl: 'https://picsum.photos/seed/adventure/400/300', mapUrl: '' },
  { id: '10', name: 'Khadimnagar National Park', location: 'Khadimnagar', distance: '16.0 km', type: 'National Park / Forest', imageUrl: 'https://picsum.photos/seed/khadimnagar/400/300', mapUrl: '' },
  { id: '11', name: 'Ratargul Swamp Forest', location: 'Gowainghat', distance: '22.0 km', type: 'Swamp Forest', imageUrl: 'https://picsum.photos/seed/ratargul/400/300', mapUrl: '' },
  { id: '12', name: 'Sada Pathor, Bholaganj', location: 'Companiganj', distance: '33.0 km', type: 'River / White Stones', imageUrl: 'https://picsum.photos/seed/sadapathor/400/300', mapUrl: '' },
  { id: '13', name: 'Bisanakandi', location: 'Gowainghat', distance: '36.0 km', type: 'River / Hills / Stones', imageUrl: 'https://picsum.photos/seed/bisanakandi/400/300', mapUrl: '' },
  { id: '14', name: 'Panthumai Waterfall', location: 'Gowainghat', distance: '42.0 km', type: 'Waterfall', imageUrl: 'https://picsum.photos/seed/panthumai/400/300', mapUrl: '' },
  { id: '15', name: 'Dibir Haor (Red Water Lily)', location: 'Jaintiapur', distance: '45.0 km', type: 'Wetland / Nature', imageUrl: 'https://picsum.photos/seed/dibir/400/300', mapUrl: '' },
  { id: '16', name: 'Lalakhal', location: 'Jaintiapur', distance: '48.0 km', type: 'Blue River / Nature', imageUrl: 'https://picsum.photos/seed/lalakhal/400/300', mapUrl: '' },
  { id: '17', name: 'Jaflong', location: 'Gowainghat', distance: '58.0 km', type: 'River / Hills / Stones', imageUrl: 'https://picsum.photos/seed/jaflong/400/300', mapUrl: '' },
  { id: '18', name: 'Sangrampunji Waterfall', location: 'Jaflong', distance: '59.0 km', type: 'Waterfall', imageUrl: 'https://picsum.photos/seed/sangrampunji/400/300', mapUrl: '' },
  { id: '19', name: 'Lovachora', location: 'Kanaighat', distance: '65.0 km', type: 'River / Tea Estate', imageUrl: 'https://picsum.photos/seed/lovachora/400/300', mapUrl: '' },
  { id: '20', name: 'Dreamland Amusement Park', location: 'Golapganj', distance: '16.0 km', type: 'Amusement Park', imageUrl: 'https://picsum.photos/seed/dreamland/400/300', mapUrl: '' },
  { id: '21', name: 'Tamabil Zero Point', location: 'Gowainghat', distance: '56.0 km', type: 'Border / Landmark', imageUrl: 'https://picsum.photos/seed/tamabil/400/300', mapUrl: '' },
  { id: '22', name: 'Khasia Punji', location: 'Jaflong', distance: '59.0 km', type: 'Cultural / Village', imageUrl: 'https://picsum.photos/seed/khasia/400/300', mapUrl: '' },
  { id: '23', name: 'Sreemangal Tea Gardens', location: 'Sreemangal', distance: '75.0 km', type: 'Nature / Tea Estate', imageUrl: 'https://picsum.photos/seed/sreemangal/400/300', mapUrl: '' },
  { id: '24', name: 'Lawachara National Park', location: 'Kamalganj', distance: '80.0 km', type: 'National Park / Forest', imageUrl: 'https://picsum.photos/seed/lawachara/400/300', mapUrl: '' },
  { id: '25', name: 'Madhabpur Lake', location: 'Kamalganj', distance: '85.0 km', type: 'Lake / Nature', imageUrl: 'https://picsum.photos/seed/madhabpur/400/300', mapUrl: '' },
  { id: '26', name: 'Hum Hum Waterfall', location: 'Kamalganj', distance: '95.0 km', type: 'Waterfall / Trekking', imageUrl: 'https://picsum.photos/seed/humhum/400/300', mapUrl: '' },
  { id: '27', name: 'Baikka Beel', location: 'Sreemangal', distance: '80.0 km', type: 'Wetland / Bird Watching', imageUrl: 'https://picsum.photos/seed/baikka/400/300', mapUrl: '' },
  { id: '28', name: 'Tanguar Haor', location: 'Sunamganj', distance: '85.0 km', type: 'Wetland / Nature', imageUrl: 'https://picsum.photos/seed/tanguar/400/300', mapUrl: '' },
  { id: '29', name: 'Jadukata River', location: 'Taharpur', distance: '90.0 km', type: 'River / Scenic', imageUrl: 'https://picsum.photos/seed/jadukata/400/300', mapUrl: '' },
  { id: '30', name: 'Shimul Bagan', location: 'Taharpur', distance: '92.0 km', type: 'Garden / Nature', imageUrl: 'https://picsum.photos/seed/shimul/400/300', mapUrl: '' },
];

export default function TourDesk() {
  const { t } = useLanguage();
  const { content, editMode, addToList, removeFromList, updateListItem, updateContent } = useContent();
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', location: '', distance: '', type: '', mapUrl: '', imageUrl: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    // Removed auto-seeding logic to prevent data reset
  }, [content.tourSpots]);

  const tourSpots = content.tourSpots && content.tourSpots.length > 0 ? content.tourSpots : defaultTourSpots;

  const handleRestoreDefaults = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Restore Default Tour Spots',
      message: 'Are you sure you want to restore the default tour spots list? This will overwrite your current list.',
      onConfirm: async () => {
        try {
          await updateContent('tourSpots', defaultTourSpots);
          toast.success('Default tour spots restored successfully');
        } catch (error) {
          console.error('Error restoring defaults:', error);
          toast.error('Failed to restore defaults');
        }
      }
    });
  };

  const filteredSpots = tourSpots.filter((spot: any) => 
    spot && spot.name && (
      spot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (spot.location && spot.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (spot.type && spot.type.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  const getDirectionsUrl = (spot: any) => {
    if (spot.mapUrl) return spot.mapUrl;
    return `https://www.google.com/maps/dir/Kumargaon+Bus+Stand,+Sylhet/${encodeURIComponent(spot.name + ', Sylhet')}`;
  };

  const handleAdd = async () => {
    try {
      await addToList('tourSpots', {
        name: 'New Tour Spot',
        location: 'Location',
        distance: '0 km',
        type: 'Type',
        mapUrl: '',
        imageUrl: ''
      });
      toast.success('Tour spot added successfully');
      setIsAdding(false);
    } catch (error) {
      toast.error('Failed to add tour spot');
    }
  };

  const handleRemove = async (index: number, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Tour Spot',
      message: `Are you sure you want to delete "${name}" from the Tour Desk? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await removeFromList('tourSpots', index);
          toast.success('Tour spot removed successfully');
        } catch (error) {
          toast.error('Failed to remove tour spot');
        }
      }
    });
  };

  const startEditing = (index: number, spot: any) => {
    setEditingId(index.toString());
    setEditForm({
      name: spot.name || '',
      location: spot.location || '',
      distance: spot.distance || '',
      type: spot.type || '',
      mapUrl: spot.mapUrl || '',
      imageUrl: spot.imageUrl || ''
    });
  };

  const handleSave = async (index: number) => {
    try {
      await updateListItem('tourSpots', index, editForm);
      setEditingId(null);
      toast.success('Tour spot updated successfully');
    } catch (error) {
      toast.error('Failed to update tour spot');
    }
  };

  return (
    <div className="bg-slate-50 py-16 min-h-screen">
      <Helmet>
        <title>Tour Desk & Attractions | Hotel Shotabdi Abashik</title>
        <meta name="description" content="Explore top tourist spots in Sylhet with our Tour Desk. Visit SUST Campus, Hazrat Shahjalal Mazar, Ratargul, Jaflong and more." />
        <meta name="keywords" content="Sylhet tourist spots, Tour desk Sylhet, Jaflong, Ratargul, SUST, Sylhet attractions" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${window.location.origin}/tourdesk`} />
        
        <meta property="og:title" content="Tour Desk & Attractions | Hotel Shotabdi Abashik" />
        <meta property="og:description" content="Explore top tourist spots in Sylhet with our Tour Desk. Visit SUST Campus, Hazrat Shahjalal Mazar, Ratargul, Jaflong and more." />
        <meta property="og:url" content={`${window.location.origin}/tourdesk`} />
        <meta property="og:type" content="website" />

        {/* Structured Data for Tourist Attractions */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": tourSpots.slice(0, 10).map((spot, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "TouristAttraction",
                "name": spot.name,
                "description": spot.description,
                "image": spot.imageUrl,
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": "Sylhet"
                }
              }
            }))
          })}
        </script>
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tourist Spots List */}
        <div>
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-2xl font-bold text-slate-900">
              {t(`সিলেটের শীর্ষ ${tourSpots.length}টি দর্শনীয় স্থান`, `Top ${tourSpots.length} Tourist Spots in Sylhet`)}
            </h2>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder={t("স্থান খুঁজুন...", "Search spots...")}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {editMode && (
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Add Spot
                  </button>
                  <button
                    onClick={handleRestoreDefaults}
                    className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors whitespace-nowrap text-sm font-bold"
                  >
                    Restore Defaults
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredSpots.map((spot: any, index: number) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col h-full relative group overflow-hidden">
                {editMode && editingId !== index.toString() && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                    <button
                      onClick={() => startEditing(index, spot)}
                      className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemove(index, spot.name)}
                      className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {editingId === index.toString() ? (
                  <div className="flex-grow space-y-3 p-6">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full p-2 border rounded font-bold"
                      placeholder="Spot Name"
                    />
                    <input
                      type="text"
                      value={editForm.distance}
                      onChange={(e) => setEditForm({ ...editForm, distance: e.target.value })}
                      className="w-full p-2 border rounded text-sm"
                      placeholder="Distance (e.g., 1.5 km)"
                    />
                    <input
                      type="text"
                      value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                      className="w-full p-2 border rounded text-sm"
                      placeholder="Type (e.g., Nature / Tea Garden)"
                    />
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="w-full p-2 border rounded text-sm"
                      placeholder="Location"
                    />
                    <input
                      type="text"
                      value={editForm.mapUrl}
                      onChange={(e) => setEditForm({ ...editForm, mapUrl: e.target.value })}
                      className="w-full p-2 border rounded text-sm"
                      placeholder="Google Maps URL (Optional)"
                    />
                    <div className="w-full">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Spot Image</label>
                      <ImageUploader
                        value={editForm.imageUrl || ''}
                        onChange={(url) => setEditForm({ ...editForm, imageUrl: url })}
                        folder="shotabdi-abashik/tourdesk"
                      />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleSave(index)}
                        className="flex-1 bg-green-600 text-white py-2 rounded flex items-center justify-center gap-2 hover:bg-green-700"
                      >
                        <Save className="w-4 h-4" /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 bg-slate-200 text-slate-700 py-2 rounded flex items-center justify-center gap-2 hover:bg-slate-300"
                      >
                        <X className="w-4 h-4" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {spot.imageUrl && (
                      <div className="h-24 sm:h-48 w-full relative">
                        <img src={spot.imageUrl} alt={spot.name} title={spot.description || spot.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="eager" fetchPriority="high" decoding="async" />
                      </div>
                    )}
                    <div className="p-3 sm:p-6 flex-grow flex flex-col">
                      <Link to={`/tour-desk/${spot.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}`} className="flex-grow block group-hover:text-red-600 transition-colors">
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-1 sm:mb-2">
                          <h3 className="text-xs sm:text-lg font-bold text-slate-900 pr-1 sm:pr-8 leading-tight w-full group-hover:text-red-600 transition-colors">{spot.name}</h3>
                          <span className="bg-red-50 text-red-700 text-[8px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap mt-1 sm:mt-0 sm:ml-2">
                            {spot.distance}
                          </span>
                        </div>
                        <p className="text-[9px] sm:text-sm text-slate-500 mb-2 sm:mb-4">{spot.type}</p>
                        <div className="flex items-center text-slate-600 text-[9px] sm:text-sm mb-3 sm:mb-6">
                          <MapPin className="w-2.5 h-2.5 sm:w-4 sm:h-4 mr-1 text-slate-400 flex-shrink-0" />
                          <span>{spot.location}</span>
                        </div>
                      </Link>
                      <a 
                        href={getDirectionsUrl(spot)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 font-medium py-1.5 sm:py-2 px-2 sm:px-4 rounded-lg sm:rounded-xl transition-colors flex items-center justify-center text-[10px] sm:text-sm mt-auto"
                      >
                        <Navigation className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        {t('ম্যাপে ডিরেকশন', 'View Directions')}
                      </a>
                    </div>
                  </>
                )}
              </div>
            ))}
            {filteredSpots.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500">
                {t('কোনো স্থান পাওয়া যায়নি।', 'No spots found.')}
              </div>
            )}
          </div>
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
