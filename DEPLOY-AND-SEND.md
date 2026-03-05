# Full guide: Deploy Firebase Functions and send notifications & emails

This guide covers deploying the Muscle Up Firebase Cloud Functions and sending **push notifications** and **group emails** from the dashboard (or API).

---

## 1. Prerequisites

- **Node.js** 20+ (for Cloud Functions)
- **Firebase CLI**: `npm install -g firebase-tools`
- **Firebase project** (e.g. `muscule-up`) with Blaze (pay-as-you-go) plan for Cloud Functions
- **SMTP2Go** account and API key (for emails; same as booster emails)

---

## 2. One-time setup

### 2.1 Login and select project

```bash
cd /path/to/muscle-up-main
firebase login
firebase use muscule-up   # or your project ID
```

### 2.2 Install function dependencies

```bash
cd functions
npm install
cd ..
```

### 2.3 Configure environment for Cloud Functions

Group emails use **SMTP2Go**. Set these in **Google Cloud Console** so the deployed functions can send email:

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select project **muscule-up** (or your project).
2. Go to **Cloud Functions** → select the function **sendGroupEmail** (you can set env after first deploy).
3. Click **Edit** → open **Runtime, build, connections and security** → **Environment variables**.
4. Add:
   - `SMTP2GO_API_KEY` = your SMTP2Go API key (required)
   - `SMTP2GO_SENDER_EMAIL` = e.g. `result@roamjet.net` (optional)
   - `SMTP2GO_SENDER_NAME` = e.g. `Vitrix App` (optional)

If you use **generateImage** or **chatCompletion**, also set:

- **Secrets**: Firebase uses Secret Manager for `OPENAI_API_KEY`.
  - First deploy, then: **Cloud Console → Security → Secret Manager** → create secret `OPENAI_API_KEY` with your key.
  - Or via CLI:  
    `firebase functions:secrets:set OPENAI_API_KEY`  
    (paste the key when prompted).

---

## 3. Deploy

From the **repo root** (`muscle-up-main`):

### Deploy all functions

```bash
firebase deploy --only functions
```

### Deploy only notification + email (faster)

```bash
firebase deploy --only functions:sendFCMNotification,functions:sendGroupEmail
```

### Deploy a single function

```bash
firebase deploy --only functions:sendFCMNotification
firebase deploy --only functions:sendGroupEmail
```

### Check deploy result

- CLI will print the function URLs and any errors.
- **Firebase Console** → **Build → Functions** to see status and logs.

---

## 4. How sending works from the dashboard

The dashboard uses **Firebase Authentication** and calls **callable** Cloud Functions. The user must be **logged in** to the dashboard (same Firebase project).

### 4.1 Push notifications (FCM)

- **Where**: e.g. **Group Notifications**, **User Management**, **Booster Program**, **Weekly Task Manager** (wherever you have “Send notification”).
- **What the dashboard sends**:
  - **userEmail** or **userId** (to resolve the device)
  - **title**, **body**
  - Optional: **imageUrl**, **data** (payload)
- **Backend**: `sendFCMNotification` looks up `fcm_tokens` (by `userId` or by email → user doc → `userId`), then sends via Firebase Cloud Messaging.

**To send from the UI:**

1. Log in to the dashboard.
2. Open the screen (e.g. Group Notifications).
3. Choose a group or user, enter title and body.
4. Click the button that sends the notification (e.g. “Send notification”).
5. Success/error appears in the UI; check **Firebase Console → Functions → Logs** if needed.

### 4.2 Group (or single) emails

- **Where**: **Group Messaging**, **Group Notifications**, **Workout Creator**, **Booster Program**, **Weekly Task Manager** (wherever you have “Send email”).
- **What the dashboard sends**:
  - **groupName** (e.g. group name) **or** **userEmail** (single user)
  - **title**, **message**
- **Backend**: `sendGroupEmail` finds users in Firestore (by group or email), then sends one email per user via **SMTP2Go**.

**To send from the UI:**

1. Log in to the dashboard.
2. Open the screen (e.g. Group Messaging or Group Notifications).
3. Select group or enter user email, enter subject and message.
4. Click the button that sends the email.
5. UI shows how many emails were sent; check **Functions → sendGroupEmail → Logs** on errors.

---

## 5. Sending from code (dashboard / API)

### 5.1 Push notification (JavaScript)

```javascript
import { sendFCMNotification } from '@/api/integrations'; // or firebaseFunctions

await sendFCMNotification({
  userEmail: 'user@example.com',  // or userId: 'firebase-uid'
  title: 'Hello',
  body: 'This is the notification text.',
  data: { type: 'custom', id: '123' },  // optional
  imageUrl: 'https://...'               // optional
});
```

### 5.2 Group / single email (JavaScript)

```javascript
import { sendGroupEmail } from '@/api/integrations';

// To a group
await sendGroupEmail({
  groupName: 'My Group',
  title: 'Subject',
  message: 'Body text'
});

// To one user
await sendGroupEmail({
  userEmail: 'user@example.com',
  title: 'Subject',
  message: 'Body text'
});
```

---

## 6. Local testing (optional)

### 6.1 Run dashboard against production Firebase

- Dashboard already uses production Firebase config (`firebaseConfig.js` / `VITE_FIREBASE_*`).
- Run the dashboard (e.g. `npm run dev`), log in, then use the UI to send; it will call the **deployed** functions.

### 6.2 Emulate functions locally

```bash
cd functions
npm run serve
```

Then point the dashboard to the emulator (see [Firebase emulator docs](https://firebase.google.com/docs/emulator-suite/connect_and_prototype)); you’d need to set env (e.g. `.env` in `functions/`) for SMTP2Go so `sendGroupEmail` can send from the emulator.

---

## 7. Troubleshooting

| Issue | What to check |
|-------|----------------|
| **“sendGroupEmail function not found”** | Deploy: `firebase deploy --only functions:sendGroupEmail`. Ensure dashboard uses same Firebase project and region (`us-central1`). |
| **“SMTP2GO_API_KEY is not configured”** | Set `SMTP2GO_API_KEY` (and optionally sender) in Cloud Console → Cloud Functions → sendGroupEmail → Environment variables. |
| **“User must be authenticated”** | User must be logged in to the dashboard (Firebase Auth). |
| **“No active FCM tokens found”** | User must have the app installed and have granted notification permission so the app registers the token in `fcm_tokens`. |
| **Emails not sent** | Check Functions logs for `sendGroupEmail`; confirm SMTP2Go key and sender; check Firestore for correct `group_names` or `email` on users. |

---

## 8. Quick reference

| Goal | Command / action |
|------|-------------------|
| Deploy all functions | `firebase deploy --only functions` |
| Deploy only send + email | `firebase deploy --only functions:sendFCMNotification,functions:sendGroupEmail` |
| Set SMTP2Go for emails | Cloud Console → Functions → sendGroupEmail → Environment variables |
| Send push from dashboard | Use “Send notification” in Group Notifications / User Management / etc. |
| Send email from dashboard | Use “Send email” in Group Messaging / Group Notifications / etc. |
| Call from code | `sendFCMNotification({ userEmail, title, body })` / `sendGroupEmail({ groupName, title, message })` from `@/api/integrations` |
