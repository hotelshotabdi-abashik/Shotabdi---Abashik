export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);
    
    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PUT, DELETE, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Email Sending Endpoint via Resend
    if (request.method === 'POST' && url.pathname === '/send-email') {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${env.AUTH_KEY_SECRET}`) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }

      try {
        const body = await request.json();
        const { to, subject, html } = body;

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Hotel Shotabdi Abashik <hotel@shotabdi-abashik.bd>',
            reply_to: 'hotelshotabdiabashik@gmail.com',
            to: [to],
            subject: subject,
            html: html
          })
        });

        const resendData = await resendResponse.json();
        return new Response(JSON.stringify(resendData), {
          status: resendResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // R2 Upload/Delete/Get
    if (request.method === 'PUT' || request.method === 'DELETE') {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${env.AUTH_KEY_SECRET}`) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }
    }

    switch (request.method) {
      case 'PUT':
        await env.MY_BUCKET.put(key, request.body);
        return new Response(`Put ${key} successfully!`, { headers: corsHeaders });
      case 'GET':
        const object = await env.MY_BUCKET.get(key);
        if (object === null) {
          return new Response('Object Not Found', { status: 404, headers: corsHeaders });
        }
        const headers = new Headers(corsHeaders);
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        return new Response(object.body, { headers });
      case 'DELETE':
        await env.MY_BUCKET.delete(key);
        return new Response('Deleted!', { headers: corsHeaders });
      default:
        return new Response('Method Not Allowed', {
          status: 405,
          headers: { Allow: 'PUT, GET, DELETE, POST', ...corsHeaders },
        });
    }
  },

  // Email Receiving (Cloudflare Email Routing)
  async email(message, env, ctx) {
    // Forward incoming emails to the admin Gmail address
    await message.forward("hotelshotabdiabashik@gmail.com");
  }
};
