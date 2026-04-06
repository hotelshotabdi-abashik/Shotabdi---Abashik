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
