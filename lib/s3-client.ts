import { S3Client } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"
import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3Client = new S3Client({
  region: "ru-central1",
  endpoint: process.env.S3_ENDPOINT || "https://storage.yandexcloud.net",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME || ""

export async function startUpload(key: string, contentType: string): Promise<string> {
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
      },
    })

    await upload.done()
    return key
  } catch (error) {
    console.error("Error starting upload to S3:", error)
    throw new Error("Failed to start upload to S3")
  }
}

export async function getFileFromS3(key: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    const response = await s3Client.send(command)
    return response
  } catch (error) {
    console.error("Error getting file from S3:", error)
    throw new Error("Failed to get file from S3")
  }
}

export async function deleteFileFromS3(key: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    await s3Client.send(command)
  } catch (error) {
    console.error("Error deleting file from S3:", error)
    throw new Error("Failed to delete file from S3")
  }
}

export async function generatePresignedUrl(key: string, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    const url = await getSignedUrl(s3Client, command, { expiresIn })
    return url
  } catch (error) {
    console.error("Error generating presigned URL:", error)
    throw new Error("Failed to generate download URL")
  }
}

