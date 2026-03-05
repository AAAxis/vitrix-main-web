// Vercel serverless function (for Vercel deployment)
// Push: FCM for Android; direct APNs for iOS (when APNS_* env set). No Expo.
import admin from 'firebase-admin';
import fs from 'fs';
import http2 from 'http2';
import jwt from 'jsonwebtoken';

// Initialize Firebase Admin SDK
let adminInitialized = false;

async function initializeAdmin() {
  if (adminInitialized || admin.apps.length) {
    return;
  }

  try {
    let credential;

    // Try to use environment variables first (production)
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'muscule-up',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
      console.log('✅ Firebase Admin SDK initialized with environment variables');
    }
    // Fallback to service account file (development only - won't work on Vercel)
    else {
      try {
        if (fs.existsSync('./muscule-up-924cedf05ad5.json')) {
          credential = admin.credential.cert('./muscule-up-924cedf05ad5.json');
          console.log('✅ Firebase Admin SDK initialized with service account file');
        } else {
          console.warn('⚠️ No Firebase Admin credentials found. Will use FCM REST API fallback.');
          credential = null;
        }
      } catch (fsError) {
        console.warn('⚠️ Could not check for service account file:', fsError.message);
        credential = null;
      }
    }

    if (credential) {
      admin.initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'muscule-up',
      });
      console.log('✅ Firebase Admin app initialized successfully');
      adminInitialized = true;
    } else {
      console.log('⚠️ Firebase Admin SDK not initialized - will use FCM REST API fallback');
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
  }
}

// Initialize on module load
initializeAdmin();

