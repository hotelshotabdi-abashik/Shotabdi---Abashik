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
        image: "https://shotabdi-abashik.bd/logo.png" // Default
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
          const rooms = await fetchAllFromCollection("rooms");
          const room = rooms.find(r => {
            const name = r.fields?.name?.stringValue || '';
            const roomSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            return roomSlug === slug;
          });
          
          if (room) {
            meta.title = room.fields?.name?.stringValue ? `${room.fields.name.stringValue} - Hotel Shotabdi` : "Luxury Room - Hotel Shotabdi";
            meta.description = room.fields?.description?.stringValue || "Book your stay at the best price.";
            
            if (room.fields?.imageUrl?.stringValue) {
              meta.image = room.fields.imageUrl.stringValue;
            } else {
              const images = room.fields?.images?.arrayValue?.values;
              if (images && images.length > 0 && images[0].stringValue) {
                meta.image = images[0].stringValue;
              }
            }
          }
        }
      } 
      // DETECT RESTAURANT LINKS
      else if (url.pathname.includes("/restaurant/")) {
        const slug = url.pathname.split("/restaurant/")[1];
        if (slug) {
          const restaurants = await fetchAllFromCollection("restaurants");
          const restaurant = restaurants.find(r => {
            const name = r.fields?.name?.stringValue || '';
            const resSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            return resSlug === slug || r.name.split('/').pop() === slug;
          });
          
          if (restaurant) {
            meta.title = `${restaurant.fields?.name?.stringValue || 'Restaurant'} | Restaurant in Sylhet`;
            meta.description = `${restaurant.fields?.type?.stringValue || 'Local'} restaurant located at ${restaurant.fields?.location?.stringValue || 'Sylhet'}.`;
            if (restaurant.fields?.imageUrl?.stringValue) {
              meta.image = restaurant.fields.imageUrl.stringValue;
            }
          }
        }
      }
      // DETECT TOUR LINKS
      else if (url.pathname.includes("/tour-desk/")) {
        const slug = url.pathname.split("/tour-desk/")[1];
        if (slug) {
          const tourSpots = await fetchAllFromCollection("tourSpots");
          const spot = tourSpots.find(t => {
            const name = t.fields?.name?.stringValue || '';
            const spotSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            return spotSlug === slug || t.name.split('/').pop() === slug;
          });
          
          if (spot) {
            meta.title = `${spot.fields?.name?.stringValue || 'Tour Spot'} | Tour Spot in Sylhet`;
            meta.description = spot.fields?.description?.stringValue || `Explore ${spot.fields?.name?.stringValue || 'Sylhet'} with Hotel Shotabdi.`;
            if (spot.fields?.imageUrl?.stringValue) {
              meta.image = spot.fields.imageUrl.stringValue;
            }
          }
        }
      }
      // DETECT GALLERY LINKS
      else if (url.pathname.includes("/gallery/")) {
        const id = url.pathname.split("/gallery/")[1];
        if (id) {
          const gallery = await fetchAllFromCollection("gallery");
          const img = gallery.find((g, index) => g.name.split('/').pop() === id || index.toString() === id);
          
          if (img) {
            meta.title = img.fields?.title?.stringValue ? `${img.fields.title.stringValue} | Hotel Shotabdi Gallery` : "Gallery | Hotel Shotabdi";
            meta.description = img.fields?.description?.stringValue || "View our beautiful hotel gallery.";
            if (img.fields?.url?.stringValue) {
              meta.image = img.fields.url.stringValue;
            }
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
