export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    try {
      const body = await request.json();
      const { to, subject, html } = body;

      if (!to || !subject || !html) {
        return new Response(JSON.stringify({ error: 'Missing required fields (to, subject, html)' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // Use the API key from environment variables, or fallback to the provided one
      const RESEND_API_KEY = env.RESEND_API_KEY || "re_ZRcYHhjA_GqfXpkrqynRs8J6cVCwSbpZk";
      const fromEmail = env.RESEND_FROM_EMAIL || 'notifications@shotabdi-abashik.bd';

      // Ensure the email has the Shotabdi logo and name.
      // If the frontend didn't already wrap it, we wrap it here.
      let finalHtml = html;
      if (!html.includes('shotabdi%20logo.png')) {
        finalHtml = `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-bottom: 1px solid #e2e8f0;">
              <img src="https://pub-c0b44c83d9824fb19234fdfbbd92001e.r2.dev/logo/shotabdi%20logo.png" alt="Hotel Shotabdi Abashik" style="max-height: 80px; width: auto;" />
            </div>
            <div style="padding: 40px; color: #1e293b; line-height: 1.6;">
              ${html}
            </div>
            <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e293b; font-size: 14px;">Hotel Shotabdi Abashik</p>
              <p style="margin: 0;">Kumargaon, Sylhet, Bangladesh</p>
              <p style="margin: 5px 0 0 0;">24h Residential Service</p>
            </div>
          </div>
        `;
      }

      // Send the email using Resend's REST API
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${RESEND_API_KEY}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: \`Hotel Shotabdi Abashik <\${fromEmail}>\`,
          to: Array.isArray(to) ? to : [to],
          subject: subject,
          html: finalHtml
        })
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.text();
        console.error('Resend API Error:', errorData);
        return new Response(JSON.stringify({ error: 'Failed to send email via Resend', details: errorData }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const data = await resendResponse.json();

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      console.error('Worker Error:', error);
      return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};