// Vercel serverless function handler
export default async function handler(req, res) {
  // Ensure admin is initialized
  await initializeAdmin();

  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const requestBody = req.body;
    const {
      title,
      body: messageBody,
      tokens = [],
      apnsTokens = [],
      topic,
      data = {},
      imageUrl,
      email,
      projectId,
      templateId
    } = requestBody;

    const fcmTokens = Array.isArray(tokens)
      ? tokens.filter(t => typeof t === 'string' && !t.startsWith('ExponentPushToken'))
      : [];
    const apnsTokenList = Array.isArray(apnsTokens) ? apnsTokens.filter(t => typeof t === 'string' && t.length > 0) : [];

    console.log('📱 FCM API called with:', {
      title,
      body: messageBody?.substring(0, 50) + '...',
      tokenCount: fcmTokens.length,
      apnsTokenCount: apnsTokenList.length,
      topic,
      hasImageUrl: !!imageUrl
    });

    // Validation
    if (!title || !messageBody) {
      console.error('❌ Validation failed: Title and body are required');
      res.status(400).json({
        error: 'Title and body are required'
      });
      return;
    }

    if (!fcmTokens.length && !topic && !apnsTokenList.length) {
      console.error('❌ Validation failed: Either tokens, apnsTokens, or topic is required');
      res.status(400).json({
        error: 'Either tokens, apnsTokens, or topic is required'
      });
      return;
    }

    let apnsSuccessCount = 0;
    let apnsFailureCount = 0;

    // iOS: send via Apple APNs when env is set (same .p8 as in Firebase Console)
    if (apnsTokenList.length > 0) {
      const APNS_KEY = process.env.APNS_KEY || process.env.APNS_PRIVATE_KEY;
      const APNS_KEY_ID = process.env.APNS_KEY_ID;
      const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
      const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID || process.env.APP_BUNDLE_ID;
      const apnsProduction = process.env.APNS_PRODUCTION !== 'false';

      if (APNS_KEY && APNS_KEY_ID && APNS_TEAM_ID && APNS_BUNDLE_ID) {
        const key = APNS_KEY.replace(/\\n/g, '\n');
        const apnsHost = apnsProduction ? 'api.push.apple.com' : 'api.sandbox.push.apple.com';
        let apnsJwt = null;
        const getApnsJwt = () => {
          const now = Math.floor(Date.now() / 1000);
          if (apnsJwt && apnsJwt.exp > now + 300) return apnsJwt.token;
          const token = jwt.sign(
            { iss: APNS_TEAM_ID, iat: now },
            key,
            { algorithm: 'ES256', keyid: APNS_KEY_ID, expiresIn: '1h' }
          );
          apnsJwt = { token, exp: now + 3600 };
          return token;
        };
        const apsPayload = {
          aps: {
            alert: { title, body: messageBody },
            sound: 'default',
            ...(imageUrl && { 'mutable-content': 1 })
          },
          ...data,
          timestamp: Date.now().toString(),
          source: 'dashboard',
          notificationTitle: title,
          notificationBody: messageBody,
          ...(imageUrl && { imageUrl })
        };
        const payloadStr = JSON.stringify(apsPayload);

        for (const deviceToken of apnsTokenList) {
          try {
            const auth = getApnsJwt();
            const path = `/3/device/${deviceToken}`;
            const response = await new Promise((resolve, reject) => {
              const client = http2.connect(`https://${apnsHost}`, () => {});
              const headers = {
                ':method': 'POST',
                ':path': path,
                'apns-topic': APNS_BUNDLE_ID,
                'apns-push-type': 'alert',
                'apns-priority': '10',
                'authorization': `bearer ${auth}`,
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(payloadStr, 'utf8')
              };
              const req = client.request(headers);
              req.on('response', (headers) => {
                const status = headers[':status'];
                let body = '';
                req.on('data', (chunk) => { body += chunk; });
                req.on('end', () => {
                  client.close();
                  resolve({ status: parseInt(status, 10), body });
                });
              });
              req.on('error', (err) => {
                client.close();
                reject(err);
              });
              req.write(payloadStr);
              req.end();
            });
            if (response.status === 200) {
              apnsSuccessCount++;
            } else {
              apnsFailureCount++;
            }
          } catch (err) {
            apnsFailureCount++;
          }
        }
      } else {
        apnsFailureCount += apnsTokenList.length;
      }
    }

    // FCM
    const tokensToSend = fcmTokens.length ? fcmTokens : (topic ? null : []);
    // V1 API only supports: notification, data, token/topic at root level
    // Platform-specific options (android/apns) are NOT supported in V1 API
    const message = {
      notification: {
        title,
        body: messageBody,
        ...(imageUrl && { image: imageUrl }) // V1 API uses 'image' not 'imageUrl'
      },
      data: {
        ...data,
        timestamp: Date.now().toString(),
        source: 'dashboard',
        // Include notification data for custom handling in app
        notificationTitle: title,
        notificationBody: messageBody,
        ...(imageUrl && { imageUrl })
      }
    };

    console.log('📝 Built message payload:', JSON.stringify(message, null, 2));

    // Try Firebase Admin SDK first, then FCM REST API as fallback
    const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || process.env.NEXT_PUBLIC_FIREBASE_SERVER_KEY;

    let response;

    if (admin.apps.length) {
      // Use Firebase Admin SDK (V1 API - Recommended)
      console.log('📱 Using Firebase Admin SDK (V1 API)');
      const messaging = admin.messaging();

      if (topic) {
        // Send to topic using V1 API
        message.topic = topic;
        console.log('📡 Sending to topic:', topic);
        response = await messaging.send(message);
        console.log('✅ FCM notification sent to topic:', topic, 'Response:', response);
      } else if (tokensToSend && tokensToSend.length > 0) {
        // Send to specific FCM tokens (non-Expo only)
        console.log('📱 Sending to', tokensToSend.length, 'FCM token(s)...');

        const results = [];
        let successCount = 0;
        let failureCount = 0;
        const failedTokens = [];

        for (let i = 0; i < tokensToSend.length; i++) {
          const token = tokensToSend[i];
          try {
            console.log(`📤 Sending to token ${i + 1}/${tokensToSend.length}:`, token.substring(0, 20) + '...');

            const individualMessage = {
              ...message,
              token: token
            };

            const result = await messaging.send(individualMessage);
            results.push({ success: true, messageId: result });
            successCount++;
            console.log(`✅ Success for token ${i + 1}:`, result);
          } catch (error) {
            console.error(`❌ Failed for token ${i + 1}:`, error.message);
            results.push({ success: false, error: error.message });
            failedTokens.push(token);
            failureCount++;
          }
        }

        response = {
          success: true,
          successCount,
          failureCount,
          results
        };
      } else {
        response = {
          success: true,
          successCount: apnsSuccessCount,
          failureCount: apnsFailureCount,
          results: []
        };
      }
    } else if (FCM_SERVER_KEY && (topic || (tokensToSend && tokensToSend.length > 0))) {
      // Use FCM REST API
      if (topic) {
        // Send to topic using FCM REST API
        message.to = `/topics/${topic}`;
        console.log('📡 Sending to topic via REST API:', topic);

        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${FCM_SERVER_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });

        const fcmResult = await fcmResponse.json();

        if (fcmResponse.ok) {
          console.log('✅ FCM notification sent to topic:', topic, 'Response:', fcmResult);
          response = { success: true, messageId: fcmResult.message_id };
        } else {
          console.error('❌ FCM topic send failed:', fcmResult);
          response = { success: false, error: fcmResult.error || 'Unknown error' };
        }
      } else {
        // Send to specific tokens using FCM REST API
        const ids = tokensToSend && tokensToSend.length > 0 ? tokensToSend : [];
        console.log('📱 Sending to', ids.length, 'FCM token(s) via REST API...');

        const fcmMessage = {
          ...message,
          registration_ids: ids
        };

        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${FCM_SERVER_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fcmMessage),
        });

        const fcmResult = await fcmResponse.json();

        if (fcmResponse.ok) {
          console.log('✅ FCM notifications sent:', fcmResult);
          response = {
            success: true,
            successCount: fcmResult.success || 0,
            failureCount: fcmResult.failure || 0,
            results: fcmResult.results || []
          };
        } else {
          console.error('❌ FCM send failed:', fcmResult);
          response = { success: false, error: fcmResult.error || 'Unknown error' };
        }
      }
    } else {
      if (apnsTokenList.length > 0) {
        response = {
          success: true,
          successCount: apnsSuccessCount,
          failureCount: apnsFailureCount,
          results: []
        };
      } else if (tokensToSend?.length || topic) {
        response = { success: false, error: 'FCM credentials not configured' };
      } else {
        console.error('❌ No FCM credentials configured');
        res.status(500).json({
          success: false,
          error: 'FCM credentials not configured',
          message: 'Either FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL or FCM_SERVER_KEY environment variable is required'
        });
        return;
      }
    }

    const fcmSuccess = response.successCount ?? (response.success ? 1 : 0);
    const fcmFailure = response.failureCount ?? 0;
    const successCount = fcmSuccess + apnsSuccessCount;
    const failureCount = fcmFailure + apnsFailureCount;
    const totalCount = successCount + failureCount;

    console.log('📊 Final FCM stats:', {
      successCount,
      failureCount,
      totalCount,
      success: response.success
    });

    // Send emails via Roamjet API to all users who received the notification
    // Hardcoded fallback values for projectId and templateId
    const roamjetProjectId = projectId || process.env.ROAMJET_PROJECT_ID || 'eZl22S3z7Pl0oGA01qyH';
    const roamjetTemplateId = templateId || process.env.ROAMJET_TEMPLATE_ID || 'lbbVwGT1BLMw87C3oHbI';

    let emailResults = [];

    if (roamjetProjectId && roamjetTemplateId && admin.apps.length) {
      try {
        console.log('📧 Fetching user emails for email notifications...');
        const db = admin.firestore();

        // Get unique userIds from FCM tokens
        const userIds = new Set();

        if (tokens.length > 0) {
          // Query fcm_tokens collection to get userIds for the tokens
          const fcmTokensRef = db.collection('fcm_tokens');
          const tokenQueries = [];

          // Batch queries (Firestore 'in' query limit is 10)
          for (let i = 0; i < tokens.length; i += 10) {
            const tokenBatch = tokens.slice(i, i + 10);
            tokenQueries.push(
              fcmTokensRef.where('token', 'in', tokenBatch).get()
            );
          }

          const tokenSnapshots = await Promise.all(tokenQueries);
          tokenSnapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
              const data = doc.data();
              if (data.userId) {
                userIds.add(data.userId);
              }
            });
          });
        } else if (topic) {
          // For topic-based notifications, we can't easily get all user emails
          // Skip email sending for topics unless email is explicitly provided
          console.log('⚠️ Topic-based notifications: skipping automatic email sending');
        }

        // If explicit email provided, use it
        if (email) {
          userIds.clear(); // Clear userIds if explicit email is provided
        }

        // Fetch user emails from users collection
        const userEmails = [];

        if (email) {
          // Use explicit email if provided
          userEmails.push(email);
        } else if (userIds.size > 0) {
          // Fetch emails for all userIds
          const usersRef = db.collection('users');
          const userIdArray = Array.from(userIds);

          // Fetch each user document by ID
          const userDocPromises = userIdArray.map(userId =>
            usersRef.doc(userId).get()
          );

          const userDocs = await Promise.all(userDocPromises);
          userDocs.forEach(doc => {
            if (doc.exists) {
              const userData = doc.data();
              // Try to get email from various possible fields
              const userEmail = userData.actualEmail || userData.email || userData.userEmail;
              if (userEmail && typeof userEmail === 'string' && userEmail.includes('@')) {
                // Skip private relay emails
                if (!userEmail.includes('privaterelay.appleid.com')) {
                  userEmails.push(userEmail);
                }
              }
            }
          });
        }

        // Remove duplicates
        const uniqueEmails = [...new Set(userEmails)];

        console.log(`📧 Sending emails to ${uniqueEmails.length} users via Roamjet API...`);

        // Send email to each user
        for (const userEmail of uniqueEmails) {
          try {
            const roamjetUrl = new URL('https://smtp.roamjet.net/api/email/send');
            roamjetUrl.searchParams.set('email', userEmail);
            roamjetUrl.searchParams.set('project_id', roamjetProjectId);
            roamjetUrl.searchParams.set('template_id', roamjetTemplateId);
            roamjetUrl.searchParams.set('title', title);
            roamjetUrl.searchParams.set('text', messageBody);

            const roamjetRes = await fetch(roamjetUrl.toString(), {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            const emailRes = await roamjetRes.json();

            if (roamjetRes.ok) {
              console.log(`✅ Email sent to ${userEmail}:`, emailRes);
              emailResults.push({
                email: userEmail,
                success: true,
                messageId: emailRes.messageId
              });
            } else {
              console.error(`❌ Email send failed for ${userEmail}:`, emailRes);
              emailResults.push({
                email: userEmail,
                success: false,
                error: emailRes.error || 'Unknown error'
              });
            }
          } catch (emailError) {
            console.error(`❌ Email API error for ${userEmail}:`, emailError);
            emailResults.push({
              email: userEmail,
              success: false,
              error: emailError.message
            });
          }
        }

        console.log(`📊 Email sending complete: ${emailResults.filter(r => r.success).length}/${emailResults.length} successful`);
      } catch (emailError) {
        console.error('❌ Error fetching user emails or sending emails:', emailError);
        // Don't fail the entire request if email fails
      }
    } else {
      console.log('⚠️ Roamjet email not sent: missing projectId or templateId, or Firebase Admin not initialized');
    }

    res.status(200).json({
      success: response.success !== false,
      messageId: response.messageId || 'unknown',
      successCount,
      failureCount,
      totalCount,
      results: response.results || [],
      emails: {
        sent: emailResults.filter(r => r.success).length,
        failed: emailResults.filter(r => !r.success).length,
        total: emailResults.length,
        results: emailResults
      }
    });

  } catch (error) {
    console.error('❌ FCM API error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
