// This file represents a serverless function endpoint, for example, on Vercel or Netlify.
// It is not directly run by the frontend, but is called via a fetch request.
// In a real project, this would be deployed as part of a backend or serverless infrastructure.

// Assuming a modern JavaScript runtime that supports Request and Response objects.

export async function POST(request) {
  try {
    const { to, subject, html } = await request.json();

    // IMPORTANT: API keys should be stored as environment variables, not hardcoded.
    // The user should set RESEND_API_KEY in their deployment environment.
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
        console.error('RESEND_API_KEY is not set in environment variables.');
        return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Manajer Usaha <onboarding@resend.dev>', // resend requires a verified domain, using their test domain for now.
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (resendResponse.ok) {
      const data = await resendResponse.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      const errorData = await resendResponse.json();
      console.error('Resend API Error:', errorData);
      return new Response(JSON.stringify({ error: 'Failed to send email.', details: errorData }), {
        status: resendResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error processing email request:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
