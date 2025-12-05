// API endpoint to track when a user opens a notification
import admin from 'firebase-admin';
import fs from 'fs';

// Initialize Firebase Admin SDK
let adminInitialized = false;

async function initializeAdmin() {
  if (adminInitialized || admin.apps.length) {
    return;
  }

  try {
    let credential;
    
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'muscule-up',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    } else {
      try {
        if (fs.existsSync('./muscule-up-924cedf05ad5.json')) {
          credential = admin.credential.cert('./muscule-up-924cedf05ad5.json');
        } else {
          credential = null;
        }
      } catch (fsError) {
        credential = null;
      }
    }

    if (credential) {
      admin.initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'muscule-up',
      });
      adminInitialized = true;
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
  }
}

initializeAdmin();

export class NextResponse {
  constructor(body, init = {}) {
    this.body = typeof body === 'string' ? body : JSON.stringify(body);
    this.status = init.status || 200;
    this.headers = { 'Content-Type': 'application/json', ...init.headers };
  }

  static json(data, init = {}) {
    return new NextResponse(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } });
  }
}

export async function POST(request) {
  await initializeAdmin();
  
  try {
    const requestBody = await request.json();
    const { 
      messageId,
      userEmail,
      userId,
      openType = 'notification' // 'notification' or 'email'
    } = requestBody;

    console.log('📊 Tracking notification open:', {
      messageId,
      userEmail,
      userId,
      openType
    });

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    if (!userEmail && !userId) {
      return NextResponse.json(
        { error: 'Either userEmail or userId is required' },
        { status: 400 }
      );
    }

    if (!admin.apps.length) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK not initialized' },
        { status: 500 }
      );
    }

    const db = admin.firestore();
    const messageRef = db.collection('group_messages').doc(messageId);
    const messageDoc = await messageRef.get();

    if (!messageDoc.exists) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    const messageData = messageDoc.data();
    const readReceipts = messageData.read_receipts || [];

    // Find and update the user's read receipt
    let updated = false;
    const updatedReceipts = readReceipts.map(receipt => {
      const matchesUser = 
        (userEmail && receipt.user_email === userEmail) ||
        (userId && receipt.user_id === userId);

      if (matchesUser) {
        updated = true;
        const now = new Date().toISOString();
        
        if (openType === 'notification') {
          return {
            ...receipt,
            notification_opened: true,
            notification_opened_timestamp: now,
            is_read: receipt.is_read || true, // Mark as read if notification opened
            read_timestamp: receipt.read_timestamp || now
          };
        } else if (openType === 'email') {
          return {
            ...receipt,
            email_opened: true,
            email_opened_timestamp: now,
            is_read: receipt.is_read || true, // Mark as read if email opened
            read_timestamp: receipt.read_timestamp || now
          };
        }
      }
      return receipt;
    });

    if (!updated) {
      // User not found in read receipts, add them
      const now = new Date().toISOString();
      const newReceipt = {
        user_email: userEmail || 'unknown',
        user_name: 'unknown',
        user_id: userId || 'unknown',
        is_read: true,
        read_timestamp: now,
        notification_opened: openType === 'notification',
        notification_opened_timestamp: openType === 'notification' ? now : null,
        email_opened: openType === 'email',
        email_opened_timestamp: openType === 'email' ? now : null
      };
      updatedReceipts.push(newReceipt);
    }

    // Update the message document
    await messageRef.update({
      read_receipts: updatedReceipts
    });

    console.log('✅ Notification open tracked successfully');

    return NextResponse.json({
      success: true,
      message: 'Notification open tracked',
      openType
    });

  } catch (error) {
    console.error('❌ Error tracking notification open:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
