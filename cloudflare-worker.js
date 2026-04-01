export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    // Handle Email Sending
    if (url.pathname === "/send-email" && request.method === "POST") {
      try {
        const body = await request.json();
        const { to, subject, html, text } = body;

        if (!env.RESEND_API_KEY) {
          return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const fromEmail = env.RESEND_FROM_EMAIL || "hotel@shotabdi-abashik.bd";

        const resendPayload = {
          from: `Hotel Shotabdi Abashik <${fromEmail}>`,
          to: [to],
          subject: subject,
        };

        if (html) resendPayload.html = html;
        if (text) resendPayload.text = text;

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(resendPayload),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.json().catch(() => ({}));
          console.error("Resend API Error:", errorData);
          return new Response(JSON.stringify({ error: "Failed to send email via Resend", details: errorData }), {
            status: resendResponse.status,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const data = await resendResponse.json();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (error) {
        console.error("Error processing email request:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Handle R2 Image Uploads and Deletions
    const key = url.pathname.slice(1); // Remove leading slash

    if (request.method === "PUT" || request.method === "DELETE") {
      const authHeader = request.headers.get("Authorization");
      const expectedAuth = `Bearer ${env.AUTH_KEY_SECRET || "123456@"}`;
      
      if (authHeader !== expectedAuth) {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
      }
    }

    if (request.method === "PUT") {
      if (!key) return new Response("Missing key", { status: 400, headers: corsHeaders });
      
      await env.MY_BUCKET.put(key, request.body, {
        httpMetadata: {
          contentType: request.headers.get("Content-Type") || "application/octet-stream",
        },
      });
      return new Response(`Successfully uploaded ${key}`, { status: 200, headers: corsHeaders });
    }

    if (request.method === "DELETE") {
      if (!key) return new Response("Missing key", { status: 400, headers: corsHeaders });
      
      await env.MY_BUCKET.delete(key);
      return new Response(`Successfully deleted ${key}`, { status: 200, headers: corsHeaders });
    }

    if (request.method === "GET") {
      if (!key) return new Response("Missing key", { status: 400, headers: corsHeaders });
      
      const object = await env.MY_BUCKET.get(key);
      if (!object) {
        return new Response("Not found", { status: 404, headers: corsHeaders });
      }

      const headers = new Headers(corsHeaders);
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);

      return new Response(object.body, {
        status: 200,
        headers,
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  },
};
