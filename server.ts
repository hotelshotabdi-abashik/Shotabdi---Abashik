import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { initializeApp as initAdmin, getApp as getAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp as initClient } from 'firebase/app';
import { getFirestore as getClientFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin & Client
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let adminDb: any = null;
let clientDb: any = null;

if (fs.existsSync(firebaseConfigPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
  
  // Admin for writes (if ADC works)
  if (!getAdminApps().length) {
    initAdmin({
      projectId: firebaseConfig.projectId,
    });
  }
  adminDb = getAdminFirestore(getAdminApp(), firebaseConfig.firestoreDatabaseId || '(default)');

  // Client for public reads
  const clientApp = initClient(firebaseConfig);
  clientDb = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId || '(default)');
}

let resendClient: Resend | null = null;

function getResend() {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendClient = new Resend(key);
  }
  return resendClient;
}

function escapeXml(unsafe: string) {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Dynamic Sitemap Route
  app.get('/sitemap.xml', async (req, res) => {
    try {
      let rooms: any[] = [];
      let content: any = {};

      if (clientDb) {
        const roomsSnapshot = await getDocs(collection(clientDb, 'rooms'));
        rooms = roomsSnapshot.docs.map(doc => doc.data());

        const contentSnapshot = await getDocs(collection(clientDb, 'content'));
        contentSnapshot.docs.forEach(doc => {
          try {
            content[doc.id] = JSON.parse(doc.data().data);
          } catch (e) {
            content[doc.id] = doc.data().data;
          }
        });
      }

      const baseUrls = [
        'https://shotabdi-abashik.bd',
        'https://www.shotabdi-abashik.bd',
        'http://shotabdi-abashik.bd',
        'http://www.shotabdi-abashik.bd'
      ];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

      baseUrls.forEach(baseUrl => {
        // Home Page
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/</loc>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>1.0</priority>\n`;
        
        const heroSlots = [
          { key: 'home_hero_bg_1', default: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1280&q=70' },
          { key: 'home_hero_bg_2', default: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1280&q=70' },
          { key: 'home_hero_bg_3', default: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1280&q=70' },
          { key: 'home_hero_bg_4', default: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1280&q=70' },
          { key: 'home_hero_bg_5', default: 'https://images.unsplash.com/photo-1542314831-c6a4d14d8373?auto=format&fit=crop&w=1280&q=70' },
        ];
        
        heroSlots.forEach(slot => {
          const imgUrl = content[slot.key] && content[slot.key] !== 'deleted' ? content[slot.key] : slot.default;
          if (imgUrl && imgUrl !== 'deleted') {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(imgUrl)}</image:loc>\n`;
            xml += `      <image:title>${escapeXml(content.site_name || 'Hotel Shotabdi Abashik')} Hero Image</image:title>\n`;
            xml += `    </image:image>\n`;
          }
        });
        xml += `  </url>\n`;

        // Rooms Page
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/rooms</loc>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        rooms.forEach(room => {
          if (room.imageUrl) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(room.imageUrl)}</image:loc>\n`;
            xml += `      <image:title>${escapeXml(room.name)}</image:title>\n`;
            xml += `      <image:caption>${escapeXml(room.description || room.name)}</image:caption>\n`;
            xml += `    </image:image>\n`;
          }
        });
        xml += `  </url>\n`;

        // Restaurant Page
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/restaurant</loc>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        const restaurants = content.restaurants || [];
        restaurants.forEach((rest: any) => {
          if (rest.imageUrl) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(rest.imageUrl)}</image:loc>\n`;
            xml += `      <image:title>${escapeXml(rest.name)}</image:title>\n`;
            xml += `      <image:caption>${escapeXml(rest.type + ' at ' + rest.location)}</image:caption>\n`;
            xml += `    </image:image>\n`;
          }
        });
        xml += `  </url>\n`;

        // Tour Desk Page
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/tourdesk</loc>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        const tourSpots = content.tourSpots || [];
        tourSpots.forEach((spot: any) => {
          if (spot.imageUrl) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(spot.imageUrl)}</image:loc>\n`;
            xml += `      <image:title>${escapeXml(spot.name)}</image:title>\n`;
            xml += `      <image:caption>${escapeXml(spot.description || spot.name)}</image:caption>\n`;
            xml += `    </image:image>\n`;
          }
        });
        xml += `  </url>\n`;

        // Static Pages
        ['privacypolicy', 'termsofservice'].forEach(page => {
          xml += `  <url>\n`;
          xml += `    <loc>${baseUrl}/${page}</loc>\n`;
          xml += `    <changefreq>monthly</changefreq>\n`;
          xml += `    <priority>0.3</priority>\n`;
          xml += `  </url>\n`;
        });

        // Gallery Pages
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/gallery</loc>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        const galleryImages = content.galleryImages || [];
        galleryImages.forEach((img: any, index: number) => {
          const url = typeof img === 'string' ? img : img.url;
          const title = typeof img === 'string' ? `Gallery Image ${index + 1}` : (img.title || `Gallery Image ${index + 1}`);
          const description = typeof img === 'string' ? '' : (img.description || '');
          
          if (url) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(url)}</image:loc>\n`;
            xml += `      <image:title>${escapeXml(title)}</image:title>\n`;
            if (description) {
              xml += `      <image:caption>${escapeXml(description)}</image:caption>\n`;
            }
            xml += `    </image:image>\n`;
          }
        });
        xml += `  </url>\n`;

        // Individual Gallery Post Pages
        galleryImages.forEach((img: any, index: number) => {
          const id = typeof img === 'string' ? index.toString() : (img.id || index.toString());
          const url = typeof img === 'string' ? img : img.url;
          const title = typeof img === 'string' ? `Gallery Image ${index + 1}` : (img.title || `Gallery Image ${index + 1}`);
          const description = typeof img === 'string' ? '' : (img.description || '');
          
          xml += `  <url>\n`;
          xml += `    <loc>${baseUrl}/gallery/${id}</loc>\n`;
          xml += `    <changefreq>monthly</changefreq>\n`;
          xml += `    <priority>0.6</priority>\n`;
          if (url) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(url)}</image:loc>\n`;
            xml += `      <image:title>${escapeXml(title)}</image:title>\n`;
            if (description) {
              xml += `      <image:caption>${escapeXml(description)}</image:caption>\n`;
            }
            xml += `    </image:image>\n`;
          }
          xml += `  </url>\n`;
        });

        // Individual Room Pages
        rooms.forEach(room => {
          const slug = room.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          xml += `  <url>\n`;
          xml += `    <loc>${baseUrl}/rooms/${slug}</loc>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.8</priority>\n`;
          if (room.imageUrl) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(room.imageUrl)}</image:loc>\n`;
            xml += `      <image:title>${escapeXml(room.name)}</image:title>\n`;
            xml += `      <image:caption>${escapeXml(room.description || room.name)}</image:caption>\n`;
            xml += `    </image:image>\n`;
          }
          xml += `  </url>\n`;
        });
      });

      xml += `</urlset>`;

      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      res.status(500).send('Error generating sitemap');
    }
  });

  // API Routes
  app.post('/api/send-email', async (req, res) => {
    const { to, subject, html } = req.body;

    try {
      const resend = getResend();
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'hotel@shotabdi-abashik.bd';
      const data = await resend.emails.send({
        from: `Hotel Shotabdi Abashik <${fromEmail}>`,
        to: [to],
        subject,
        html,
      });

      // Log to Firestore
      if (adminDb) {
        try {
          const logRef = adminDb.collection('emailLogs').doc();
          await logRef.set({
            id: logRef.id,
            to,
            subject,
            body: html,
            sentAt: FieldValue.serverTimestamp(),
            status: 'sent',
            resendId: data.data?.id
          });
        } catch (logError) {
          console.error('Error logging email to Firestore:', logError);
        }
      }

      res.json(data);
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
