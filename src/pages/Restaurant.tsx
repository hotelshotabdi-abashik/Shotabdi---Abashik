import { useState, useEffect } from 'react';
import { Utensils, Coffee, Clock, MapPin, Navigation, Search, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useContent } from '../context/ContentContext';
import { useAuth } from '../context/AuthContext';
import { EditableText } from '../components/EditableText';
import { ImageUploader } from '../components/ImageUploader';
import { ConfirmModal } from '../components/ConfirmModal';
import { toast } from 'sonner';

const defaultRestaurants = [
  { name: 'Al-Modina Restaurant', location: 'Kumargaon Bus Stand', distance: '0.1 km', type: 'Local Bengali', imageUrl: 'https://picsum.photos/seed/almodina/400/300', mapUrl: '' },
  { name: 'Bismillah Hotel & Restaurant', location: 'Kumargaon', distance: '0.2 km', type: 'Local Bengali', imageUrl: 'https://picsum.photos/seed/bismillah/400/300', mapUrl: '' },
  { name: 'SUST Food Court', location: 'SUST Campus', distance: '1.5 km', type: 'Snacks / Fast Food', imageUrl: 'https://picsum.photos/seed/sust/400/300', mapUrl: '' },
  { name: 'Cafe SUST', location: 'SUST Campus', distance: '1.5 km', type: 'Cafe', imageUrl: 'https://picsum.photos/seed/cafesust/400/300', mapUrl: '' },
  { name: 'Royal Chef', location: 'Subidbazar', distance: '3.5 km', type: 'Multi-cuisine', imageUrl: 'https://picsum.photos/seed/royalchef/400/300', mapUrl: '' },
  { name: 'Exotica Restaurant', location: 'Subidbazar', distance: '3.5 km', type: 'Multi-cuisine', imageUrl: 'https://picsum.photos/seed/exotica/400/300', mapUrl: '' },
  { name: 'Bhai Bhai Restaurant', location: 'Amberkhana', distance: '4.0 km', type: 'Bengali', imageUrl: 'https://picsum.photos/seed/bhaibhai/400/300', mapUrl: '' },
  { name: 'Arabian Fast Food', location: 'Amberkhana', distance: '4.2 km', type: 'Arabian / Fast Food', imageUrl: 'https://picsum.photos/seed/arabian/400/300', mapUrl: '' },
  { name: 'Kazi Asparagus Food Island', location: 'Chouhatta', distance: '4.5 km', type: 'Multi-cuisine', imageUrl: 'https://picsum.photos/seed/kazi/400/300', mapUrl: '' },
  { name: 'Nawabi Voj', location: 'Zindabazar', distance: '5.4 km', type: 'Biryani / Traditional', imageUrl: 'https://picsum.photos/seed/nawabi/400/300', mapUrl: '' },
  { name: 'Panshi Restaurant', location: 'Zindabazar', distance: '5.5 km', type: 'Bengali / Traditional', imageUrl: 'https://picsum.photos/seed/panshi/400/300', mapUrl: '' },
  { name: 'Pach Bhai Restaurant', location: 'Zindabazar', distance: '5.5 km', type: 'Bengali / Traditional', imageUrl: 'https://picsum.photos/seed/pachbhai/400/300', mapUrl: '' },
  { name: 'Kacchi Bhai', location: 'Zindabazar', distance: '5.5 km', type: 'Biryani', imageUrl: 'https://picsum.photos/seed/kacchi/400/300', mapUrl: '' },
  { name: 'Sultan\'s Dine', location: 'Zindabazar', distance: '5.5 km', type: 'Biryani', imageUrl: 'https://picsum.photos/seed/sultans/400/300', mapUrl: '' },
  { name: 'Palki Restaurant', location: 'Zindabazar', distance: '5.5 km', type: 'Bengali / Multi-cuisine', imageUrl: 'https://picsum.photos/seed/palki/400/300', mapUrl: '' },
  { name: 'BFC', location: 'Zindabazar', distance: '5.5 km', type: 'Fast Food', imageUrl: 'https://picsum.photos/seed/bfc/400/300', mapUrl: '' },
  { name: 'The Dining Room', location: 'Zindabazar', distance: '5.5 km', type: 'Multi-cuisine', imageUrl: 'https://picsum.photos/seed/dining/400/300', mapUrl: '' },
  { name: 'Spicy Restaurant', location: 'Zindabazar', distance: '5.6 km', type: 'Multi-cuisine', imageUrl: 'https://picsum.photos/seed/spicy/400/300', mapUrl: '' },
  { name: 'KFC Sylhet', location: 'Zindabazar', distance: '5.6 km', type: 'Fast Food', imageUrl: 'https://picsum.photos/seed/kfc/400/300', mapUrl: '' },
  { name: 'Pizza Hut Sylhet', location: 'Zindabazar', distance: '5.6 km', type: 'Pizza / Fast Food', imageUrl: 'https://picsum.photos/seed/pizzahut/400/300', mapUrl: '' },
  { name: 'Takeout', location: 'Zindabazar', distance: '5.6 km', type: 'Burgers', imageUrl: 'https://picsum.photos/seed/takeout/400/300', mapUrl: '' },
  { name: 'Eatopia', location: 'Zindabazar', distance: '5.7 km', type: 'Multi-cuisine', imageUrl: 'https://picsum.photos/seed/eatopia/400/300', mapUrl: '' },
  { name: 'Secret Recipe', location: 'Zindabazar', distance: '5.7 km', type: 'Dessert / Cafe', imageUrl: 'https://picsum.photos/seed/secretrecipe/400/300', mapUrl: '' },
  { name: 'Chillox', location: 'Zindabazar', distance: '5.7 km', type: 'Burgers', imageUrl: 'https://picsum.photos/seed/chillox/400/300', mapUrl: '' },
  { name: 'Woondaal King Kabab', location: 'Zindabazar', distance: '5.8 km', type: 'Indian / Kebab', imageUrl: 'https://picsum.photos/seed/woondaal/400/300', mapUrl: '' },
  { name: 'Platinum Lounge', location: 'Zindabazar', distance: '5.8 km', type: 'Cafe / Multi-cuisine', imageUrl: 'https://picsum.photos/seed/platinum/400/300', mapUrl: '' },
  { name: 'Cafe La Vista', location: 'Zindabazar', distance: '5.8 km', type: 'Cafe / Rooftop', imageUrl: 'https://picsum.photos/seed/lavista/400/300', mapUrl: '' },
  { name: 'The Mad Grill', location: 'Nayasarak', distance: '6.0 km', type: 'Fast Food / Grill', imageUrl: 'https://picsum.photos/seed/madgrill/400/300', mapUrl: '' },
  { name: 'Cheez', location: 'Nayasarak', distance: '6.0 km', type: 'Fast Food', imageUrl: 'https://picsum.photos/seed/cheez/400/300', mapUrl: '' },
  { name: 'Artisti Cafe', location: 'Nayasarak', distance: '6.1 km', type: 'Cafe / Multi-cuisine', imageUrl: 'https://picsum.photos/seed/artisti/400/300', mapUrl: '' },
];

