import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { fetchAndActivate, getValue } from 'firebase/remote-config';
import { storage, remoteConfig } from './firebaseConfig';
import { auth } from './firebaseConfig';

// File Upload
export const UploadFile = async ({ file, path = 'uploads' }) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to upload files');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name}`;
    const fileRef = ref(storage, `${path}/${currentUser.uid}/${filename}`);

    // Upload file
    const snapshot = await uploadBytes(fileRef, file);
    const file_url = await getDownloadURL(snapshot.ref);

    return {
      file_url,
      file_path: snapshot.ref.fullPath,
      filename: filename
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Upload Private File
export const UploadPrivateFile = async ({ file, path = 'private' }) => {
  // Same as UploadFile but in a private folder
  return UploadFile({ file, path });
};

// Create File Signed URL (for private files)
export const CreateFileSignedUrl = async (filePath, expiresIn = 3600) => {
  try {
    const fileRef = ref(storage, filePath);
    // Note: For signed URLs, you might need to use Firebase Admin SDK on the backend
    // For now, we'll return the download URL
    const url = await getDownloadURL(fileRef);
    return { signed_url: url };
  } catch (error) {
    console.error('Error creating signed URL:', error);
    throw error;
  }
};

// Send Email - DEPRECATED: Use CoachNotification instead
export const SendEmail = async (emailData) => {
  console.warn('SendEmail is deprecated. Use CoachNotification.create() instead.');
  throw new Error('SendEmail is no longer supported. Please use CoachNotification.create() for notifications.');
};

// Get ChatGPT API key from Remote Config (with fallback to env var for development)
const getChatGPTApiKey = async () => {
  // First, try environment variable (useful for development)
  const envApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (envApiKey) {
    return envApiKey;
  }

  try {
    // Fetch and activate remote config
    await fetchAndActivate(remoteConfig);
    const apiKeyValue = getValue(remoteConfig, 'openai_api_key');
    const apiKey = apiKeyValue.asString();
    
    if (!apiKey) {
      throw new Error('ChatGPT API key not configured in Remote Config');
    }
    
    return apiKey;
  } catch (error) {
    console.error('Error fetching API key from Remote Config:', error);
    throw new Error('Failed to get ChatGPT API key. Please configure it in Firebase Remote Config or set VITE_OPENAI_API_KEY environment variable.');
  }
};

// Invoke LLM using ChatGPT API (no Cloud Function needed)
export const InvokeLLM = async (params) => {
  try {
    // Handle both old format (prompt, options) and new format (object with prompt)
    const prompt = typeof params === 'string' ? params : params.prompt;
    const options = typeof params === 'string' ? {} : params;
    const responseJsonSchema = options.response_json_schema;
    
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    console.log('InvokeLLM called with:', { hasPrompt: !!prompt, hasSchema: !!responseJsonSchema });

    // Get API key from Remote Config
    const apiKey = await getChatGPTApiKey();
    
    if (!apiKey) {
      throw new Error('ChatGPT API key is missing. Please configure it in Firebase Remote Config or set VITE_OPENAI_API_KEY environment variable.');
    }

    // Prepare the request body for OpenRouter
    let finalPrompt = prompt;
    
    // If JSON schema is provided, ensure the prompt explicitly requests JSON
    if (responseJsonSchema) {
      if (!prompt.includes('JSON') && !prompt.includes('json')) {
        finalPrompt = `${prompt}\n\nחשוב מאוד: החזר תשובה בפורמט JSON בלבד, ללא טקסט נוסף לפני או אחרי ה-JSON. התשובה חייבת להתחיל ב-{ ולהסתיים ב-}.`;
      }
    }

    const requestBody = {
      model: options.model || 'gpt-4o-mini', // Default model, can be overridden
      messages: [
        {
          role: 'system',
          content: responseJsonSchema 
            ? 'You are a helpful assistant that returns responses in JSON format only. Always use English keys in the JSON object (like "workout_title", "workout_description"). However, ALL content values must be in Hebrew if the user requests Hebrew content. Return ONLY valid JSON, no additional text before or after.'
            : 'You are a helpful assistant. If the user writes in Hebrew, respond in Hebrew. If the user writes in English, respond in English.'
        },
        {
          role: 'user',
          content: finalPrompt
        }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 4000 // Increased for longer responses
    };

    // Add response format if JSON schema is provided
    if (responseJsonSchema) {
      requestBody.response_format = {
        type: 'json_object'
      };
    }

    console.log('Sending request to ChatGPT:', { 
      model: requestBody.model, 
      hasJsonFormat: !!requestBody.response_format,
      promptLength: finalPrompt.length 
    });

    // Call ChatGPT API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }
      console.error('ChatGPT API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`ChatGPT API error: ${response.status} ${response.statusText}. ${errorData.error?.message || errorText}`);
    }

    const data = await response.json();
    console.log('ChatGPT response received:', { 
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasContent: !!data.choices?.[0]?.message?.content
    });
    
    // Extract the content from the response
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No content in response:', data);
      throw new Error('No content in ChatGPT response. Response structure: ' + JSON.stringify(data));
    }

    console.log('Response content length:', content.length);
    console.log('Response content preview:', content.substring(0, 200));

    // If JSON schema was requested, parse the JSON response
    if (responseJsonSchema) {
      try {
        // Try to extract JSON from the response (in case there's extra text)
        let jsonString = content.trim();
        
        // Remove markdown code blocks if present
        jsonString = jsonString.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
        
        // Try to find JSON object
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
        
        const parsed = JSON.parse(jsonString);
        console.log('Successfully parsed JSON response');
        return parsed;
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        console.error('Raw response content:', content);
        console.error('Content length:', content.length);
        throw new Error(`Failed to parse JSON response from AI: ${parseError.message}. Response preview: ${content.substring(0, 500)}`);
      }
    }

    return { content };
  } catch (error) {
    console.error('Error invoking LLM via ChatGPT:', error);
    throw error;
  }
};

// Generate Image using OpenAI DALL-E API directly (frontend-only, no backend needed)
export const GenerateImage = async (params) => {
  try {
    // Handle both old format (prompt, options) and new format (object with prompt)
    const prompt = typeof params === 'string' ? params : params.prompt;
    const options = typeof params === 'string' ? {} : params;
    
    if (!prompt) {
      throw new Error('Prompt is required for image generation');
    }

    // Get API key from Remote Config or environment
    const apiKey = await getChatGPTApiKey(); // Reuse the same function for OpenAI API key
    
    if (!apiKey) {
      throw new Error('OpenAI API key is missing. Please configure it in Firebase Remote Config or set VITE_OPENAI_API_KEY environment variable.');
    }

    // Prepare the request for OpenAI DALL-E API
    const model = options.model || 'dall-e-3'; // dall-e-2 or dall-e-3
    const size = options.size || '1024x1024';
    
    // DALL-E 3 size validation
    const validSizes = model === 'dall-e-3' 
      ? ['1024x1024', '1792x1024', '1024x1792']
      : ['256x256', '512x512', '1024x1024'];
    
    const finalSize = validSizes.includes(size) ? size : '1024x1024';

    const requestBody = {
      model: model,
      prompt: prompt,
      size: finalSize,
      quality: options.quality || 'standard', // 'standard' or 'hd' (DALL-E 3 only)
      response_format: 'url'
    };

    // DALL-E 3 only supports n=1, DALL-E 2 can have multiple images
    if (model === 'dall-e-2') {
      requestBody.n = options.n || 1;
    }

    console.log('Generating image with OpenAI DALL-E:', { 
      model, 
      size: finalSize, 
      promptLength: prompt.length 
    });

    // Call OpenAI DALL-E API directly
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI DALL-E API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`OpenAI DALL-E API error: ${response.status} ${response.statusText}. ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('OpenAI DALL-E response received:', { 
      hasData: !!data.data,
      imageCount: data.data?.length || 0
    });
    
    // Extract the image URL from the response and return in expected format
    if (data.data && data.data.length > 0) {
      const imageData = data.data[0];
      return {
        url: imageData.url,
        revised_prompt: imageData.revised_prompt || prompt
      };
    } else {
      throw new Error('No image data in OpenAI response');
    }
  } catch (error) {
    console.error('Error generating image with OpenAI DALL-E:', error);
    throw error;
  }
};

// Extract Data From Uploaded File - DEPRECATED: Cloud Function removed due to CORS issues
export const ExtractDataFromUploadedFile = async (fileUrl, options = {}) => {
  console.warn('ExtractDataFromUploadedFile is deprecated due to Cloud Function CORS issues.');
  throw new Error('ExtractDataFromUploadedFile is no longer supported due to Cloud Function CORS issues.');
};

// Core integrations object (matching Base44 structure)
export const Core = {
  UploadFile,
  UploadPrivateFile,
  CreateFileSignedUrl,
  SendEmail, // DEPRECATED - Use CoachNotification instead
  InvokeLLM,
  GenerateImage,
  ExtractDataFromUploadedFile // DEPRECATED - Cloud Function removed
};

