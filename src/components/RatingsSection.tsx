import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useContent } from '../context/ContentContext';
import { useAuth } from '../context/AuthContext';
import { EditableText } from './EditableText';
import { Star, User, Loader2, ArrowRight, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RatingsSection: React.FC = () => {
  const { t } = useLanguage();
  const { editMode } = useContent();
  const { user, profile, login } = useAuth();
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const demoReviews = [
    {
      id: 'demo-1',
      userName: 'Ariful Islam',
      userPhoto: 'https://i.pravatar.cc/150?u=ariful',
      rating: 5,
      comment: 'The hospitality was exceptional. The rooms were clean and the staff was very helpful. Highly recommended for families.',
      status: 'approved',
      createdAt: { toDate: () => new Date('2024-03-20') }
    },
    {
      id: 'demo-2',
      userName: 'Sumaiya Akter',
      userPhoto: 'https://i.pravatar.cc/150?u=sumaiya',
      rating: 5,
      comment: 'Great location near the bus terminal. Very convenient for travelers. The restaurant food was delicious too!',
      status: 'approved',
      createdAt: { toDate: () => new Date('2024-03-22') }
    },
    {
      id: 'demo-3',
      userName: 'Tanvir Ahmed',
      userPhoto: 'https://i.pravatar.cc/150?u=tanvir',
      rating: 4,
      comment: 'Affordable and comfortable. The AC was working perfectly. Good value for money in Sylhet.',
      status: 'approved',
      createdAt: { toDate: () => new Date('2024-03-25') }
    },
    {
      id: 'demo-4',
      userName: 'Nusrat Jahan',
      userPhoto: 'https://i.pravatar.cc/150?u=nusrat',
      rating: 5,
      comment: 'Safe and secure environment for solo female travelers. The management is very professional.',
      status: 'approved',
      createdAt: { toDate: () => new Date('2024-03-26') }
    },
    {
      id: 'demo-5',
      userName: 'Kamrul Hasan',
      userPhoto: 'https://i.pravatar.cc/150?u=kamrul',
      rating: 5,
      comment: 'Best residential hotel in this area. Clean bathrooms and fresh linens. Will definitely come back.',
      status: 'approved',
      createdAt: { toDate: () => new Date('2024-03-28') }
    }
  ];

  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      const q = query(
        collection(db, 'ratings'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const fetchedRatings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const approvedRatings = fetchedRatings.filter((r: any) => r.status === 'approved');
      
      // Combine with demo reviews if needed, or just use demo if empty
      if (approvedRatings.length === 0) {
        setRatings(demoReviews);
      } else {
        setRatings([...approvedRatings, ...demoReviews].slice(0, 10));
      }
    } catch (error) {
      console.error("Error fetching ratings:", error);
      setRatings(demoReviews); // Fallback to demo reviews on error
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      login();
      return;
    }
    
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'ratings'), {
        userId: user.uid,
        userName: profile?.displayName || profile?.legalName || user.displayName || 'Guest',
        userPhoto: profile?.photoURL || user.photoURL || '',
        rating: newRating,
        comment: newComment,
        status: 'approved',
        createdAt: serverTimestamp()
      });
      
      setNewComment('');
      setNewRating(5);
      fetchRatings();
      alert(t('আপনার রেটিং সফলভাবে জমা দেওয়া হয়েছে।', 'Your rating has been submitted successfully.'));
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert(t('রেটিং জমা দিতে সমস্যা হয়েছে।', 'Failed to submit rating.'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 md:w-4 md:h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`}
      />
    ));
  };

  const [isPaused, setIsPaused] = useState(false);

  return (
    <section id="ratings" className="py-16 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            <EditableText contentKey="home_ratings_title" defaultText={t('অতিথিদের মতামত', 'Guest Reviews')} />
          </h2>
          <div className="w-24 h-1 bg-red-600 mx-auto rounded-full mb-6"></div>
          <p className="text-slate-600 max-w-2xl mx-auto">
            <EditableText contentKey="home_ratings_desc" defaultText={t('আমাদের সম্মানিত অতিথিদের অভিজ্ঞতা ও মতামত।', 'Experiences and reviews from our honorable guests.')} multiline />
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {ratings.map((rating, index) => (
                <motion.div 
                  key={rating.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ 
                    duration: 0.5, 
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 100
                  }}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full transform transition-transform hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-4 mb-4">
                    {rating.userPhoto ? (
                      <img src={rating.userPhoto} alt={rating.userName} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-base truncate">{rating.userName}</h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        {renderStars(rating.rating)}
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-600 italic flex-grow text-base line-clamp-4">"{rating.comment}"</p>
                  <p className="text-xs text-slate-400 mt-4 text-right">
                    {rating.createdAt?.toDate ? new Date(rating.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                  </p>
                </motion.div>
              ))}
              {ratings.length === 0 && (
                <div className="col-span-full text-center py-8 text-slate-500">
                  {t('এখনও কোনো রেটিং নেই। প্রথম রেটিং দিন!', 'No ratings yet. Be the first to rate!')}
                </div>
              )}
            </div>

            <div className="flex justify-center mb-12">
              <Link 
                to="/reviews" 
                className="inline-flex items-center justify-center px-8 py-3 text-base font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                {t('সব রিভিউ দেখুন', 'See All Reviews')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 max-w-2xl mx-auto">
              <h3 className="text-xl font-bold text-slate-900 mb-6 text-center">
                {t('আপনার অভিজ্ঞতা শেয়ার করুন', 'Share Your Experience')}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('রেটিং দিন', 'Rate your stay')}
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= newRating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-slate-700 mb-2">
                    {t('মতামত', 'Comment')}
                  </label>
                  <textarea
                    id="comment"
                    rows={4}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
                    placeholder={t('আপনার অভিজ্ঞতা সম্পর্কে লিখুন...', 'Write about your experience...')}
                    required
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      {t('জমা দিন', 'Submit Review')}
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