export default function Restaurant() {
  const { t } = useLanguage();
  const { content, editMode, addToList, removeFromList, updateListItem, updateContent } = useContent();
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [restaurants, setRestaurants] = useState<any[]>(defaultRestaurants);
  
  useEffect(() => {
    if (content.restaurants && content.restaurants.length > 0) {
      setRestaurants(content.restaurants);
      if (profile?.role === 'admin' && !localStorage.getItem('restaurantsRestored_v2')) {
        console.log("Forcing restore of restaurants...");
        updateContent('restaurants', defaultRestaurants).catch(console.error);
        localStorage.setItem('restaurantsRestored_v2', 'true');
      }
    } else {
      setRestaurants(defaultRestaurants);
      if (profile?.role === 'admin') {
        console.log("Restaurants empty. Auto-seeding...");
        updateContent('restaurants', defaultRestaurants).catch(console.error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.restaurants, profile?.role]);

  const handleRestoreDefaults = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Restore Default Restaurants',
      message: 'Are you sure you want to restore the default restaurant list? This will overwrite your current list.',
      onConfirm: async () => {
        try {
          await updateContent('restaurants', defaultRestaurants);
          toast.success('Default restaurants restored successfully');
        } catch (error) {
          console.error('Error restoring defaults:', error);
          toast.error('Failed to restore defaults');
        }
      }
    });
  };

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', location: '', distance: '', type: '', mapUrl: '', imageUrl: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const filteredRestaurants = restaurants.filter(res => 
    res && res.name && (
      res.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (res.location && res.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (res.type && res.type.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  const getDirectionsUrl = (restaurant: any) => {
    if (restaurant.mapUrl) return restaurant.mapUrl;
    return `https://www.google.com/maps/dir/Kumargaon+Bus+Stand,+Sylhet/${encodeURIComponent(restaurant.name + ', Sylhet')}`;
  };

  const handleRemove = (index: number, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Restaurant',
      message: `Are you sure you want to delete "${name}" from the Restaurant page? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await removeFromList('restaurants', index);
          toast.success('Restaurant removed successfully');
        } catch (error) {
          toast.error('Failed to remove restaurant');
        }
      }
    });
  };

  const handleEdit = (index: number, restaurant: any) => {
    setEditingIndex(index);
    setEditForm({ ...restaurant });
  };

  const handleSaveEdit = async () => {
    if (editingIndex !== null) {
      await updateListItem('restaurants', editingIndex, editForm);
      setEditingIndex(null);
    }
  };

  const handleSaveAdd = async () => {
    await addToList('restaurants', editForm);
    setIsAdding(false);
    setEditForm({ name: '', location: '', distance: '', type: '', mapUrl: '', imageUrl: '' });
  };

  return (
    <div className="bg-slate-50 py-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Nearby Restaurants List */}
        <div>
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-2xl font-bold text-slate-900">
              {t(`সিলেটের জনপ্রিয় ${restaurants.length}টি রেস্টুরেন্ট`, `Top ${restaurants.length} Popular Restaurants in Sylhet`)}
            </h2>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder={t("রেস্টুরেন্ট খুঁজুন...", "Search restaurants...")}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {editMode && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsAdding(true);
                      setEditForm({ name: '', location: '', distance: '', type: '', mapUrl: '', imageUrl: '' });
                    }}
                    className="bg-green-600 text-white p-2 rounded-xl hover:bg-green-700 transition-colors flex-shrink-0"
                    title="Add Restaurant"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleRestoreDefaults}
                    className="bg-amber-500 text-white p-2 rounded-xl hover:bg-amber-600 transition-colors flex-shrink-0 text-sm font-bold px-4"
                  >
                    Restore Defaults
                  </button>
                </div>
              )}
            </div>
          </div>

          {(isAdding || editingIndex !== null) && editMode && (
            <div className="bg-white p-6 rounded-2xl shadow-md border border-red-200 mb-8">
              <h3 className="text-lg font-bold mb-4">{isAdding ? 'Add New Restaurant' : 'Edit Restaurant'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input type="text" placeholder="Name" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="border p-2 rounded" />
                <input type="text" placeholder="Location" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} className="border p-2 rounded" />
                <input type="text" placeholder="Distance (e.g. 5.5 km)" value={editForm.distance} onChange={e => setEditForm({...editForm, distance: e.target.value})} className="border p-2 rounded" />
                <input type="text" placeholder="Type (e.g. Bengali / Traditional)" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})} className="border p-2 rounded" />
                <input type="text" placeholder="Google Maps URL (Optional)" value={editForm.mapUrl || ''} onChange={e => setEditForm({...editForm, mapUrl: e.target.value})} className="border p-2 rounded" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Restaurant Image</label>
                <ImageUploader
                  value={editForm.imageUrl || ''}
                  onChange={(url) => setEditForm({ ...editForm, imageUrl: url })}
                  folder="shotabdi-abashik/restaurants"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setIsAdding(false); setEditingIndex(null); }} className="bg-slate-200 px-4 py-2 rounded hover:bg-slate-300">Cancel</button>
                <button onClick={isAdding ? handleSaveAdd : handleSaveEdit} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Save</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((restaurant, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col h-full relative group overflow-hidden">
                {editMode && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={() => handleEdit(index, restaurant)} className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleRemove(index, restaurant.name)} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
                {restaurant.imageUrl && (
                  <div className="h-48 w-full relative">
                    <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
                <div className="p-6 flex-grow flex flex-col">
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-2 pr-12">
                      <h3 className="text-lg font-bold text-slate-900">{restaurant.name}</h3>
                      <span className="bg-red-50 text-red-700 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ml-2">
                        {restaurant.distance}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">{restaurant.type}</p>
                    <div className="flex items-center text-slate-600 text-sm mb-6">
                      <MapPin className="w-4 h-4 mr-1 text-slate-400" />
                      {restaurant.location}
                    </div>
                  </div>
                  <a 
                    href={getDirectionsUrl(restaurant)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 font-medium py-2 px-4 rounded-xl transition-colors flex items-center justify-center text-sm"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    {t('ম্যাপে ডিরেকশন দেখুন', 'View Directions on Map')}
                  </a>
                </div>
              </div>
            ))}
            {filteredRestaurants.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500">
                {t('কোনো রেস্টুরেন্ট পাওয়া যায়নি।', 'No restaurants found.')}
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
