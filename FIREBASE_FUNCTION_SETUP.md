# Firebase Cloud Function Setup for FCM Notifications

Since you're using client-side only, you need to create a Firebase Cloud Function to send FCM notifications.

## Setup Instructions

### 1. Initialize Firebase Functions (if not already done)

```bash
cd /path/to/your/project
firebase init functions
```

Select:
- JavaScript (or TypeScript if you prefer)
- Install dependencies with npm

### 2. Install Dependencies

```bash
cd functions
npm install firebase-admin firebase-functions
```

### 3. Add the Function

**Option A: Add to existing `functions/index.js`**

Add this code to your `functions/index.js`:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

// Copy the sendFCMNotification function from functions/sendFCMNotification.js
exports.sendFCMNotification = functions.region('us-central1').https.onCall(async (data, context) => {
  // ... (copy the entire function code from sendFCMNotification.js)
});
```

**Option B: Use the standalone file**

If you have a modular setup, you can import it:

```javascript
// functions/index.js
const sendFCMNotification = require('./sendFCMNotification');
exports.sendFCMNotification = sendFCMNotification.sendFCMNotification;
```

### 4. Deploy the Function

```bash
firebase deploy --only functions:sendFCMNotification
```

**Important:** Make sure you're in the project root directory when running this command.

### 5. Verify Deployment

After deployment, check:
1. Firebase Console → Functions → You should see `sendFCMNotification` listed
2. The function URL will be: `https://us-central1-muscule-up.cloudfunctions.net/sendFCMNotification`
3. The client code will automatically call it using `httpsCallable` (no CORS issues)

### 6. Test the Function

After deployment, try sending a notification from the web app. Check:
- Browser console for any errors
- Firebase Functions logs in Firebase Console
- Mobile device for the notification

## Alternative: Quick Setup

If you already have a `functions` directory:

1. Copy `functions/sendFCMNotification.js` to your `functions/index.js`
2. Make sure `firebase-admin` and `firebase-functions` are in `functions/package.json`
3. Run `firebase deploy --only functions`

## Testing

After deployment, test by clicking the "שלח תזכורת" button in UserManagement. Check:
- Browser console for success/error messages
- Firebase Functions logs in Firebase Console
- Mobile device for the notification

## Troubleshooting

- **Function not found**: Make sure you deployed the function with the exact name `sendFCMNotification`
- **Permission denied**: The function requires authentication - make sure the user is logged in
- **No tokens found**: Check that FCM tokens are being saved to Firestore in the `fcm_tokens` collection

