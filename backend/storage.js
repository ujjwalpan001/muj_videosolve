/**
 * Google Cloud Storage Integration
 * Upload videos and audio files to GCS bucket
 */

import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize GCS with service account
const storage = new Storage({
  keyFilename: path.join(__dirname, 'gen-lang-client-0984354674-ea557af59d84.json'),
  projectId: 'gen-lang-client-0984354674'
});

console.log('✅ Google Cloud Storage initialized');

// Bucket name
const BUCKET_NAME = '3davatar-videoss';

const bucket = storage.bucket(BUCKET_NAME);

console.log(`📦 Using GCS bucket: ${BUCKET_NAME}`);

/**
 * Upload video file to Google Cloud Storage
 * @param {string} localFilePath - Path to local video file
 * @param {string} userId - User ID for organizing files
 * @param {string} sessionId - Session ID for the video
 * @returns {Promise<string>} - Public URL of uploaded file
 */
async function uploadVideo(localFilePath, userId, sessionId) {
  try {
    const fileName = path.basename(localFilePath);
    const destination = `videos/${userId}/${sessionId}/${fileName}`;

    console.log(`� Uploading video to GCS: ${fileName}`);

    // Upload file to GCS
    await bucket.upload(localFilePath, {
      destination: destination,
      metadata: {
        contentType: 'video/mp4',
        cacheControl: 'public, max-age=31536000',
        metadata: {
          userId: userId,
          sessionId: sessionId,
          uploadedAt: new Date().toISOString()
        }
      },
      gzip: false, // Don't compress videos
      public: true // Make publicly accessible
    });

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`;
    
    console.log(`✅ Video uploaded successfully: ${publicUrl}`);

    // Optional: Delete local file after upload to save space
    // fs.unlinkSync(localFilePath);

    return publicUrl;
  } catch (error) {
    console.error('❌ Error uploading video to GCS:', error.message);
    // Re-throw with more context
    throw new Error(`Failed to upload video to GCS: ${error.message}`);
  }
}

/**
 * Upload audio file to Google Cloud Storage
 * @param {string} localFilePath - Path to local audio file
 * @param {string} userId - User ID for organizing files
 * @param {string} sessionId - Session ID for the audio
 * @param {string} purpose - Purpose of audio (tts, narration, lipsync)
 * @returns {Promise<string>} - Public URL of uploaded file
 */
async function uploadAudio(localFilePath, userId, sessionId, purpose = 'tts') {
  try {
    const fileName = path.basename(localFilePath);
    const destination = `audio/${userId}/${sessionId}/${purpose}_${fileName}`;

    console.log(`📤 Uploading audio to GCS: ${destination}`);

    const contentType = localFilePath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';

    await bucket.upload(localFilePath, {
      destination: destination,
      metadata: {
        contentType: contentType,
        cacheControl: 'public, max-age=31536000',
        metadata: {
          userId: userId,
          sessionId: sessionId,
          purpose: purpose,
          uploadedAt: new Date().toISOString()
        }
      },
      public: true
    });

    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`;
    
    console.log(`✅ Audio uploaded successfully: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error('❌ Error uploading audio to GCS:', error);
    throw error;
  }
}

/**
 * Delete file from GCS
 * @param {string} gcsUrl - Public URL of the file
 */
async function deleteFile(gcsUrl) {
  try {
    // Extract file path from URL
    const urlParts = gcsUrl.split(`${BUCKET_NAME}/`);
    if (urlParts.length < 2) {
      throw new Error('Invalid GCS URL');
    }
    
    const filePath = urlParts[1];
    await bucket.file(filePath).delete();
    
    console.log(`🗑️ Deleted file from GCS: ${filePath}`);
  } catch (error) {
    console.error('❌ Error deleting file from GCS:', error);
    throw error;
  }
}

/**
 * Get signed URL for private file access (if not public)
 * @param {string} filePath - Path to file in bucket
 * @param {number} expiresIn - Expiration time in minutes (default 60)
 * @returns {Promise<string>} - Signed URL
 */
async function getSignedUrl(filePath, expiresIn = 60) {
  const options = {
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresIn * 60 * 1000
  };

  const [url] = await bucket.file(filePath).getSignedUrl(options);
  return url;
}

/**
 * Check if bucket exists, create if not
 */
async function ensureBucketExists() {
  try {
    const [exists] = await bucket.exists();
    
    if (!exists) {
      console.log(`📦 Creating bucket: ${BUCKET_NAME}`);
      await storage.createBucket(BUCKET_NAME, {
        location: 'US',
        storageClass: 'STANDARD'
      });
      console.log(`✅ Bucket created: ${BUCKET_NAME}`);
    } else {
      console.log(`✅ Bucket exists: ${BUCKET_NAME}`);
    }
  } catch (error) {
    console.error('❌ Error checking/creating bucket:', error);
    throw error;
  }
}

export {
  uploadVideo,
  uploadAudio,
  deleteFile,
  getSignedUrl,
  ensureBucketExists,
  BUCKET_NAME
};
