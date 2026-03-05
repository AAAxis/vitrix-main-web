// Vercel serverless: POST /api/send-booster-email
// 1) Sends booster request email TO coachEmail via SMTP2GO. 2) Sends push to coach. Used by Vitrix-RN app.
import admin from 'firebase-admin';
import fs from 'fs';

const SMTP2GO_API_URL = 'https://api.smtp2go.com/v3/email/send';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const SENDER_EMAIL = process.env.SMTP2GO_SENDER_EMAIL || 'result@roamjet.net';
const SENDER_NAME = process.env.SMTP2GO_SENDER_NAME || 'Vitrix App';

let adminInitialized = false;
async function ensureFirebaseAdmin() {
  if (adminInitialized || admin.apps.length) return;
  try {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'muscule-up',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId: process.env.FIREBASE_PROJECT_ID || 'muscule-up',
      });
    } else if (fs.existsSync('./muscule-up-924cedf05ad5.json')) {
      admin.initializeApp({ credential: admin.credential.cert('./muscule-up-924cedf05ad5.json'), projectId: 'muscule-up' });
    }
    adminInitialized = true;
  } catch (e) {
    console.warn('Firebase Admin init skip:', e.message);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { coachEmail, userName, userEmail, title = '🚀 בקשה להצטרפות לתכנית הבוסטר', message = '' } = req.body || {};

    if (!coachEmail) {
      res.status(400).json({ success: false, error: 'Coach email is required' });
      return;
    }

    const apiKey = process.env.SMTP2GO_API_KEY;
    if (!apiKey) {
      res.status(500).json({ success: false, error: 'SMTP2GO_API_KEY not configured' });
      return;
    }

    const htmlBody = message || `המתאמן/ת ${userName || userEmail || 'מתאמן'} מבקש/ת להצטרף לתכנית הבוסטר.`;
    const emailRes = await fetch(SMTP2GO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        to: [coachEmail],
        sender: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        subject: title,
        html_body: htmlBody,
      }),
    });
    const data = await emailRes.json();

    if (data.data?.succeeded === 0) {
      const err = data.data?.failures?.[0] || data.data?.error || 'Failed to send email';
      res.status(500).json({ success: false, error: err });
      return;
    }

    // Send push to coach (Expo Push Token stored in Firestore)
    let pushSent = false;
    await ensureFirebaseAdmin();
    if (admin.apps.length) {
      const db = admin.firestore();
      const usersSnap = await db.collection('users').where('email', '==', coachEmail).limit(1).get();
      const coachToken = usersSnap.empty ? null : usersSnap.docs[0].data().fcm_token;
      if (coachToken && typeof coachToken === 'string' && coachToken.startsWith('ExponentPushToken')) {
        try {
          const pushRes = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              to: coachToken,
              title: 'בקשה לבוסטר',
              body: htmlBody.replace(/<[^>]*>/g, '').trim().slice(0, 120) || `${userName || userEmail || 'מתאמן'} מבקש/ת להצטרף לתכנית הבוסטר`,
              data: { type: 'booster_request', user_email: userEmail || '', user_name: userName || '' },
              sound: 'default',
            }),
          });
          const pushResult = await pushRes.json();
          pushSent = Array.isArray(pushResult.data) && pushResult.data[0]?.status === 'ok';
        } catch (e) {
          console.warn('Booster push send failed:', e.message);
        }
      }
    }

    res.status(200).json({ success: true, email: coachEmail, pushSent });
  } catch (error) {
    console.error('send-booster-email error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
