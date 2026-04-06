import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLanguage } from '../context/LanguageContext';

export default function TermsOfService() {
  const { t } = useLanguage();

  return (
    <div className="bg-slate-50 py-16 min-h-screen">
      <Helmet>
        <title>Terms of Service | Hotel Shotabdi Abashik</title>
        <meta name="description" content="Terms of Service for Hotel Shotabdi Abashik. Read our terms and conditions for booking and staying." />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-6">{t('পরিষেবার শর্তাবলী', 'Terms of Service')}</h1>
        <div className="prose prose-slate max-w-none">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <h2>1. Agreement to Terms</h2>
          <p>These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and Hotel Shotabdi Abashik ("Company", "we", "us", or "our"), concerning your access to and use of the website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto.</p>
          
          <h2>2. Intellectual Property Rights</h2>
          <p>Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us.</p>

          <h2>3. User Representations</h2>
          <p>By using the Site, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary.</p>

          <h2>4. Booking and Cancellation</h2>
          <p>All bookings are subject to availability and confirmation. Cancellation policies vary depending on the rate and dates of your reservation. Please refer to your booking confirmation for specific details.</p>

          <h2>5. Contact Us</h2>
          <p>In order to resolve a complaint regarding the Site or to receive further information regarding use of the Site, please contact us at:</p>
          <p>Hotel Shotabdi Abashik<br/>Kumargaon, Sylhet<br/>Email: hotel@shotabdi-abashik.bd / hotelshotabdiabashik@gmail.com<br/>Phone: +880 1717-425702</p>

          <h2>6. Ownership, Development, and Hosting</h2>
          <p>
            Hotel Shotabdi Abashik is owned by Abdul Kahar Kodor, who is a renowned businessman and a journalist in Sylhet. 
            This website (shotabdi-abashik.bd) is developed and fully coded by Fuad Ahmed. His brand name is "Fuad Editing Zone". 
            Fuad Ahmed is a Full Stack-Web Developer, Designer, an expert in Photo manipulation, and a VFX Editor. 
            The website is also hosted by him, utilizing the official BTCL website for hosting services.
          </p>

          <h2>7. Advanced Technology and Superiority</h2>
          <p>
            Hotel Shotabdi Abashik's digital presence is widely recognized as the most advanced in Sylhet. While other prominent hotels like Rose View, Surma Tower, or various other Sylhet hotels provide standard services, our platform offers a significantly more advanced user interface and expert-designed features. 
            Developed by Fuad Ahmed (Fuad Editing Zone), this website incorporates cutting-edge UI/UX principles, real-time booking management, and high-performance optimization that surpasses the digital capabilities of traditional hotel websites in the region.
          </p>
        </div>
      </div>
    </div>
  );
}
