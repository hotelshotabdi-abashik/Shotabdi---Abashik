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

async function fetchRoom(roomId) {
  try {
    const res = await fetch(`${FIRESTORE_URL}/rooms/${roomId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.fields;
  } catch (e) {
    return null;
  }
}

async function fetchContent(docId) {
  try {
    const res = await fetch(`${FIRESTORE_URL}/content/${docId}`);
    if (!res.ok) return null;
    const data = await res.json();
    const jsonStr = data.fields?.data?.stringValue;
    if (jsonStr) {
      return JSON.parse(jsonStr);
    }
    return null;
  } catch (e) {
    return null;
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

      // DETECT ROOM LINKS
      if (url.pathname.includes("/rooms/")) {
        const roomId = url.pathname.split("/rooms/")[1];
        if (roomId) {
          const room = await fetchRoom(roomId);
          if (room) {
            meta.title = room.name?.stringValue ? `${room.name.stringValue} - Hotel Shotabdi` : "Luxury Room - Hotel Shotabdi";
            meta.description = room.description?.stringValue || "Book your stay at the best price.";
            
            // Try to get the first image from the images array
            const images = room.images?.arrayValue?.values;
            if (images && images.length > 0 && images[0].stringValue) {
              meta.image = images[0].stringValue;
            }
          }
        }
      } 
      // DETECT RESTAURANT LINKS
      else if (url.pathname.includes("/restaurant/")) {
        const slug = url.pathname.split("/restaurant/")[1];
        if (slug) {
          const restaurants = await fetchContent("restaurants");
          if (restaurants && Array.isArray(restaurants)) {
            const restaurant = restaurants.find(r => 
              r.name && r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') === slug
            );
            if (restaurant) {
              meta.title = `${restaurant.name} | Restaurant in Sylhet`;
              meta.description = `${restaurant.type} restaurant located at ${restaurant.location}.`;
              if (restaurant.imageUrl) {
                meta.image = restaurant.imageUrl;
              }
            }
          }
        }
      }
      // DETECT TOUR LINKS
      else if (url.pathname.includes("/tour-desk/")) {
        const slug = url.pathname.split("/tour-desk/")[1];
        if (slug) {
          const tourSpots = await fetchContent("tourSpots");
          if (tourSpots && Array.isArray(tourSpots)) {
            const spot = tourSpots.find(t => 
              t.name && t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') === slug
            );
            if (spot) {
              meta.title = `${spot.name} | Tour Spot in Sylhet`;
              meta.description = spot.description || `Explore ${spot.name} with Hotel Shotabdi.`;
              if (spot.imageUrl) {
                meta.image = spot.imageUrl;
              }
            }
          }
        }
      }

      return new HTMLRewriter()
        .on("meta", new MetaRewriter(meta))
        .transform(response);
    }

    return response;
  },
};
