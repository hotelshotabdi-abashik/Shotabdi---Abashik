export interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (params: EmailParams) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in sendEmail:', error);
    throw error;
  }
};

export const notifyLogin = async (email: string, name: string) => {
  return sendEmail({
    to: email,
    subject: 'Login Notification - Hotel Shotabdi Abashik',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #dc2626;">Welcome back, ${name}!</h2>
        <p>You have successfully logged into your account at Hotel Shotabdi Abashik.</p>
        <p>If this wasn't you, please contact us immediately.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">Hotel Shotabdi Abashik, Sylhet, Bangladesh</p>
      </div>
    `,
  });
};

export const notifyBookingSubmitted = async (email: string, name: string, roomName: string, totalAmount: number) => {
  return sendEmail({
    to: email,
    subject: 'Booking Received - Hotel Shotabdi Abashik',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #dc2626;">Booking Received!</h2>
        <p>Hello ${name},</p>
        <p>We have received your booking request for <strong>${roomName}</strong>.</p>
        <p>Total Amount: <strong>৳${totalAmount}</strong></p>
        <p>Our team will review your booking and contact you shortly for confirmation.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">Hotel Shotabdi Abashik, Sylhet, Bangladesh</p>
      </div>
    `,
  });
};

export const notifyBookingStatus = async (email: string, name: string, roomName: string, status: string) => {
  const statusText = status === 'accepted' ? 'Accepted' : 'Rejected';
  const color = status === 'accepted' ? '#16a34a' : '#dc2626';
  
  return sendEmail({
    to: email,
    subject: `Booking ${statusText} - Hotel Shotabdi Abashik`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: ${color};">Booking ${statusText}</h2>
        <p>Hello ${name},</p>
        <p>Your booking for <strong>${roomName}</strong> has been <strong>${statusText.toLowerCase()}</strong>.</p>
        ${status === 'accepted' ? '<p>We look forward to seeing you!</p>' : '<p>We are sorry we could not accommodate your request at this time.</p>'}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">Hotel Shotabdi Abashik, Sylhet, Bangladesh</p>
      </div>
    `,
  });
};

export const notifyExclusiveOffer = async (email: string, title: string, description: string) => {
  return sendEmail({
    to: email,
    subject: `Exclusive Offer: ${title}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #dc2626;">${title}</h2>
        <p>${description}</p>
        <p>Check out our website for more details!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">Hotel Shotabdi Abashik, Sylhet, Bangladesh</p>
      </div>
    `,
  });
};

const ADMIN_EMAIL = 'hotelshotabdiabashik@gmail.com';

export const notifyAdminNewBooking = async (bookingData: any) => {
  return sendEmail({
    to: ADMIN_EMAIL,
    subject: 'New Booking Received - Action Required',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #dc2626;">New Booking Alert!</h2>
        <p>A new booking has been submitted on the website.</p>
        <p><strong>Guest:</strong> ${bookingData.userName} (${bookingData.userEmail})</p>
        <p><strong>Room:</strong> ${bookingData.roomName}</p>
        <p><strong>Amount:</strong> ৳${bookingData.totalAmount}</p>
        <p><strong>Check-in:</strong> ${bookingData.checkIn.toLocaleDateString()}</p>
        <p><strong>Check-out:</strong> ${bookingData.checkOut.toLocaleDateString()}</p>
        <p>Please log in to the admin panel to accept or reject this booking.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">Hotel Shotabdi Abashik Admin System</p>
      </div>
    `,
  });
};

export const notifyAdminNewReview = async (reviewData: any) => {
  return sendEmail({
    to: ADMIN_EMAIL,
    subject: 'New Guest Review Received',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #dc2626;">New Review Alert!</h2>
        <p>A guest has left a new review on the website.</p>
        <p><strong>Guest:</strong> ${reviewData.userName}</p>
        <p><strong>Rating:</strong> ${reviewData.rating} / 5</p>
        <p><strong>Comment:</strong> "${reviewData.comment}"</p>
        <p>The review has been automatically approved and is now visible on the website.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">Hotel Shotabdi Abashik Admin System</p>
      </div>
    `,
  });
};
