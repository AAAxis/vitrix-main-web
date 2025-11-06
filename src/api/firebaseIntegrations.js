import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { storage, functions } from './firebaseConfig';
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

// Send Email (requires Cloud Function)
export const SendEmail = async (emailData) => {
  try {
    const sendEmailFunction = httpsCallable(functions, 'sendEmail');
    const result = await sendEmailFunction(emailData);
    return result.data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Invoke LLM (requires Cloud Function)
export const InvokeLLM = async (prompt, options = {}) => {
  try {
    const invokeLLMFunction = httpsCallable(functions, 'invokeLLM');
    const result = await invokeLLMFunction({ prompt, ...options });
    return result.data;
  } catch (error) {
    console.error('Error invoking LLM:', error);
    throw error;
  }
};

// Generate Image (requires Cloud Function)
export const GenerateImage = async (prompt, options = {}) => {
  try {
    const generateImageFunction = httpsCallable(functions, 'generateImage');
    const result = await generateImageFunction({ prompt, ...options });
    return result.data;
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
};

// Extract Data From Uploaded File (requires Cloud Function)
export const ExtractDataFromUploadedFile = async (fileUrl, options = {}) => {
  try {
    const extractDataFunction = httpsCallable(functions, 'extractDataFromFile');
    const result = await extractDataFunction({ fileUrl, ...options });
    return result.data;
  } catch (error) {
    console.error('Error extracting data from file:', error);
    throw error;
  }
};

// Core integrations object (matching Base44 structure)
export const Core = {
  UploadFile,
  UploadPrivateFile,
  CreateFileSignedUrl,
  SendEmail,
  InvokeLLM,
  GenerateImage,
  ExtractDataFromUploadedFile
};

