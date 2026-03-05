// API endpoint to send email for booster request
// Uses SMTP2GO (same as Vitrix-RN and api/send-booster-email.js)

export async function POST(request) {
  try {
    const requestBody = await request.json();
    const {
      coachEmail,
      userName,
      userEmail,
      title = '🚀 בקשה להצטרפות לתכנית הבוסטר',
      message = '',
    } = requestBody;

    if (!coachEmail) {
      return Response.json({ error: 'Coach email is required' }, { status: 400 });
    }

    const apiKey = process.env.SMTP2GO_API_KEY;
    if (!apiKey) {
      return Response.json(
        { success: false, error: 'SMTP2GO_API_KEY not configured' },
        { status: 500 }
      );
    }

    const senderEmail = process.env.SMTP2GO_SENDER_EMAIL || 'result@roamjet.net';
    const senderName = process.env.SMTP2GO_SENDER_NAME || 'Vitrix App';
    const htmlBody = message || `המתאמן/ת ${userName || userEmail || 'מתאמן'} מבקש/ת להצטרף לתכנית הבוסטר.`;

    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        to: [coachEmail],
        sender: `${senderName} <${senderEmail}>`,
        subject: title,
        html_body: htmlBody,
      }),
    });

    const data = await response.json();

    if (data.data?.succeeded > 0) {
      return Response.json({ success: true, email: coachEmail });
    }
    const err = data.data?.failures?.[0] || data.data?.error || 'Failed to send email';
    return Response.json({ success: false, error: err }, { status: 500 });
  } catch (error) {
    console.error('Booster email API error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
