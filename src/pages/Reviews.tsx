import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { EditableText } from '../components/EditableText';
import { notifyAdminNewReview } from '../services/NotificationService';
import { Star, User, Loader2, Link as LinkIcon, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export const Reviews: React.FC = () => {
  const { t } = useLanguage();
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const itemsPerPage = 30;

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      const q = query(
        collection(db, 'ratings'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const allRatings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const approvedRatings = allRatings.filter((r: any) => r.status === 'approved');
      setRatings(approvedRatings);
    } catch (error) {
      console.error("Error fetching ratings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error(t('রেটিং দিতে লগইন করুন', 'Please login to submit a rating'));
      return;
    }

    if (!newComment.trim()) {
      toast.error(t('অনুগ্রহ করে একটি মন্তব্য লিখুন', 'Please write a comment'));
      return;
    }

    setSubmitting(true);
    try {
      const newDocRef = doc(collection(db, 'ratings'));
      const newId = newDocRef.id;
      await setDoc(newDocRef, {
        id: newId,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Guest User',
        userPhoto: auth.currentUser.photoURL || '',
        rating: newRating,
        comment: newComment.trim(),
        status: 'approved', // Auto-approve for now
        createdAt: serverTimestamp()
      });
      
      // Notify Admin
      notifyAdminNewReview({
        userName: auth.currentUser.displayName || 'Guest User',
        rating: newRating,
        comment: newComment.trim()
      }).catch(console.error);
      
      toast.success(t('আপনার রেটিং সফলভাবে জমা হয়েছে!', 'Your rating has been submitted successfully!'));
      setNewComment('');
      setNewRating(5);
      fetchRatings(); // Refresh the list
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error(t('রেটিং জমা দিতে সমস্যা হয়েছে।', 'Failed to submit rating.'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`}
      />
    ));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success(t('লিঙ্ক কপি করা হয়েছে', 'Link copied to clipboard'));
    setTimeout(() => setCopied(false), 2000);
  };

  // Pagination logic
  const totalPages = Math.ceil(ratings.length / itemsPerPage);
  const currentRatings = ratings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="pt-24 pb-16 min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            <EditableText contentKey="reviews_page_title" defaultText={t('অতিথিদের মতামত', 'Guest Reviews')} />
          </h1>
          <div className="w-24 h-1 bg-red-600 mx-auto rounded-full mb-6"></div>
          <p className="text-slate-600 max-w-2xl mx-auto">
            <EditableText contentKey="reviews_page_desc" defaultText={t('আমাদের সম্মানিত অতিথিদের অভিজ্ঞতা ও মতামত।', 'Experiences and reviews from our honorable guests.')} multiline />
          </p>
        </div>

        {/* Add Rating Form */}
        <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-md border border-slate-100 mb-16">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-slate-900">
              {t('আপনার অভিজ্ঞতা শেয়ার করুন', 'Share Your Experience')}
            </h3>
            <button 
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <LinkIcon className="w-4 h-4" />}
              {copied ? t('কপি হয়েছে', 'Copied') : t('লিঙ্ক কপি করুন', 'Copy Link')}
            </button>
          </div>
          
          {auth.currentUser ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 ${star <= newRating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`}
                    />
                  </button>
                ))}
              </div>
              <div>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t('আপনার মতামত লিখুন...', 'Write your review...')}
                  className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[120px] resize-none text-lg"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition-colors disabled:opacity-70 flex justify-center items-center"
              >
                {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : t('জমা দিন', 'Submit Review')}
              </button>
            </form>
          ) : (
            <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-600 mb-4 text-lg">{t('রেটিং দিতে আপনাকে লগইন করতে হবে।', 'You need to login to submit a rating.')}</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-red-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-12">
              {currentRatings.length > 0 ? (
                currentRatings.map((rating) => (
                  <div key={rating.id} className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
                    <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                      {rating.userPhoto ? (
                        <img src={rating.userPhoto} alt={rating.userName} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                          <User className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 text-sm md:text-base leading-tight break-words">{rating.userName}</h4>
                        <div className="flex items-center gap-1 mt-1">
                          {renderStars(rating.rating)}
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-600 italic flex-grow text-sm md:text-base line-clamp-4 md:line-clamp-none">"{rating.comment}"</p>
                    <p className="text-xs text-slate-400 mt-4 text-right">
                      {rating.createdAt?.toDate ? new Date(rating.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-12 text-slate-500 text-lg">
                  {t('এখনও কোনো রেটিং নেই। প্রথম রেটিং দিন!', 'No ratings yet. Be the first to rate!')}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                      currentPage === i + 1 
                        ? 'bg-red-600 text-white' 
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
