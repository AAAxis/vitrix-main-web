// Vercel serverless: POST /api/send-group-email
// Sends email via SMTP2Go. Single user: send to userEmail. Group: lookup users in Firestore by group_names.
// Used by dashboard (booster, group messaging). Uses Vercel env SMTP2GO_* so no Firebase config needed for single-user.
import admin from 'firebase-admin';
import fs from 'fs';

const SMTP2GO_API_URL = 'https://api.smtp2go.com/v3/email/send';

let adminInitialized = false;
async function ensureFirebaseAdmin() {
  if (adminInitialized || admin.apps.length) return;
  try {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'muscule-up',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'muscule-up',
      });
      adminInitialized = true;
    } else if (fs.existsSync('./muscule-up-924cedf05ad5.json')) {
      admin.initializeApp({
        credential: admin.credential.cert('./muscule-up-924cedf05ad5.json'),
        projectId: process.env.FIREBASE_PROJECT_ID || 'muscule-up',
      });
      adminInitialized = true;
    }
  } catch (e) {
    console.warn('Firebase Admin init:', e.message);
  }
}

async function sendOneEmail(apiKey, sender, toEmail, subject, htmlBody) {
  const res = await fetch(SMTP2GO_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      to: [toEmail],
      sender,
      subject,
      html_body: htmlBody,
    }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
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

  const apiKey = process.env.SMTP2GO_API_KEY;
  const senderEmail = process.env.SMTP2GO_SENDER_EMAIL || 'result@roamjet.net';
  const senderName = process.env.SMTP2GO_SENDER_NAME || 'Vitrix App';
  const sender = `${senderName} <${senderEmail}>`;

  if (!apiKey) {
    res.status(500).json({ success: false, error: 'SMTP2GO_API_KEY not configured' });
    return;
  }

  try {
    const { groupName, userEmail: targetUserEmail, title = 'הודעה מהמאמן', message = '' } = req.body || {};

    if (!groupName && !targetUserEmail) {
      res.status(400).json({ error: 'Either group name or user email is required' });
      return;
    }
    if (!title || !message) {
      res.status(400).json({ error: 'Title and message are required' });
      return;
    }

    let toSend = []; // { email, name }

    if (targetUserEmail) {
      // Single user: send directly to this email (no Firestore needed – dashboard already has the address)
      toSend.push({ email: targetUserEmail.trim(), name: 'מתאמן/ת' });
    } else {
      // Group: need Firestore to resolve emails
      await ensureFirebaseAdmin();
      if (!admin.apps.length) {
        res.status(500).json({ success: false, error: 'Firebase Admin not initialized; cannot resolve group' });
        return;
      }
      const db = admin.firestore();
      const snapshot = await db.collection('users').where('group_names', 'array-contains', groupName).get();
      snapshot.docs.forEach((doc) => {
        const d = doc.data();
        const email = d.email || d.actualEmail || d.userEmail;
        if (email && typeof email === 'string' && email.includes('@')) {
          toSend.push({ email, name: d.name || 'מתאמן/ת' });
        }
      });
    }

    if (toSend.length === 0) {
      res.status(200).json({
        success: true,
        successCount: 0,
        failureCount: 0,
        totalUsers: 0,
        message: targetUserEmail ? 'No recipient' : `No users in group ${groupName}`,
      });
      return;
    }

    let successCount = 0;
    let failureCount = 0;
    const results = [];

    for (const { email, name } of toSend) {
      const emailText = `שלום ${name},\n\n${message}`;
      const htmlBody = emailText.replace(/\n/g, '<br>\n');
      const { ok, data } = await sendOneEmail(apiKey, sender, email, title, htmlBody);
      if (ok && data?.data?.succeeded > 0) {
        successCount++;
        results.push({ email, success: true });
      } else {
        failureCount++;
        const err = data?.data?.failures?.[0] || data?.data?.error || 'Send failed';
        results.push({ email, success: false, error: err });
      }
    }

    res.status(200).json({
      success: true,
      successCount,
      failureCount,
      totalUsers: toSend.length,
      results,
    });
  } catch (error) {
    console.error('send-group-email error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
