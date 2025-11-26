const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../config/aws');
const crypto = require('crypto');
const path = require('path');

/**
 * Upload file to S3 bucket
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} originalName - Original filename
 * @param {String} mimeType - File MIME type
 * @param {String} folder - S3 folder path (e.g., 'profile-pics', 'chat-media')
 * @param {String} userIdentifier - User ID or name to use in filename (optional)
 * @returns {Promise<String>} - S3 file URL
 */
exports.uploadFile = async (fileBuffer, originalName, mimeType, folder = 'uploads', userIdentifier = null) => {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME is not configured');
    }

    // Generate filename using user identifier or original name
    const fileExt = path.extname(originalName);
    const timestamp = Date.now();
    let fileName;
    
    if (userIdentifier) {
      // Use user identifier (ID or name) + timestamp to avoid overwriting
      fileName = `${folder}/${userIdentifier}_${timestamp}${fileExt}`;
    } else {
      // Fallback to original name with timestamp
      const baseName = path.basename(originalName, fileExt);
      fileName = `${folder}/${baseName}_${timestamp}${fileExt}`;
    }

    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType
      // ACL removed - use bucket policy for public access instead
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // Generate S3 URL
    const region = process.env.AWS_S3_REGION || process.env.AWS_REGION || 'us-east-1';
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;

    console.log('✅ File uploaded to S3:', fileUrl);
    return fileUrl;
  } catch (error) {
    console.error('❌ Error uploading file to S3:', error);
    throw error;
  }
};

/**
 * Upload profile picture to S3
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} originalName - Original filename
 * @param {String} mimeType - File MIME type
 * @param {String} userIdentifier - User ID or name to use in filename
 * @returns {Promise<String>} - S3 file URL
 */
exports.uploadProfilePicture = async (fileBuffer, originalName, mimeType, userIdentifier, folderName) => {
  return exports.uploadFile(fileBuffer, originalName, mimeType, folderName || 'profile-pictures', userIdentifier);
};

/**
 * Upload message media (images/videos/documents) to S3
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} originalName - Original filename
 * @param {String} mimeType - File MIME type
 * @param {String} userId - User ID for folder organization
 * @returns {Promise<String>} - S3 file URL
 */
exports.uploadMessageMedia = async (fileBuffer, originalName, mimeType, userId) => {
  return exports.uploadFile(fileBuffer, originalName, mimeType, 'chat-media', userId);
};

/**
 * Delete file from S3 bucket
 * @param {String} fileUrl - Full S3 URL of the file to delete
 * @returns {Promise<Boolean>} - Success status
 */
exports.deleteFile = async (fileUrl) => {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    
    if (!bucketName || !fileUrl) {
      return false;
    }

    // Extract key from URL
    const urlParts = fileUrl.split('.com/');
    if (urlParts.length < 2) {
      console.error('Invalid S3 URL format');
      return false;
    }
    
    const key = urlParts[1];

    const params = {
      Bucket: bucketName,
      Key: key
    };

    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);

    console.log('✅ File deleted from S3:', key);
    return true;
  } catch (error) {
    console.error('❌ Error deleting file from S3:', error);
    return false;
  }
};

module.exports = exports;
