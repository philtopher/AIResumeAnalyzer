import multer from 'multer';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';
import { fileTypeFromBuffer } from 'file-type';
import { exec } from 'child_process';
import { promisify } from 'util';
import { crc32 } from '@node-rs/crc32';

const execAsync = promisify(exec);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024, // 1MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only PDF and Word documents are allowed'));
    }
    cb(null, true);
  }
});

// Virus scan using ClamAV
async function scanForVirus(buffer: Buffer): Promise<boolean> {
  const tempFilePath = path.join('/tmp', `upload_${crc32(buffer)}`);
  try {
    await fs.promises.writeFile(tempFilePath, buffer);
    await execAsync(`clamdscan ${tempFilePath}`);
    return true;
  } catch (error) {
    console.error('Virus scan failed:', error);
    return false;
  } finally {
    try {
      await fs.promises.unlink(tempFilePath);
    } catch (error) {
      console.error('Error removing temp file:', error);
    }
  }
}

// Verify file type by examining the buffer content
async function verifyFileType(buffer: Buffer, originalMimetype: string): Promise<boolean> {
  const fileType = await fileTypeFromBuffer(buffer);
  if (!fileType) return false;
  
  const allowedMimeTypes = {
    'application/pdf': ['pdf'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx']
  };
  
  return allowedMimeTypes[originalMimetype]?.includes(fileType.ext) ?? false;
}

export const secureFileUpload = upload.single('attachment');

export async function validateFile(req: Request) {
  if (!req.file) return true;

  // Check file type
  const isValidType = await verifyFileType(req.file.buffer, req.file.mimetype);
  if (!isValidType) {
    throw new Error('Invalid file type detected');
  }

  // Scan for viruses
  const isClean = await scanForVirus(req.file.buffer);
  if (!isClean) {
    throw new Error('File failed security scan');
  }

  return true;
}
