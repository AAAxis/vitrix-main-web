# Vercel Serverless Function Setup for FCM Notifications

You're using Vercel serverless functions (NOT Firebase Cloud Functions). Here's how to set it up:

## Setup Instructions

### 1. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **muscule-up**
3. Go to **Project Settings** (gear icon) → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file (this contains your service account credentials)

### 2. Add Environment Variable in Vercel

1. Go to your Vercel project: **muscle-up-main**
2. Go to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Copy the entire contents of the JSON file you downloaded
   - **Environment**: Production, Preview, and Development (select all)
4. Click **Save**

**Important**: The value should be the entire JSON as a string, like:
```json
{"type":"service_account","project_id":"muscule-up",...}
```

### 3. Redeploy

After adding the environment variable, you need to redeploy:

1. Go to **Deployments** tab in Vercel
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger a new deployment

### 4. Test

After redeployment, try sending a notification from the web app. The function should work now.

## Troubleshooting

### Error: "Firebase Admin SDK not initialized"
- Make sure `FIREBASE_SERVICE_ACCOUNT` is set in Vercel
- Make sure you redeployed after adding the variable
- Check that the JSON is valid (no extra quotes or escaping)

### Error: "Internal server error"
- Check Vercel Function Logs (Deployments → Function Logs)
- Verify the service account JSON is correct
- Make sure the service account has the right permissions

### Error: "No FCM tokens found"
- Check Firestore `fcm_tokens` collection
- Verify tokens exist with `active: true`
- Check that `userId` matches the user's document ID

## Verify Setup

1. Check Vercel Function Logs for any initialization errors
2. Test by clicking "שלח תזכורת" button in UserManagement
3. Check browser console for success/error messages
4. Check mobile device for the notification

