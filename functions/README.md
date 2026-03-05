# Firebase Cloud Functions

This directory contains Firebase Cloud Functions for the Muscle Up application.

**Full deploy and send guide:** see [DEPLOY-AND-SEND.md](../DEPLOY-AND-SEND.md) in the repo root (prerequisites, env vars, deploy commands, how to send notifications and emails from the dashboard).

## Functions

### `sendFCMNotification`
Sends FCM (Firebase Cloud Messaging) push notifications to users.

**Parameters:**
- `userId` (string, optional): User ID to send notification to
- `userEmail` (string, optional): User email to send notification to (will look up userId)
- `title` (string, required): Notification title
- `body` (string, required): Notification body
- `data` (object, optional): Additional data payload
- `imageUrl` (string, optional): Image URL for the notification

**Returns:**
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "sent": 1,
  "failed": 0,
  "totalTokens": 1
}
```

## Setup

1. Install dependencies:
```bash
cd functions
npm install
```

2. Make sure you have Firebase CLI installed:
```bash
npm install -g firebase-tools
```

3. Login to Firebase:
```bash
firebase login
```

## Deployment

Deploy all functions:
```bash
firebase deploy --only functions
```

Deploy a specific function:
```bash
firebase deploy --only functions:sendFCMNotification
```

## Local Development

Run the Firebase emulator:
```bash
npm run serve
```

## Testing

You can test the function using the Firebase console or by calling it from your client application:

```javascript
const sendNotification = firebase.functions().httpsCallable('sendFCMNotification');
const result = await sendNotification({
  userId: 'user123',
  title: 'Test Notification',
  body: 'This is a test notification',
});
```
