import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');

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

async function generateSitemap() {
  console.log('Generating sitemap...');
  try {
    let rooms: any[] = [];
    let content: any = {};

    if (fs.existsSync(firebaseConfigPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

      const roomsSnapshot = await getDocs(collection(db, 'rooms'));
      rooms = roomsSnapshot.docs.map(doc => doc.data());

      const contentSnapshot = await getDocs(collection(db, 'content'));
      contentSnapshot.docs.forEach(doc => {
        try {
          content[doc.id] = JSON.parse(doc.data().data);
        } catch (e) {
          content[doc.id] = doc.data().data;
        }
      });
    } else {
      console.warn('firebase-applet-config.json not found. Generating sitemap with default content.');
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
      xml += `    <loc>${baseUrl}/tour-desk</loc>\n`;
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
      ['about', 'privacypolicy', 'termsofservice'].forEach(page => {
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/${page}</loc>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.5</priority>\n`;
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

      // Individual Restaurant Pages
      restaurants.forEach((rest: any) => {
        if (rest.name) {
          const slug = rest.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          xml += `  <url>\n`;
          xml += `    <loc>${baseUrl}/restaurant/${slug}</loc>\n`;
          xml += `    <changefreq>monthly</changefreq>\n`;
          xml += `    <priority>0.6</priority>\n`;
          if (rest.imageUrl) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(rest.imageUrl)}</image:loc>\n`;
            xml += `      <image:title>${escapeXml(rest.name)}</image:title>\n`;
            xml += `      <image:caption>${escapeXml(rest.type + ' at ' + rest.location)}</image:caption>\n`;
            xml += `    </image:image>\n`;
          }
          xml += `  </url>\n`;
        }
      });

      // Individual Tour Desk Pages
      tourSpots.forEach((spot: any) => {
        if (spot.name) {
          const slug = spot.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          xml += `  <url>\n`;
          xml += `    <loc>${baseUrl}/tour-desk/${slug}</loc>\n`;
          xml += `    <changefreq>monthly</changefreq>\n`;
          xml += `    <priority>0.6</priority>\n`;
          if (spot.imageUrl) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(spot.imageUrl)}</image:loc>\n`;
            xml += `      <image:title>${escapeXml(spot.name)}</image:title>\n`;
            xml += `      <image:caption>${escapeXml(spot.description || spot.name)}</image:caption>\n`;
            xml += `    </image:image>\n`;
          }
          xml += `  </url>\n`;
        }
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

    // Ensure public directory exists
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
    }

    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml);
    console.log('Sitemap generated successfully at public/sitemap.xml');
    process.exit(0);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    process.exit(1);
  }
}

generateSitemap();
