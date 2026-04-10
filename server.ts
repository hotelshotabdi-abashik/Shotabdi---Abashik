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

  // API Routes
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send('User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n\nSitemap: https://www.shotabdi-abashik.bd/sitemap.xml');
  });

  app.get('/sitemap.xml', async (req, res) => {
    try {
      let rooms: any[] = [];
      let content: any = {};

      if (adminDb) {
        try {
          const roomsSnapshot = await adminDb.collection('rooms').get();
          rooms = roomsSnapshot.docs.map((doc: any) => doc.data());

          const contentSnapshot = await adminDb.collection('content').get();
          contentSnapshot.docs.forEach((doc: any) => {
            try {
              content[doc.id] = JSON.parse(doc.data().data);
            } catch (e) {
              content[doc.id] = doc.data().data;
            }
          });
        } catch (dbError) {
          console.error('Database error during sitemap generation:', dbError);
          // Fallback to static sitemap if DB fails
          if (fs.existsSync(path.join(process.cwd(), 'public', 'sitemap.xml'))) {
            return res.sendFile(path.join(process.cwd(), 'public', 'sitemap.xml'));
          }
        }
      } else {
        console.warn('adminDb not initialized for sitemap generation');
        if (fs.existsSync(path.join(process.cwd(), 'public', 'sitemap.xml'))) {
          return res.sendFile(path.join(process.cwd(), 'public', 'sitemap.xml'));
        }
      }

      const baseUrl = 'https://www.shotabdi-abashik.bd';
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

      // Home Page
      xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n`;
      const heroImages = [
        content.home_hero_bg_1, content.home_hero_bg_2, content.home_hero_bg_3, content.home_hero_bg_4, content.home_hero_bg_5
      ].filter(img => img && img !== 'deleted');
      heroImages.forEach(img => {
        xml += `    <image:image>\n      <image:loc>${escapeXml(img)}</image:loc>\n      <image:title>Hotel Shotabdi Abashik Hero</image:title>\n    </image:image>\n`;
      });
      xml += `  </url>\n`;

      // Main Pages
      ['rooms', 'restaurant', 'tour-desk', 'gallery', 'about', 'help-desk', 'privacy-policy', 'terms-of-service', 'sitemap'].forEach(page => {
        xml += `  <url>\n    <loc>${baseUrl}/${page}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      });

      // Individual Rooms
      rooms.forEach(room => {
        const slug = room.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        if (slug) {
          xml += `  <url>\n    <loc>${baseUrl}/rooms/${slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n`;
          if (room.imageUrl) {
            xml += `    <image:image>\n      <image:loc>${escapeXml(room.imageUrl)}</image:loc>\n      <image:title>${escapeXml(room.name)}</image:title>\n    </image:image>\n`;
          }
          xml += `  </url>\n`;
        }
      });

      // Individual Restaurants
      const restaurants = content.restaurants || [];
      restaurants.forEach((rest: any) => {
        if (rest.name) {
          const slug = rest.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          xml += `  <url>\n    <loc>${baseUrl}/restaurant/${slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n`;
          if (rest.imageUrl) {
            xml += `    <image:image>\n      <image:loc>${escapeXml(rest.imageUrl)}</image:loc>\n      <image:title>${escapeXml(rest.name)}</image:title>\n    </image:image>\n`;
          }
          xml += `  </url>\n`;
        }
      });

      // Individual Tour Spots
      const tourSpots = content.tourSpots || [];
      tourSpots.forEach((spot: any) => {
        if (spot.name) {
          const slug = spot.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          xml += `  <url>\n    <loc>${baseUrl}/tour-desk/${slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n`;
          if (spot.imageUrl) {
            xml += `    <image:image>\n      <image:loc>${escapeXml(spot.imageUrl)}</image:loc>\n      <image:title>${escapeXml(spot.name)}</image:title>\n    </image:image>\n`;
          }
          xml += `  </url>\n`;
        }
      });

      // Gallery Items
      const galleryImages = content.galleryImages || [];
      galleryImages.forEach((img: any, index: number) => {
        const id = typeof img === 'string' ? index.toString() : (img.id || index.toString());
        const url = typeof img === 'string' ? img : img.url;
        xml += `  <url>\n    <loc>${baseUrl}/gallery/${id}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n`;
        if (url) {
          xml += `    <image:image>\n      <image:loc>${escapeXml(url)}</image:loc>\n    </image:image>\n`;
        }
        xml += `  </url>\n`;
      });

      xml += `</urlset>`;
      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error('Error generating dynamic sitemap:', error);
      if (fs.existsSync(path.join(process.cwd(), 'public', 'sitemap.xml'))) {
        return res.sendFile(path.join(process.cwd(), 'public', 'sitemap.xml'));
      }
      res.status(500).send('Error generating sitemap');
    }
  });

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
    
    // Intercept HTML requests to inject meta tags
    app.use(async (req, res, next) => {
      if (req.method !== 'GET' || req.headers.accept?.indexOf('text/html') === -1) {
        return next();
      }
      
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        
        const modifiedHtml = await injectMetaTags(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(modifiedHtml);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false })); // Disable default index.html serving
    
    app.get('*', async (req, res) => {
      try {
        const template = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
        const modifiedHtml = await injectMetaTags(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).send(modifiedHtml);
      } catch (e) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

async function injectMetaTags(url: string, html: string): Promise<string> {
  if (!adminDb) return html;

  try {
    let title = '';
    let description = '';
    let imageUrl = '';

    if (url.startsWith('/restaurant/')) {
      const id = url.split('/restaurant/')[1].split('?')[0];
      const docSnap = await adminDb.collection('content').doc('restaurants').get();
      if (docSnap.exists) {
        const data = JSON.parse(docSnap.data()?.data || '[]');
        const item = data.find((r: any, idx: number) => 
          idx.toString() === id || 
          (r.name && r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') === id)
        );
        if (item) {
          title = `${item.name} | Restaurant in Sylhet | Hotel Shotabdi Abashik`;
          description = `${item.type} restaurant located at ${item.location}. Distance: ${item.distance} from Hotel Shotabdi Abashik.`;
          imageUrl = item.imageUrl;
        }
      }
    } else if (url.startsWith('/tour-desk/')) {
      const id = url.split('/tour-desk/')[1].split('?')[0];
      const docSnap = await adminDb.collection('content').doc('tourDesk').get();
      if (docSnap.exists) {
        const data = JSON.parse(docSnap.data()?.data || '[]');
        const item = data.find((t: any, idx: number) => 
          t.id === id ||
          idx.toString() === id || 
          (t.name && t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') === id)
        );
        if (item) {
          title = `${item.name} | Tour Desk | Hotel Shotabdi Abashik`;
          description = `${item.type} located at ${item.location}. Distance: ${item.distance} from Hotel Shotabdi Abashik.`;
          imageUrl = item.imageUrl;
        }
      }
    } else if (url.startsWith('/gallery/')) {
      const id = url.split('/gallery/')[1].split('?')[0];
      const docSnap = await adminDb.collection('content').doc('gallery').get();
      if (docSnap.exists) {
        const data = JSON.parse(docSnap.data()?.data || '[]');
        const item = data.find((g: any, idx: number) => idx.toString() === id);
        if (item) {
          title = `${item.title || 'Gallery'} | Hotel Shotabdi Abashik`;
          description = item.description || 'View our gallery';
          imageUrl = item.imageUrl;
        }
      }
    } else if (url.startsWith('/rooms/')) {
      const id = url.split('/rooms/')[1].split('?')[0];
      const docSnap = await adminDb.collection('rooms').get();
      const rooms = docSnap.docs.map((doc: any) => doc.data());
      const item = rooms.find((r: any) => 
        r.name && r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') === id
      );
      if (item) {
        title = `${item.name} | Rooms | Hotel Shotabdi Abashik`;
        description = `${item.description || 'View our room details'}. Price: ${item.price} BDT.`;
        imageUrl = item.imageUrl;
      }
    }

    if (title && imageUrl) {
      // Replace existing meta tags or inject new ones
      let newHtml = html;
      
      // Replace title
      newHtml = newHtml.replace(/<title>(.*?)<\/title>/, `<title>${escapeXml(title)}</title>`);
      
      // Replace og:title
      newHtml = newHtml.replace(/<meta property="og:title" content="(.*?)" \/>/, `<meta property="og:title" content="${escapeXml(title)}" />`);
      
      // Replace og:description
      if (description) {
        newHtml = newHtml.replace(/<meta property="og:description" content="(.*?)" \/>/, `<meta property="og:description" content="${escapeXml(description)}" />`);
        newHtml = newHtml.replace(/<meta name="description" content="(.*?)" \/>/, `<meta name="description" content="${escapeXml(description)}" />`);
      }
      
      // Replace og:image
      newHtml = newHtml.replace(/<meta property="og:image" content="(.*?)" \/>/, `<meta property="og:image" content="${escapeXml(imageUrl)}" />`);
      
      // Replace og:url
      newHtml = newHtml.replace(/<meta property="og:url" content="(.*?)" \/>/, `<meta property="og:url" content="${escapeXml('https://www.shotabdi-abashik.bd' + url)}" />`);
      
      // Replace twitter:image
      newHtml = newHtml.replace(/<meta property="twitter:image" content="(.*?)" \/>/, `<meta property="twitter:image" content="${escapeXml(imageUrl)}" />`);
      
      return newHtml;
    }
  } catch (error) {
    console.error('Error injecting meta tags:', error);
  }

  return html;
}

startServer();
