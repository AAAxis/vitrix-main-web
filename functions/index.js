// Firebase Cloud Functions
// This is the main entry point for all Firebase Functions

const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');
const {setGlobalOptions} = require('firebase-functions/v2');
const {defineSecret} = require('firebase-functions/params');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// In Firebase Functions, admin is automatically initialized
// But we can explicitly initialize if needed
if (!admin.apps.length) {
  admin.initializeApp();
}

// Set global options for 2nd gen functions
setGlobalOptions({
  region: 'us-central1',
});

// Define secrets
const openaiApiKey = defineSecret('OPENAI_API_KEY');

// Export the sendFCMNotification function
exports.sendFCMNotification = onCall(async (request) => {
  const {data, auth} = request;
  const context = {auth};
  // Verify user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to send notifications'
    );
  }

  const { userId, userEmail, title, body, data: notificationData, imageUrl } = data;

  // Validate required fields
  if (!title || !body) {
    throw new HttpsError(
      'invalid-argument',
      'Title and body are required'
    );
  }

  if (!userId && !userEmail) {
    throw new HttpsError(
      'invalid-argument',
      'Either userId or userEmail must be provided'
    );
  }

  try {
    const db = admin.firestore();
    let fcmTokens = [];

    if (userId) {
      // Query by userId
      const tokensSnapshot = await db.collection('fcm_tokens')
        .where('userId', '==', userId)
        .where('active', '==', true)
        .get();

      fcmTokens = tokensSnapshot.docs.map(doc => doc.data().token);
    } else if (userEmail) {
      // First, get userId from users collection
      const usersSnapshot = await db.collection('users')
        .where('email', '==', userEmail)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        throw new HttpsError(
          'not-found',
          `No user found with email: ${userEmail}`
        );
      }

      const userIdFromEmail = usersSnapshot.docs[0].id;

      // Query by userId
      const tokensSnapshot = await db.collection('fcm_tokens')
        .where('userId', '==', userIdFromEmail)
        .where('active', '==', true)
        .get();

      fcmTokens = tokensSnapshot.docs.map(doc => doc.data().token);
    }

    if (fcmTokens.length === 0) {
      throw new HttpsError(
        'not-found',
        `No active FCM tokens found for user: ${userId || userEmail}`
      );
    }

    // Prepare notification payload
    const message = {
      notification: {
        title: title,
        body: body,
        ...(imageUrl && { imageUrl: imageUrl }),
      },
      data: {
        ...(notificationData || {}),
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'vitrix_notifications',
          sound: 'default',
          priority: 'high',
          ...(imageUrl && { imageUrl: imageUrl }),
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            alert: {
              title: title,
              body: body,
            },
          },
        },
      },
    };

    // Send notifications to all tokens
    const results = await Promise.allSettled(
      fcmTokens.map(token =>
        admin.messaging().send({
          ...message,
          token: token,
        })
      )
    );

    // Count successes and failures
    const successes = results.filter(r => r.status === 'fulfilled').length;
    const failures = results.filter(r => r.status === 'rejected').length;

    // Log failures and mark invalid tokens as inactive
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to send to token ${index + 1}:`, result.reason);

        // If token is invalid, mark it as inactive
        if (
          result.reason?.code === 'messaging/invalid-registration-token' ||
          result.reason?.code === 'messaging/registration-token-not-registered'
        ) {
          db.collection('fcm_tokens')
            .where('token', '==', fcmTokens[index])
            .get()
            .then(snapshot => {
              snapshot.docs.forEach(doc => {
                doc.ref.update({ active: false });
              });
            });
        }
      }
    });

    if (successes === 0) {
      throw new HttpsError(
        'internal',
        'All notification attempts failed'
      );
    }

    return {
      success: true,
      message: 'Notification sent successfully',
      sent: successes,
      failed: failures,
      totalTokens: fcmTokens.length,
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      'internal',
      `Error sending notification: ${error.message}`
    );
  }
});

// DALL-E Image Generation Function
exports.generateImage = onCall({
  timeoutSeconds: 120,
  memory: '512MiB',
  secrets: [openaiApiKey],
}, async (request) => {
  const {data} = request;
  
  try {
    if (!data) {
      throw new HttpsError('invalid-argument', 'No data provided');
    }
    
    const prompt = data.prompt;
    if (!prompt) {
      throw new HttpsError('invalid-argument', 'Prompt is required');
    }
    
    // Get OpenAI API key from secret
    const OPENAI_API_KEY = openaiApiKey.value();
    if (!OPENAI_API_KEY) {
      throw new HttpsError('failed-precondition', 'OpenAI API key not configured');
    }
    
    const IMAGE_MODEL = process.env.IMAGE_MODEL || 'dall-e-3';
    const size = data.size || '1024x1024';
    
    const payload = {
      model: IMAGE_MODEL,
      prompt: prompt,
      size: size,
      response_format: 'url',
    };
    
    // DALL-E 3 only supports n=1 and specific sizes
    if (IMAGE_MODEL === 'dall-e-3') {
      if (!['1024x1024', '1792x1024', '1024x1792'].includes(size)) {
        payload.size = '1024x1024';
      }
    } else {
      // DALL-E 2 supports n parameter
      payload.n = 1;
    }
    
    const apiUrl = 'https://api.openai.com/v1/images/generations';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      let errorMsg = response.statusText;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error?.message || errorData.error || errorMsg;
      } catch (e) {
        // Ignore JSON parse errors
      }
      throw new HttpsError(
        'internal',
        `API error: ${response.status} - ${errorMsg}`
      );
    }
    
    const result = await response.json();
    
    // Extract image URL from response
    if (result.data && result.data.length > 0) {
      const imageData = result.data[0];
      return {
        url: imageData.url || imageData.b64_json,
        revised_prompt: imageData.revised_prompt,
      };
    } else {
      throw new HttpsError('internal', 'No image data in response');
    }
  } catch (error) {
    console.error('Error generating image:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      throw new HttpsError('deadline-exceeded', 'Request timeout - image generation took too long');
    }
    throw new HttpsError('internal', `Error generating image: ${error.message}`);
  }
});

// Chat Completion Function
exports.chatCompletion = onCall({
  timeoutSeconds: 60,
  memory: '512MiB',
  secrets: [openaiApiKey],
}, async (request) => {
  const {data} = request;
  
  try {
    if (!data) {
      throw new HttpsError('invalid-argument', 'No data provided');
    }
    
    // Handle both message format and simple prompt format
    let messages = data.messages;
    if (!messages) {
      const prompt = data.prompt;
      if (!prompt) {
        throw new HttpsError('invalid-argument', 'Either messages or prompt is required');
      }
      messages = [{role: 'user', content: prompt}];
    }
    
    // Get OpenAI API key from secret
    const OPENAI_API_KEY = openaiApiKey.value();
    if (!OPENAI_API_KEY) {
      throw new HttpsError('failed-precondition', 'OpenAI API key not configured');
    }
    
    const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini';
    
    const payload = {
      model: data.model || CHAT_MODEL,
      messages: messages,
      temperature: data.temperature || 0.7,
      max_tokens: data.max_tokens || 4000,
      top_p: data.top_p || 1,
      frequency_penalty: data.frequency_penalty || 0,
      presence_penalty: data.presence_penalty || 0,
    };
    
    // Add response format if specified
    if (data.response_format) {
      payload.response_format = data.response_format;
    }
    
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      let errorMsg = response.statusText;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error?.message || errorData.error || errorMsg;
      } catch (e) {
        // Ignore JSON parse errors
      }
      throw new HttpsError(
        'internal',
        `API error: ${response.status} - ${errorMsg}`
      );
    }
    
    const result = await response.json();
    
    // Return the full response (compatible with OpenAI format)
    return result;
  } catch (error) {
    console.error('Error in chat completion:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      throw new HttpsError('deadline-exceeded', 'Request timeout - chat completion took too long');
    }
    throw new HttpsError('internal', `Error in chat completion: ${error.message}`);
  }
});

// Analyze Food Image Function
exports.analyzeFoodImage = onCall({
  timeoutSeconds: 60,
  memory: '512MiB',
  secrets: [openaiApiKey],
}, async (request) => {
  const {data} = request;
  
  try {
    if (!data) {
      throw new HttpsError('invalid-argument', 'No data provided');
    }
    
    const imageUrl = data.imageUrl;
    if (!imageUrl) {
      throw new HttpsError('invalid-argument', 'Image URL is required');
    }
    
    // Get OpenAI API key from secret
    const OPENAI_API_KEY = openaiApiKey.value();
    if (!OPENAI_API_KEY) {
      throw new HttpsError('failed-precondition', 'OpenAI API key not configured');
    }
    
    // Prepare the prompt in Hebrew for food analysis
    const systemPrompt = `אתה מומחה תזונה מוסמך עם ניסיון של 15 שנה בניתוח ארוחות. המשימה שלך היא לבצע ניתוח מקצועי ומדויק של התמונה של האוכל.

