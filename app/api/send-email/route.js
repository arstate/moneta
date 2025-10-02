// This file represents a serverless function endpoint, for example, on Vercel or Netlify.
// It is not directly run by the frontend, but is called via a fetch request.
// In a real project, this would be deployed as part of a backend or serverless infrastructure.

// Assuming a modern JavaScript runtime that supports Request and Response objects,
// and that the 'resend' package is available in the environment.
import { Resend } from 'resend';

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
    
    // Initialize Resend with the API key from environment variables
    const resend = new Resend(resendApiKey);

    // Send the email using the Resend SDK
    const { data, error } = await resend.emails.send({
      from: 'Manajer Usaha <onboarding@resend.dev>', // resend requires a verified domain, using their test domain for now.
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Resend API Error:', error);
      return new Response(JSON.stringify({ error: 'Failed to send email.', details: error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing email request:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
