import { Resend } from 'resend';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { to, subject, html } = body;
    
    const resend = new Resend(env.RESEND_API_KEY);
    const fromEmail = env.RESEND_FROM_EMAIL || 'hotel@shotabdi-abashik.bd';
    
    const data = await resend.emails.send({
      from: `Hotel Shotabdi Abashik <${fromEmail}>`,
      to: [to],
      subject,
      html,
    });

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
