import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, MapPin, Bed, Utensils, Camera, Info, Shield, FileText, HelpCircle } from 'lucide-react';

export default function Sitemap() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [roomsSnap, contentSnap] = await Promise.all([
          getDocs(collection(db, 'rooms')),
          getDocs(collection(db, 'content'))
        ]);

        setRooms(roomsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        contentSnap.docs.forEach(doc => {
          if (doc.id === 'restaurants') {
            try {
              setRestaurants(JSON.parse(doc.data().data));
            } catch (e) {
              setRestaurants(doc.data().data || []);
            }
          }
          if (doc.id === 'tourDesk') {
            try {
              setTours(JSON.parse(doc.data().data));
            } catch (e) {
              setTours(doc.data().data || []);
            }
          }
        });
      } catch (error) {
        console.error('Error fetching sitemap data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const slugify = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Sitemap | Hotel Shotabdi Abashik</title>
        <meta name="description" content="Complete sitemap of Hotel Shotabdi Abashik website. Find all our rooms, restaurant items, tour spots, and more." />
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Link to="/" className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Website Sitemap</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Main Pages */}
            <section className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-red-600">
                <Info className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Main Pages</h2>
              </div>
              <ul className="space-y-2">
                <li><Link to="/" className="text-slate-600 hover:text-red-600 transition-colors">Home</Link></li>
                <li><Link to="/rooms" className="text-slate-600 hover:text-red-600 transition-colors">Our Rooms</Link></li>
                <li><Link to="/restaurant" className="text-slate-600 hover:text-red-600 transition-colors">Restaurant</Link></li>
                <li><Link to="/tour-desk" className="text-slate-600 hover:text-red-600 transition-colors">Tour Desk</Link></li>
                <li><Link to="/gallery" className="text-slate-600 hover:text-red-600 transition-colors">Gallery</Link></li>
                <li><Link to="/about" className="text-slate-600 hover:text-red-600 transition-colors">About Us</Link></li>
                <li><Link to="/help-desk" className="text-slate-600 hover:text-red-600 transition-colors">Help Desk</Link></li>
              </ul>
            </section>

            {/* Legal Pages */}
            <section className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-red-600">
                <Shield className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Legal & Support</h2>
              </div>
              <ul className="space-y-2">
                <li><Link to="/privacy-policy" className="text-slate-600 hover:text-red-600 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms-of-service" className="text-slate-600 hover:text-red-600 transition-colors">Terms of Service</Link></li>
                <li><Link to="/reviews" className="text-slate-600 hover:text-red-600 transition-colors">Guest Reviews</Link></li>
                <li><Link to="/profile" className="text-slate-600 hover:text-red-600 transition-colors">User Profile</Link></li>
              </ul>
            </section>

            {/* Rooms */}
            <section className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-red-600">
                <Bed className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Rooms</h2>
              </div>
              <ul className="space-y-2">
                {rooms.map(room => (
                  <li key={room.id}>
                    <Link to={`/rooms/${slugify(room.name)}`} className="text-slate-600 hover:text-red-600 transition-colors">
                      {room.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* Restaurant */}
            <section className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-red-600">
                <Utensils className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Restaurant Items</h2>
              </div>
              <ul className="space-y-2">
                {restaurants.map((rest, idx) => (
                  <li key={idx}>
                    <Link to={`/restaurant/${slugify(rest.name)}`} className="text-slate-600 hover:text-red-600 transition-colors">
                      {rest.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* Tours */}
            <section className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-red-600">
                <MapPin className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Tour Spots</h2>
              </div>
              <ul className="space-y-2">
                {tours.map((tour, idx) => (
                  <li key={idx}>
                    <Link to={`/tour-desk/${slugify(tour.name)}`} className="text-slate-600 hover:text-red-600 transition-colors">
                      {tour.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
