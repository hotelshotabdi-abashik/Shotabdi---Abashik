class MetaRewriter {
  constructor(metadata) {
    this.metadata = metadata;
  }
  element(element) {
    const property = element.getAttribute("property") || element.getAttribute("name");
    if (property === "og:title" || property === "twitter:title") {
      element.setAttribute("content", this.metadata.title);
    }
    if (property === "og:image" || property === "twitter:image") {
      element.setAttribute("content", this.metadata.image);
    }
    if (property === "og:description" || property === "twitter:description") {
      element.setAttribute("content", this.metadata.description);
    }
    if (property === "og:url" || property === "twitter:url") {
      if (this.metadata.url) {
        element.setAttribute("content", this.metadata.url);
      }
    }
  }
}

class InitialStateRewriter {
  constructor(content) {
    this.content = content;
  }
  element(element) {
    element.append(`<script>window.__INITIAL_CONTENT__ = ${JSON.stringify(this.content)};</script>`, { html: true });
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Configuration
const AUTH_KEY = "123456@";
const RESEND_API_KEY = "re_JDjWan9P_BX7wV2aQkwUPBfFznC8W2L6N";
const FROM_EMAIL = "hotel@shotabdi-abashik.bd";
const PAGES_URL = "shotabdi-abashik.pages.dev";
const FIRESTORE_URL = "https://firestore.googleapis.com/v1/projects/helical-realm-476704-m0/databases/ai-studio-f14820b0-2a32-464e-8aca-957a8401f25f/documents";

async function fetchAllFromCollection(collectionName) {
  try {
    const res = await fetch(`${FIRESTORE_URL}/${collectionName}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.documents || [];
  } catch (e) {
    return [];
  }
}

async function getItemData(type, id) {
  // Placeholder function that connects to Firestore
  // You can replace this with your own R2 or custom database logic
  try {
    const collectionName = type === 'rooms' ? 'rooms' : 
                           type === 'restaurant' ? 'restaurants' : 
                           (type === 'tours' || type === 'tour-desk') ? 'tourSpots' : 
                           type === 'gallery' ? 'gallery' : null;
    
    if (!collectionName) return null;

    const items = await fetchAllFromCollection(collectionName);
    
    const item = items.find((i, index) => {
      const name = i.fields?.name?.stringValue || '';
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      return slug === id || i.name.split('/').pop() === id || index.toString() === id;
    });

    if (!item) return null;

    let title, description, image;

    if (type === 'rooms') {
      title = item.fields?.name?.stringValue ? `${item.fields.name.stringValue} - Hotel Shotabdi` : "Luxury Room - Hotel Shotabdi";
      description = item.fields?.description?.stringValue || "Book your stay at the best price.";
      image = item.fields?.imageUrl?.stringValue || (item.fields?.images?.arrayValue?.values?.[0]?.stringValue);
    } else if (type === 'restaurant') {
      title = `${item.fields?.name?.stringValue || 'Restaurant'} | Restaurant in Sylhet`;
      description = `${item.fields?.type?.stringValue || 'Local'} restaurant located at ${item.fields?.location?.stringValue || 'Sylhet'}.`;
      image = item.fields?.imageUrl?.stringValue;
    } else if (type === 'tours' || type === 'tour-desk') {
      title = `${item.fields?.name?.stringValue || 'Tour Spot'} | Tour Spot in Sylhet`;
      description = item.fields?.description?.stringValue || `Explore ${item.fields?.name?.stringValue || 'Sylhet'} with Hotel Shotabdi.`;
      image = item.fields?.imageUrl?.stringValue;
    } else if (type === 'gallery') {
      title = item.fields?.title?.stringValue ? `${item.fields.title.stringValue} | Hotel Shotabdi Gallery` : "Gallery | Hotel Shotabdi";
      description = item.fields?.description?.stringValue || "View our beautiful hotel gallery.";
      image = item.fields?.url?.stringValue;
    }

    return { title, description, image };
  } catch (e) {
    return null;
  }
}

async function fetchAllContent() {
  try {
    const res = await fetch(`${FIRESTORE_URL}/content`);
    if (!res.ok) return {};
    const data = await res.json();
    const allContent = {};
    if (data.documents) {
      data.documents.forEach(doc => {
        const id = doc.name.split('/').pop();
        const jsonStr = doc.fields?.data?.stringValue;
        if (jsonStr) {
          try {
            allContent[id] = JSON.parse(jsonStr);
          } catch (e) {
            allContent[id] = jsonStr;
          }
        }
      });
    }
    return allContent;
  } catch (e) {
    return {};
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.slice(1);

    // 1. Handle CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Dynamic Sitemap Generation
    if (url.pathname === "/sitemap.xml") {
      try {
        const allContent = await fetchAllContent();
        const baseUrl = "https://shotabdi-abashik.bd";
        
        let sitemapUrls = `
          <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
          <url><loc>${baseUrl}/rooms</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
          <url><loc>${baseUrl}/restaurant</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
          <url><loc>${baseUrl}/tourdesk</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
          <url><loc>${baseUrl}/gallery</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
          <url><loc>${baseUrl}/contact</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
        `;

        // Add Rooms
        const rooms = await fetchAllFromCollection('rooms');
        rooms.forEach(room => {
          const name = room.fields?.name?.stringValue || '';
          if (name) {
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            sitemapUrls += `<url><loc>${baseUrl}/rooms/${slug}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
          }
        });

        // Add Restaurants
        if (allContent.restaurants) {
          allContent.restaurants.forEach(res => {
            if (res.name) {
              const slug = res.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
              sitemapUrls += `<url><loc>${baseUrl}/restaurant/${slug}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`;
            }
          });
        }

        // Add Tour Spots
        if (allContent.tourSpots) {
          allContent.tourSpots.forEach(spot => {
            if (spot.name) {
              const slug = spot.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
              sitemapUrls += `<url><loc>${baseUrl}/tour-desk/${slug}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`;
            }
          });
        }

        const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemapUrls}
</urlset>`;

        return new Response(sitemapXml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600"
          }
        });
      } catch (e) {
        console.error("Sitemap generation error:", e);
      }
    }

    // 2. EMAIL ROUTE (FIXED)
    if (url.pathname === "/send-email" && request.method === "POST") {
      try {
        const body = await request.json();
        const { to, subject, html, text } = body;
        
        const resendPayload = {
          from: `Hotel Shotabdi <${FROM_EMAIL}>`,
          to: [to],
          subject: subject,
        };

        if (html) resendPayload.html = html;
        if (text) resendPayload.text = text;

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(resendPayload),
        });

        const data = await resendRes.json();
        return new Response(JSON.stringify(data), { 
          status: resendRes.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
    }

    // 3. R2 STORAGE ROUTE (UNCHANGED - Connection Preserved)
    const isStorageRequest = path.startsWith("shotabdi-abashik/") || 
                             /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(path);

    if (isStorageRequest) {
      const bucket = env["shotabdi-abashik"];
      
      if (request.method === "PUT" || request.method === "DELETE") {
        const authHeader = request.headers.get("Authorization");
        if (authHeader !== `Bearer ${AUTH_KEY}`) {
          return new Response("Unauthorized", { status: 401, headers: corsHeaders });
        }
      }

      if (request.method === "PUT") {
        await bucket.put(path, request.body, {
          httpMetadata: { contentType: request.headers.get("Content-Type") || "application/octet-stream" },
        });
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      if (request.method === "GET") {
        const object = await bucket.get(path);
        if (!object) return new Response("Not Found", { status: 404, headers: corsHeaders });
        
        const headers = new Headers(corsHeaders);
        object.writeHttpMetadata(headers);
        
        // Lazy Loading Support: ETag and Last-Modified
        headers.set("ETag", object.httpEtag);
        headers.set("Last-Modified", object.uploaded.toUTCString());
        
        // Mobile Acceleration: Aggressive Edge Caching
        headers.set("Cache-Control", "public, max-age=31536000, immutable");

        // Check for 304 Not Modified
        const ifNoneMatch = request.headers.get("If-None-Match");
        if (ifNoneMatch === object.httpEtag) {
          return new Response(null, { status: 304, headers });
        }

        // Auto-WebP Conversion & Smart Compression
        const acceptHeader = request.headers.get("Accept") || "";
        const isImage = /\.(jpg|jpeg|png)$/i.test(path);
        
        // If Cloudflare Image Resizing is available, it can be invoked via fetch.
        // Here we simulate high-speed buffer delivery by streaming the R2 object directly
        // with aggressive caching, allowing Cloudflare Polish (if enabled on the zone) 
        // to automatically convert to WebP based on the Accept header.
        if (isImage && acceptHeader.includes("image/webp")) {
          headers.set("Vary", "Accept");
        }

        return new Response(object.body, { headers });
      }

      if (request.method === "DELETE") {
        await bucket.delete(path);
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }
    }

    // 4. FIREBASE AUTH PROXY
    if (url.pathname.startsWith("/__/auth/")) {
      url.hostname = "helical-realm-476704-m0.firebaseapp.com";
      return fetch(new Request(url.toString(), request));
    }

    // 5. WEBSITE PROXY WITH DYNAMIC PREVIEWS
    url.hostname = PAGES_URL;
    const modifiedRequest = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      redirect: "follow",
    });

    const response = await fetch(modifiedRequest);
    
    // Only rewrite if it's an HTML page
    const contentType = response.headers.get("Content-Type");
    if (contentType && contentType.includes("text/html")) {
      
      let meta = {
        title: "Hotel Shotabdi Abashik",
        description: "Boutique Hotel in Sylhet, Bangladesh",
        image: "https://shotabdi-abashik.bd/logo.png", // Default
        url: url.toString()
      };

      // DETECT LIST PAGES
      if (url.pathname === "/rooms") {
        meta.title = "Our Rooms | Hotel Shotabdi Abashik";
        meta.description = "Explore our comfortable and affordable rooms in Sylhet. Choose from Single Delux, Double Delux, Family Suit, and Super Delux.";
      } else if (url.pathname === "/restaurant") {
        meta.title = "Restaurants & Dining | Hotel Shotabdi Abashik";
        meta.description = "Discover the best restaurants and dining options near Hotel Shotabdi Abashik in Sylhet.";
      } else if (url.pathname === "/tour-desk") {
        meta.title = "Tour Desk & Attractions | Hotel Shotabdi Abashik";
        meta.description = "Explore top tourist spots in Sylhet with our Tour Desk. Visit SUST Campus, Hazrat Shahjalal Mazar, Ratargul, Jaflong and more.";
      } else if (url.pathname === "/gallery") {
        meta.title = "Gallery | Hotel Shotabdi Abashik";
        meta.description = "View photos of Hotel Shotabdi Abashik. See our rooms, facilities, and the beautiful surroundings in Sylhet.";
      }

      // DETECT ROOM LINKS
      if (url.pathname.includes("/rooms/")) {
        const slug = url.pathname.split("/rooms/")[1];
        if (slug) {
          const itemData = await getItemData('rooms', slug);
          if (itemData) {
            meta.title = itemData.title;
            meta.description = itemData.description;
            if (itemData.image) meta.image = itemData.image;
          }
        }
      } 
      // DETECT RESTAURANT LINKS
      else if (url.pathname.includes("/restaurant/")) {
        const slug = url.pathname.split("/restaurant/")[1];
        if (slug) {
          const itemData = await getItemData('restaurant', slug);
          if (itemData) {
            meta.title = itemData.title;
            meta.description = itemData.description;
            if (itemData.image) meta.image = itemData.image;
          }
        }
      }
      // DETECT TOUR LINKS
      else if (url.pathname.includes("/tour-desk/") || url.pathname.includes("/tours/")) {
        const slug = url.pathname.includes("/tour-desk/") ? url.pathname.split("/tour-desk/")[1] : url.pathname.split("/tours/")[1];
        if (slug) {
          const itemData = await getItemData('tours', slug);
          if (itemData) {
            meta.title = itemData.title;
            meta.description = itemData.description;
            if (itemData.image) meta.image = itemData.image;
          }
        }
      }
      // DETECT GALLERY LINKS
      else if (url.pathname.includes("/gallery/")) {
        const id = url.pathname.split("/gallery/")[1];
        if (id) {
          const itemData = await getItemData('gallery', id);
          if (itemData) {
            meta.title = itemData.title;
            meta.description = itemData.description;
            if (itemData.image) meta.image = itemData.image;
          }
        }
      }

      // Fetch all content for instant client-side rendering (like Netflix SSR)
      const initialContent = await fetchAllContent();

      return new HTMLRewriter()
        .on("meta", new MetaRewriter(meta))
        .on("head", new InitialStateRewriter(initialContent))
        .transform(response);
    }

    return response;
  },
};
