import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
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
      const allRatings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const approvedRatings = allRatings.filter((r: any) => r.status === 'approved').slice(0, 10);
      setRatings(approvedRatings);
    } catch (error) {
      console.error("Error fetching ratings:", error);
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
        userName: profile?.name || user.displayName || 'Guest',
        userPhoto: profile?.photoURL || user.photoURL || '',
        rating: newRating,
        comment: newComment,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      setNewComment('');
      setNewRating(5);
      alert(t('আপনার রেটিং সফলভাবে জমা দেওয়া হয়েছে। অনুমোদনের পর এটি প্রদর্শিত হবে।', 'Your rating has been submitted successfully. It will be displayed after approval.'));
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
            <div className="grid grid-cols-3 gap-3 md:gap-6 mb-12">
              {ratings.length > 0 ? (
                ratings.map((rating) => (
                  <div key={rating.id} className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 mb-2 md:mb-4">
                      {rating.userPhoto ? (
                        <img src={rating.userPhoto} alt={rating.userName} className="w-8 h-8 md:w-12 md:h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
                          <User className="w-4 h-4 md:w-6 md:h-6" />
                        </div>
                      )}
                      <div className="min-w-0 w-full">
                        <h4 className="font-bold text-slate-900 text-xs md:text-base truncate">{rating.userName}</h4>
                        <div className="flex items-center gap-0.5 md:gap-1 mt-0.5 md:mt-1">
                          {renderStars(rating.rating)}
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-600 italic flex-grow text-xs md:text-base line-clamp-3 md:line-clamp-none">"{rating.comment}"</p>
                    <p className="text-[10px] md:text-xs text-slate-400 mt-2 md:mt-4 text-right">
                      {rating.createdAt?.toDate ? new Date(rating.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-8 text-slate-500">
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
