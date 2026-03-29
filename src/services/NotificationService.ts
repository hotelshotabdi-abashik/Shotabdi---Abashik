import { collection, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  type?: string;
  metadata?: any;
}

const logEmail = async (params: EmailParams, status: 'sent' | 'failed', error?: string) => {
  try {
    await addDoc(collection(db, 'emailLogs'), {
      to: params.to,
      subject: params.subject,
      type: params.type || 'general',
      status,
      error: error || null,
      sentAt: serverTimestamp(),
      metadata: params.metadata || {}
    });
  } catch (err) {
    console.error("Error logging email:", err);
  }
};

const getLogoUrl = async () => {
  try {
    const docRef = doc(db, 'settings', 'general');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().logoUrl;
    }
  } catch (error) {
    console.error("Error fetching logo for email:", error);
  }
  return 'https://pub-c0b44c83d9824fb19234fdfbbd92001e.r2.dev/logo/shotabdi%20logo.png'; // Fallback
};

const wrapEmail = (html: string, logoUrl: string) => `
  <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
    <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-bottom: 1px solid #e2e8f0;">
      <img src="${logoUrl}" alt="Hotel Shotabdi Abashik" style="max-height: 80px; width: auto;" />
    </div>
    <div style="padding: 40px; color: #1e293b; line-height: 1.6;">
      ${html}
    </div>
    <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e293b;">Hotel Shotabdi Abashik</p>
      <p style="margin: 0 0 5px 0;">Sylhet, Bangladesh</p>
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} All rights reserved.</p>
    </div>
  </div>
`;

