import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client: S3Client = new S3Client({
  endpoint: process.env.YANDEX_S3_ENDPOINT,
  region: process.env.YANDEX_S3_REGION,
  credentials: {
    accessKeyId: process.env.YANDEX_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.YANDEX_S3_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.YANDEX_S3_BUCKET_NAME!;

// Функция для кодирования имени файла
function encodeFileName(fileName: string): string {
  return encodeURIComponent(fileName);
}

async function getUniqueKey(baseKey: string): Promise<string> {
  let counter = 1;
  let uniqueKey = baseKey;
  
  while (true) {
    try {
      // Проверяем существование файла
      await s3Client.send(new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: uniqueKey,
      }));
      
      // Если файл существует, добавляем счетчик
      const ext = baseKey.lastIndexOf('.') > -1 ? baseKey.substring(baseKey.lastIndexOf('.')) : '';
      const nameWithoutExt = baseKey.substring(0, baseKey.lastIndexOf('.'));
      uniqueKey = `${nameWithoutExt}(${counter})${ext}`;
      counter++;
    } catch (error: any) {
      // Если файл не существует (ошибка 404), возвращаем текущий ключ
      if (error.name === 'NotFound') {
        return uniqueKey;
      }
      throw error;
    }
  }
}

export async function initMultipartUpload(fileName: string, contentType: string, userId: string) {
  try {
    // Создаем базовый ключ
    const baseKey = `uploads/${userId}/${fileName}`;
    
    // Получаем уникальный ключ
    const uniqueKey = await getUniqueKey(baseKey);
    
    console.log("Creating multipart upload with params:", {
      bucket: BUCKET_NAME,
      key: uniqueKey,
      contentType,
    });

    const command = new CreateMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: uniqueKey,
      ContentType: contentType,
      Metadata: {
        'Content-Type': contentType,
        'Original-File-Name': encodeFileName(fileName),
      },
    });

    const response = await s3Client.send(command);
    
    if (!response.UploadId) {
      console.error("No UploadId in response:", response);
      throw new Error("Failed to get UploadId from S3 response");
    }

    console.log("Successfully created multipart upload:", {
      uploadId: response.UploadId,
      key: response.Key,
    });

    return { uploadId: response.UploadId, key: uniqueKey };
  } catch (error) {
    console.error("Error in initMultipartUpload:", error);
    throw error;
  }
}

export async function uploadPart(key: string, uploadId: string, partNumber: number, body: Buffer) {
  try {
    const command = new UploadPartCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: body,
    });

    const response = await s3Client.send(command);
    
    if (!response.ETag) {
      throw new Error("No ETag in response");
    }

    return response.ETag;
  } catch (error) {
    console.error("Error in uploadPart:", error);
    throw error;
  }
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { ETag: string; PartNumber: number }[]
) {
  try {
    console.log("Completing multipart upload with params:", {
      bucket: BUCKET_NAME,
      key,
      uploadId,
      partsCount: parts.length,
    });

    const command = new CompleteMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    });

    const response = await s3Client.send(command);
    console.log("Successfully completed multipart upload:", response);
    return response;
  } catch (error) {
    console.error("Error in completeMultipartUpload:", error);
    throw error;
  }
}

export async function abortMultipartUpload(key: string, uploadId: string) {
  try {
    const command = new AbortMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("Error in abortMultipartUpload:", error);
    throw error;
  }
}

export async function generatePresignedUrl(key: string, expiresIn: number = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw error;
  }
} 