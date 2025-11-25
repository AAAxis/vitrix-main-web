# FCM Notification Setup (No Admin SDK Required)

This setup uses FCM REST API directly, no Firebase Admin SDK needed.

## Setup Instructions

### 1. Get FCM Server Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **muscule-up**
3. Go to **Project Settings** (gear icon) → **Cloud Messaging** tab
4. Find **Server key** (under Cloud Messaging API (Legacy))
5. Copy the server key

### 2. Add Environment Variable in Vercel

1. Go to your Vercel project: **muscle-up-main**
2. Go to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `FCM_SERVER_KEY`
   - **Value**: Paste the server key you copied
   - **Environment**: Production, Preview, and Development (select all)
4. Click **Save**

### 3. Redeploy

After adding the environment variable, redeploy:
- Go to **Deployments** → Click **⋯** on latest deployment → **Redeploy**
- Or push a new commit

### 4. Test

After redeployment, try sending a notification from the web app.

## How It Works

1. Client gets FCM token from Firestore (using client SDK)
2. Client calls `/api/send-notification` with the token
3. Vercel function uses FCM REST API to send notification
4. No Admin SDK needed!

## Troubleshooting

### Error: "FCM Server Key not configured"
- Make sure `FCM_SERVER_KEY` is set in Vercel
- Redeploy after adding the variable

### Error: "No FCM token found"
- Check that FCM tokens are saved in Firestore
- Tokens should be in `fcm_tokens` collection or `users` document as `fcm_token` field

### Error: "FCM API error"
- Check that the server key is correct
- Verify Cloud Messaging API is enabled in Firebase Console