חשוב מאוד:
- זהה את סוגי המזון בתמונה
- הערך את הכמויות (גרמים/כוסות/יחידות) ככל האפשר
- חשב קלוריות, חלבונים, פחמימות ושומנים
- תן תיאור מפורט של האוכל בעברית
- ציין יתרונות (pros) וחסרונות (cons) של האוכל בעברית
- היה שמרני בהערכות אם אינך בטוח

השב בפורמט JSON עם השדות הבאים:
- calories: מספר הקלוריות המשוער
- description: תיאור מפורט של האוכל בעברית
- pros: רשימת יתרונות בעברית (מערך של מחרוזות)
- cons: רשימת חסרונות בעברית (מערך של מחרוזות)
- protein: גרמי חלבון (מספר)
- carbs: גרמי פחמימות (מספר)
- fat: גרמי שומן (מספר)
- confidence: רמת ביטחון ('גבוה', 'בינוני', 'נמוך')`;

    const userPrompt = `בצע ניתוח מקצועי של התמונה של האוכל. זהה את המזונות, הערך כמויות, חשב ערכים תזונתיים, ותן תיאור מפורט עם יתרונות וחסרונות בעברית.`;

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userPrompt
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl
            }
          }
        ]
      }
    ];

    const payload = {
      model: 'gpt-4o', // Use GPT-4o for vision capabilities
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
      response_format: {
        type: 'json_object'
      }
    };

    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      let errorMsg = response.statusText;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error?.message || errorData.error || errorMsg;
      } catch (e) {
        // Ignore JSON parse errors
      }
      throw new HttpsError(
        'internal',
        `API error: ${response.status} - ${errorMsg}`
      );
    }
    
    const result = await response.json();
    
    // Extract the content from the response
    if (!result.choices || result.choices.length === 0) {
      throw new HttpsError('internal', 'No response from AI');
    }
    
    const content = result.choices[0].message.content;
    
    // Parse the JSON response
    let analysisData;
    try {
      analysisData = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from the response if it's wrapped
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new HttpsError('internal', 'Failed to parse AI response as JSON');
      }
    }
    
    // Ensure all required fields are present with defaults
    return {
      calories: analysisData.calories || 0,
      description: analysisData.description || 'לא ניתן לזהות את האוכל בתמונה',
      pros: analysisData.pros || [],
      cons: analysisData.cons || [],
      protein: analysisData.protein || 0,
      carbs: analysisData.carbs || 0,
      fat: analysisData.fat || 0,
      confidence: analysisData.confidence || 'נמוך'
    };
  } catch (error) {
    console.error('Error analyzing food image:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      throw new HttpsError('deadline-exceeded', 'Request timeout - image analysis took too long');
    }
    throw new HttpsError('internal', `Error analyzing food image: ${error.message}`);
  }
});

// Health check endpoint
exports.health = onRequest(async (req, res) => {
  res.json({
    status: 'ok',
    service: 'dalle',
    version: '2.0.0',
  });
});