export const sendEmail = async (params: EmailParams) => {
  try {
    const logoUrl = await getLogoUrl();
    const finalHtml = wrapEmail(params.html, logoUrl);
    
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...params, html: finalHtml }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      await logEmail(params, 'failed', errorData.error || 'Failed to send email');
      throw new Error('Failed to send email');
    }

    const result = await response.json();
    await logEmail(params, 'sent');
    return result;
  } catch (error) {
    console.error('Error in sendEmail:', error);
    await logEmail(params, 'failed', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const notifyLogin = async (email: string, name: string) => {
  return sendEmail({
    to: email,
    subject: 'Login Notification - Hotel Shotabdi Abashik',
    type: 'login',
    metadata: { name },
    html: `
      <h2 style="color: #dc2626; margin-top: 0;">Welcome back, ${name}!</h2>
      <p>You have successfully logged into your account at Hotel Shotabdi Abashik.</p>
      <p>If this wasn't you, please contact us immediately to secure your account.</p>
      <div style="margin-top: 30px;">
        <a href="https://shotabdi-abashik.bd" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Visit Website</a>
      </div>
    `,
  });
};

export const notifyBookingSubmitted = async (email: string, name: string, roomName: string, totalAmount: number) => {
  return sendEmail({
    to: email,
    subject: 'Booking Received - Hotel Shotabdi Abashik',
    type: 'booking_submitted',
    metadata: { name, roomName, totalAmount },
    html: `
      <h2 style="color: #dc2626; margin-top: 0;">Booking Received!</h2>
      <p>Hello ${name},</p>
      <p>We have received your booking request for <strong>${roomName}</strong>.</p>
      <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0;">Total Amount: <strong style="color: #dc2626; font-size: 18px;">৳${totalAmount}</strong></p>
      </div>
      <p>Our team will review your booking and contact you shortly for confirmation.</p>
      <p>Thank you for choosing Hotel Shotabdi Abashik.</p>
    `,
  });
};

export const notifyBookingStatus = async (email: string, name: string, roomName: string, status: string) => {
  const statusText = status === 'accepted' ? 'Accepted' : 'Rejected';
  const color = status === 'accepted' ? '#16a34a' : '#dc2626';
  
  return sendEmail({
    to: email,
    subject: `Booking ${statusText} - Hotel Shotabdi Abashik`,
    type: 'booking_status',
    metadata: { name, roomName, status },
    html: `
      <h2 style="color: ${color}; margin-top: 0;">Booking ${statusText}</h2>
      <p>Hello ${name},</p>
      <p>Your booking for <strong>${roomName}</strong> has been <strong>${statusText.toLowerCase()}</strong>.</p>
      ${status === 'accepted' ? `
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
          <p style="margin: 0; color: #166534;">We look forward to seeing you! Please have your ID ready at check-in.</p>
        </div>
      ` : `
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #fecaca;">
          <p style="margin: 0; color: #991b1b;">We are sorry we could not accommodate your request at this time. Please try booking for different dates.</p>
        </div>
      `}
      <div style="margin-top: 30px;">
        <a href="https://shotabdi-abashik.bd/my-stays" style="background-color: #1e293b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View My Stays</a>
      </div>
    `,
  });
};

export const notifyExclusiveOffer = async (email: string, title: string, description: string, imageUrl?: string, discountPrice?: string) => {
  return sendEmail({
    to: email,
    subject: `Exclusive Offer: ${title}`,
    type: 'exclusive_offer',
    metadata: { title, discountPrice },
    html: `
      <h2 style="color: #dc2626; margin-top: 0;">${title}</h2>
      ${imageUrl ? `<img src="${imageUrl}" alt="${title}" style="width: 100%; height: auto; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0;" />` : ''}
      <p style="font-size: 16px; color: #475569;">${description}</p>
      ${discountPrice ? `
        <div style="margin: 25px 0; text-align: center;">
          <span style="font-size: 14px; color: #94a3b8; text-decoration: line-through; display: block;">Special Price</span>
          <span style="font-size: 32px; font-bold: bold; color: #dc2626;">৳${discountPrice}</span>
        </div>
      ` : ''}
      <div style="margin-top: 30px; text-align: center;">
        <a href="https://shotabdi-abashik.bd/rooms" style="background-color: #dc2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; font-size: 16px;">Book Now & Save</a>
      </div>
      <p style="margin-top: 20px; font-size: 14px; color: #64748b; text-align: center;">* Limited time offer. Terms and conditions apply.</p>
    `,
  });
};

const ADMIN_EMAIL = 'hotelshotabdiabashik@gmail.com';

export const notifyAdminNewBooking = async (bookingData: any) => {
  return sendEmail({
    to: ADMIN_EMAIL,
    subject: 'New Booking Received - Action Required',
    type: 'admin_alert',
    metadata: { bookingId: bookingData.id },
    html: `
      <h2 style="color: #dc2626; margin-top: 0;">New Booking Alert!</h2>
      <p>A new booking has been submitted on the website.</p>
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
        <p style="margin: 5px 0;"><strong>Guest:</strong> ${bookingData.userName} (${bookingData.userEmail})</p>
        <p style="margin: 5px 0;"><strong>Room:</strong> ${bookingData.roomName}</p>
        <p style="margin: 5px 0;"><strong>Amount:</strong> ৳${bookingData.totalAmount}</p>
        <p style="margin: 5px 0;"><strong>Check-in:</strong> ${bookingData.checkIn.toLocaleDateString()}</p>
        <p style="margin: 5px 0;"><strong>Check-out:</strong> ${bookingData.checkOut.toLocaleDateString()}</p>
      </div>
      <p style="margin-top: 20px;">Please log in to the admin panel to accept or reject this booking.</p>
      <div style="margin-top: 20px;">
        <a href="https://shotabdi-abashik.bd/admin" style="background-color: #1e293b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Go to Admin Panel</a>
      </div>
    `,
  });
};

export const notifyAdminNewReview = async (reviewData: any) => {
  return sendEmail({
    to: ADMIN_EMAIL,
    subject: 'New Guest Review Received',
    type: 'admin_alert',
    metadata: { reviewId: reviewData.id },
    html: `
      <h2 style="color: #dc2626; margin-top: 0;">New Review Alert!</h2>
      <p>A guest has left a new review on the website.</p>
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; font-style: italic;">
        <p style="margin: 5px 0;"><strong>Guest:</strong> ${reviewData.userName}</p>
        <p style="margin: 5px 0;"><strong>Rating:</strong> ${reviewData.rating} / 5</p>
        <p style="margin: 5px 0;"><strong>Comment:</strong> "${reviewData.comment}"</p>
      </div>
      <p style="margin-top: 20px;">The review has been automatically approved and is now visible on the website.</p>
    `,
  });
};

