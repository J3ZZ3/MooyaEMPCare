import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Response } from "express";
import { randomUUID } from "crypto";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export interface R2File {
  path: string;
  metadata: { [key: string]: any };
}

export class R2StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      console.warn("Cloudflare R2 credentials not set. File uploads will fail. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME environment variables.");
    }

    this.bucketName = R2_BUCKET_NAME || "";
    
    this.s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || "",
        secretAccessKey: R2_SECRET_ACCESS_KEY || "",
      },
    });
  }

  async getObjectEntityUploadURL(): Promise<string> {
    // Generate a signed URL for direct upload from client
    const objectId = randomUUID();
    const objectKey = `uploads/${objectId}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
    });

    const uploadURL = await getSignedUrl(this.s3Client, command, { expiresIn: 900 }); // 15 minutes
    return uploadURL;
  }

  async uploadFile(objectId: string, fileData: Buffer, contentType?: string): Promise<string> {
    const objectKey = `uploads/${objectId}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      Body: fileData,
      ContentType: contentType || "application/octet-stream",
      Metadata: {
        visibility: "private",
      },
    });

    await this.s3Client.send(command);
    
    return `/objects/${objectKey}`;
  }

  async getObjectEntityFile(objectPath: string): Promise<R2File> {
    // Parse path like /objects/uploads/filename
    const match = objectPath.match(/^\/objects\/(.+)$/);
    if (!match) {
      throw new ObjectNotFoundError();
    }

    const objectKey = match[1];

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });

      const metadata = await this.s3Client.send(command);
      
      return {
        path: objectKey,
        metadata: {
          contentType: metadata.ContentType,
          visibility: metadata.Metadata?.visibility || "private",
          size: metadata.ContentLength,
          lastModified: metadata.LastModified,
        },
      };
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        throw new ObjectNotFoundError();
      }
      throw error;
    }
  }

  async downloadObject(file: R2File, res: Response, cacheTtlSec: number = 3600) {
    try {
      const isPublic = file.metadata?.visibility === "public";

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: file.path,
      });

      // For public files, redirect to public URL
      if (isPublic && R2_PUBLIC_URL) {
        const publicUrl = `${R2_PUBLIC_URL}/${file.path}`;
        res.redirect(publicUrl);
        return;
      }

      // For private files, stream from R2
      const response = await this.s3Client.send(command);
      
      res.set({
        "Content-Type": file.metadata?.contentType || "application/octet-stream",
        "Content-Length": file.metadata?.size?.toString() || "0",
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      });

      // Stream the response body
      if (response.Body) {
        const stream = response.Body as any;
        stream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  normalizeObjectEntityPath(rawPath: string): string {
    // If it's already a normalized path, return it
    if (rawPath.startsWith("/objects/")) {
      return rawPath;
    }
    
    // Try to extract path from a full URL
    if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
      const url = new URL(rawPath);
      const urlPath = url.pathname;
      if (urlPath) {
        return `/objects${urlPath}`;
      }
    }
    
    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: { owner: string; visibility: "public" | "private" }
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    
    // Parse path
    const match = normalizedPath.match(/^\/objects\/(.+)$/);
    if (!match) {
      return normalizedPath;
    }

    const objectKey = match[1];

    try {
      // Copy object with new metadata (R2 doesn't support direct metadata updates)
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });

      const existingMetadata = await this.s3Client.send(headCommand);
      
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });

      const objectData = await this.s3Client.send(getCommand);
      const body = await objectData.Body?.transformToByteArray();

      if (body) {
        const putCommand = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: objectKey,
          Body: Buffer.from(body),
          ContentType: existingMetadata.ContentType,
          Metadata: {
            ...existingMetadata.Metadata,
            visibility: aclPolicy.visibility,
          },
        });

        await this.s3Client.send(putCommand);
      }
    } catch (error) {
      console.error("Error updating object metadata:", error);
    }

    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    file,
    requestedPermission,
  }: {
    userId?: string;
    file: R2File;
    requestedPermission?: "read" | "write";
  }): Promise<boolean> {
    const visibility = file.metadata?.visibility;

    // Public objects are always accessible for read
    if (visibility === "public" && requestedPermission === "read") {
      return true;
    }

    // For private files, we would need to check ownership
    // For now, we'll allow access if user is authenticated
    // You can enhance this with a separate database table for file ownership
    if (visibility === "private" && userId) {
      return true;
    }

    return false;
  }

  async searchPublicObject(filePath: string): Promise<R2File | null> {
    try {
      const file = await this.getObjectEntityFile(`/objects/${filePath}`);
      if (file.metadata?.visibility === "public") {
        return file;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

