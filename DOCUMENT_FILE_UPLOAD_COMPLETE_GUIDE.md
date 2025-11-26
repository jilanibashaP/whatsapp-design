# Document File Upload - Complete Testing & Integration Guide

## 📋 Table of Contents
1. [Quick Overview](#quick-overview)
2. [What Was Changed](#what-was-changed)
3. [Testing the Backend](#testing-the-backend)
4. [Frontend Integration](#frontend-integration)
5. [Complete Example](#complete-example)

---

## 🎯 Quick Overview

Your messaging app now supports uploading:
- ✅ **Documents**: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint
- ✅ **Text Files**: .txt, .csv, .json, .xml
- ✅ **Archives**: .zip, .rar, .7z
- ✅ **Images & Videos**: (existing functionality maintained)

**Max file size**: 50MB  
**API Endpoint**: `POST /api/messages/upload-media`

---

## 🔧 What Was Changed

### Backend Files Modified:
1. **`upload.middleware.js`** - Added support for 15+ document types
2. **`message.controller.js`** - Auto-detects file type from MIME type
3. **`constants.js`** - Added document type constants
4. **`message.routes.js`** - Updated to accept all file types

### New Response Format:
```javascript
// Single file upload response
{
  "success": true,
  "data": {
    "url": "https://bucket.s3.amazonaws.com/chat-media/userId_123.pdf",
    "type": "file",           // auto-detected: 'image', 'video', 'audio', 'file'
    "mimeType": "application/pdf",
    "fileName": "document.pdf",
    "size": 1024000,
    "extension": "pdf"
  }
}
```

---

## 🧪 Testing the Backend

### Step 1: Start Your Server
```bash
cd whatsapp-be
npm start
```

### Step 2: Get Authentication Token
```bash
# Login first
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890", "otp": "123456"}'

# Copy the token from response
```

### Step 3: Test File Uploads

#### Test PDF Upload
```bash
curl -X POST http://localhost:3000/api/messages/upload-media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "media=@document.pdf"
```

#### Test Excel Upload
```bash
curl -X POST http://localhost:3000/api/messages/upload-media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "media=@spreadsheet.xlsx"
```

#### Test Multiple Files
```bash
curl -X POST http://localhost:3000/api/messages/upload-media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "media=@document.pdf" \
  -F "media=@image.jpg" \
  -F "media=@data.xlsx"
```

### Expected Success Response:
```json
{
  "success": true,
  "message": "File(s) uploaded successfully",
  "data": {
    "url": "https://your-bucket.s3.region.amazonaws.com/chat-media/userId_timestamp.pdf",
    "type": "file",
    "mimeType": "application/pdf",
    "fileName": "document.pdf",
    "size": 1024000,
    "extension": "pdf"
  }
}
```

### Using Postman:
1. Create POST request: `http://localhost:3000/api/messages/upload-media`
2. Authorization → Bearer Token → Paste your token
3. Body → form-data → Key: `media` (File type) → Select file
4. Send

---

## 🎨 Frontend Integration

### Step 1: Install Document Picker

```bash
cd whatsapp-fe
npx expo install expo-document-picker
```

### Step 2: Update API Service (`services/api.ts`)

Add or update the upload function:

```typescript
// services/api.ts

export const uploadMessageMedia = async (fileUri: string, mimeType?: string, fileName?: string) => {
  const formData = new FormData();
  
  formData.append('media', {
    uri: fileUri,
    type: mimeType || 'application/octet-stream',
    name: fileName || 'file'
  } as any);

  const response = await api.post('/messages/upload-media', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.data; // Returns { url, type, mimeType, fileName, size, extension }
};

// For multiple files
export const uploadMultipleFiles = async (files: Array<{uri: string, type: string, name: string}>) => {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('media', {
      uri: file.uri,
      type: file.type,
      name: file.name
    } as any);
  });

  const response = await api.post('/messages/upload-media', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.data; // Returns { files: [...], count: number }
};
```

### Step 3: Create Document Picker Hook

```typescript
// hooks/useDocumentPicker.ts

import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { uploadMessageMedia } from '@/services/api';

export const useDocumentPicker = () => {
  const [isUploading, setIsUploading] = useState(false);

  const pickAndUploadDocument = async () => {
    try {
      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv'
        ],
        copyToCacheDirectory: true
      });

      if (result.type === 'cancel') {
        return null;
      }

      setIsUploading(true);

      // Upload to S3
      const uploadedFile = await uploadMessageMedia(
        result.uri,
        result.mimeType,
        result.name
      );

      setIsUploading(false);

      return {
        ...uploadedFile,
        originalName: result.name
      };

    } catch (error) {
      setIsUploading(false);
      console.error('Document picker error:', error);
      throw error;
    }
  };

  return {
    pickAndUploadDocument,
    isUploading
  };
};
```

### Step 4: Add Document Picker to Chat Screen

```typescript
// app/contact-chat.tsx or your chat screen

import { useDocumentPicker } from '@/hooks/useDocumentPicker';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  const { socket } = useSocket();
  const { pickAndUploadDocument, isUploading } = useDocumentPicker();
  const { chatId } = useLocalSearchParams();

  const handleDocumentPick = async () => {
    try {
      const uploadedFile = await pickAndUploadDocument();
      
      if (uploadedFile) {
        // Send message with uploaded file
        socket?.emit('send_message', {
          chat_id: parseInt(chatId as string),
          content: uploadedFile.url,
          message_type: uploadedFile.type, // 'file', 'image', 'video', etc.
          caption: uploadedFile.originalName // Optional: file name as caption
        });
      }
    } catch (error) {
      Alert.alert('Upload Failed', 'Failed to upload document');
    }
  };

  return (
    <View>
      {/* Existing chat UI */}
      
      {/* Add document picker button */}
      <TouchableOpacity 
        onPress={handleDocumentPick}
        disabled={isUploading}
      >
        <Ionicons 
          name="document-attach" 
          size={24} 
          color={isUploading ? '#999' : '#007AFF'} 
        />
        {isUploading && <ActivityIndicator size="small" />}
      </TouchableOpacity>
    </View>
  );
}
```

### Step 5: Update Message Display Component

```typescript
// components/message-item.tsx

import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface MessageItemProps {
  message: {
    content: string;
    message_type: 'text' | 'image' | 'video' | 'audio' | 'file';
    caption?: string;
  };
}

export const MessageItem = ({ message }: MessageItemProps) => {
  const handleDownload = async (url: string, fileName: string) => {
    try {
      const downloadPath = FileSystem.documentDirectory + fileName;
      const { uri } = await FileSystem.downloadAsync(url, downloadPath);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      Alert.alert('Download Failed', 'Could not download file');
    }
  };

  // Render based on message type
  if (message.message_type === 'file') {
    const fileName = message.caption || 'Document';
    const extension = fileName.split('.').pop()?.toUpperCase() || 'FILE';

    return (
      <TouchableOpacity 
        onPress={() => handleDownload(message.content, fileName)}
        style={styles.fileContainer}
      >
        <View style={styles.fileIcon}>
          {extension === 'PDF' && <Ionicons name="document-text" size={32} color="#FF0000" />}
          {extension.includes('XLS') && <Ionicons name="stats-chart" size={32} color="#00AA00" />}
          {extension.includes('DOC') && <Ionicons name="document" size={32} color="#0066CC" />}
          {!['PDF', 'XLS', 'XLSX', 'DOC', 'DOCX'].includes(extension) && 
            <Ionicons name="document-attach" size={32} color="#666" />}
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName}>{fileName}</Text>
          <Text style={styles.fileType}>{extension}</Text>
        </View>
        <Ionicons name="download" size={24} color="#007AFF" />
      </TouchableOpacity>
    );
  }

  if (message.message_type === 'image') {
    return (
      <Image 
        source={{ uri: message.content }} 
        style={styles.messageImage}
      />
    );
  }

  // Text message
  return <Text>{message.content}</Text>;
};

const styles = StyleSheet.create({
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    gap: 12
  },
  fileIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8
  },
  fileInfo: {
    flex: 1
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000'
  },
  fileType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8
  }
});
```

### Step 6: Install Required Dependencies

```bash
# Install file system and sharing
npx expo install expo-file-system expo-sharing

# If using icons
npx expo install @expo/vector-icons
```

---

## 💡 Complete Example - Full Flow

### 1. User Picks Document
```typescript
const { pickAndUploadDocument, isUploading } = useDocumentPicker();

<Button 
  title="Attach Document" 
  onPress={async () => {
    const file = await pickAndUploadDocument();
    if (file) {
      // File uploaded successfully
      console.log('Uploaded:', file.url);
    }
  }}
  disabled={isUploading}
/>
```

### 2. Upload Response
```json
{
  "url": "https://bucket.s3.amazonaws.com/chat-media/user123_1234567890.pdf",
  "type": "file",
  "mimeType": "application/pdf",
  "fileName": "report.pdf",
  "size": 2048576,
  "extension": "pdf"
}
```

### 3. Send Message via Socket
```typescript
socket.emit('send_message', {
  chat_id: 123,
  content: file.url,
  message_type: file.type, // 'file'
  caption: file.fileName   // 'report.pdf'
});
```

### 4. Receive & Display Message
```typescript
socket.on('new_message', (message) => {
  // Message structure:
  // {
  //   id: 456,
  //   content: "https://bucket.s3.amazonaws.com/chat-media/user123_1234567890.pdf",
  //   message_type: "file",
  //   caption: "report.pdf",
  //   sender_id: 123,
  //   sent_at: "2025-11-26T10:00:00Z"
  // }
  
  // Render using MessageItem component
});
```

---

## 🎨 UI Improvements

### Add Icon Picker for File Type
```typescript
const getFileIcon = (extension: string) => {
  switch(extension.toLowerCase()) {
    case 'pdf': return { name: 'document-text', color: '#FF0000' };
    case 'doc':
    case 'docx': return { name: 'document', color: '#0066CC' };
    case 'xls':
    case 'xlsx': return { name: 'stats-chart', color: '#00AA00' };
    case 'ppt':
    case 'pptx': return { name: 'easel', color: '#FF6600' };
    case 'txt': return { name: 'document-text-outline', color: '#666' };
    case 'zip':
    case 'rar': return { name: 'archive', color: '#9933FF' };
    default: return { name: 'document-attach', color: '#666' };
  }
};
```

### Add Upload Progress
```typescript
const [uploadProgress, setUploadProgress] = useState(0);

// In upload function
const uploadWithProgress = async (fileUri: string) => {
  const xhr = new XMLHttpRequest();
  
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const progress = (e.loaded / e.total) * 100;
      setUploadProgress(progress);
    }
  });
  
  // ... rest of upload logic
};

// In UI
{isUploading && (
  <Progress.Bar 
    progress={uploadProgress / 100} 
    width={200} 
    color="#007AFF"
  />
)}
```

---

## 🔍 Testing Checklist

### Backend Tests:
- [ ] Upload single PDF → Check S3 bucket
- [ ] Upload Excel file → Verify response format
- [ ] Upload Word document → Check file type detection
- [ ] Upload multiple files → Verify all uploaded
- [ ] Try file >50MB → Should fail
- [ ] Try unsupported type (.exe) → Should fail
- [ ] Verify backward compatibility (images still work)

### Frontend Tests:
- [ ] Document picker opens correctly
- [ ] File uploads and shows progress
- [ ] Upload success shows file in chat
- [ ] File message displays with correct icon
- [ ] Download/share file works
- [ ] Multiple file selection works
- [ ] Error handling displays properly
- [ ] Works on both iOS and Android

---

## 🐛 Common Issues & Solutions

### Issue: "No file uploaded" error
**Solution**: Ensure form field name is `media` and file path is correct

### Issue: "Unsupported file type"
**Solution**: Check MIME type matches allowed types in `upload.middleware.js`

### Issue: File uploads but can't access URL
**Solution**: Check S3 bucket permissions and CORS settings

### Issue: Frontend can't pick document
**Solution**: 
```bash
npx expo install expo-document-picker
# Rebuild app
npx expo run:ios
# or
npx expo run:android
```

### Issue: Upload progress not showing
**Solution**: Use axios with `onUploadProgress` callback

---

## 📊 Supported File Types Summary

| Type | Extensions | Max Size | Message Type |
|------|-----------|----------|--------------|
| PDF | .pdf | 50MB | `file` |
| Word | .doc, .docx | 50MB | `file` |
| Excel | .xls, .xlsx | 50MB | `file` |
| PowerPoint | .ppt, .pptx | 50MB | `file` |
| Text | .txt, .csv, .json, .xml | 50MB | `file` |
| Archives | .zip, .rar, .7z | 50MB | `file` |
| Images | .jpg, .png, .gif | 50MB | `image` |
| Videos | .mp4, .mov, .avi | 50MB | `video` |
| Audio | .mp3, .wav, .ogg | 50MB | `audio` |

---

## 🚀 Quick Start Summary

**Backend** (Already Done ✅):
```bash
# No changes needed - already implemented!
npm start
```

**Frontend** (Your Next Steps):
```bash
# 1. Install packages
npx expo install expo-document-picker expo-file-system expo-sharing

# 2. Add the hook and UI components from this guide

# 3. Test it!
```

**That's it!** Your app now supports document uploads. 🎉

---

## 📞 Need Help?

Check server logs for detailed error messages:
```bash
# Backend logs show:
📤 Uploading 1 file(s): { userId: 123, count: 1, types: [ 'application/pdf' ] }
✅ 1 file(s) uploaded successfully
```

For more details, see:
- Backend source: `src/middlewares/upload.middleware.js`
- Controller: `src/controllers/message.controller.js`
- Constants: `src/constants.js`
