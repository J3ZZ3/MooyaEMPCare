import { Response } from "express";
import { randomUUID } from "crypto";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export interface ObjectFile {
  path: string;
  metadata: { [key: string]: any };
}

// Replit Object Storage sidecar integration
// This uses Replit's object storage integration from .replit
const DEFAULT_OBJECT_STORAGE_BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
const PUBLIC_OBJECT_SEARCH_PATHS = process.env.PUBLIC_OBJECT_SEARCH_PATHS?.split(',') || [];
const PRIVATE_OBJECT_DIR = process.env.PRIVATE_OBJECT_DIR;

export class ObjectStorageService {
  private bucketId: string;
  private publicPaths: string[];
  private privateDir: string;

  constructor() {
    this.bucketId = DEFAULT_OBJECT_STORAGE_BUCKET_ID || "";
    this.publicPaths = PUBLIC_OBJECT_SEARCH_PATHS;
    this.privateDir = PRIVATE_OBJECT_DIR || "";
    
    if (!this.bucketId) {
      console.warn("Replit Object Storage bucket not configured. Set DEFAULT_OBJECT_STORAGE_BUCKET_ID environment variable.");
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    // Generate a signed URL for direct upload from client
    const objectId = randomUUID();
    const objectKey = `uploads/${objectId}`;

    // In Replit, we use the storage sidecar API
    // This is a simplified placeholder - actual implementation would use Replit's sidecar
    const uploadURL = `/api/replit-storage-upload/${objectKey}`;
    return uploadURL;
  }

  async uploadFile(objectId: string, fileData: Buffer, contentType?: string): Promise<string> {
    const objectKey = `uploads/${objectId}`;

    // This would upload via Replit Object Storage sidecar
    // For now, we'll return the path
    // In production, this would actually upload via the sidecar API
    return `/objects/${objectKey}`;
  }

  async getObjectEntityFile(objectPath: string): Promise<ObjectFile> {
    // Parse path like /objects/uploads/filename
    const match = objectPath.match(/^\/objects\/(.+)$/);
    if (!match) {
      throw new ObjectNotFoundError();
    }

    const objectKey = match[1];

    // In Replit, we'd check if the object exists via the sidecar
    // For now, we return a placeholder that will work with the routing
    return {
      path: objectKey,
      metadata: {
        contentType: "application/octet-stream",
        visibility: "private",
      },
    };
  }

  async downloadObject(file: ObjectFile, res: Response, cacheTtlSec: number = 3600) {
    try {
      const isPublic = file.metadata?.visibility === "public";

      // In Replit, we'd stream from the Object Storage sidecar
      // For now, we'll redirect to a placeholder path
      res.status(404).json({ error: "Replit Object Storage sidecar integration not yet fully implemented" });
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async searchPublicObject(filePath: string): Promise<ObjectFile | null> {
    // Search in public paths
    for (const publicPath of this.publicPaths) {
      if (filePath.startsWith(publicPath)) {
        const objectKey = filePath.substring(publicPath.length);
        return {
          path: objectKey,
          metadata: {
            contentType: "application/octet-stream",
            visibility: "public",
          },
        };
      }
    }
    return null;
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
    
    // In Replit, we'd update ACL via the Object Storage sidecar
    // For now, just return the path
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    file,
    requestedPermission,
  }: {
    userId?: string;
    file: ObjectFile;
    requestedPermission?: "read" | "write";
  }): Promise<boolean> {
    const visibility = file.metadata?.visibility;

    // Public objects are always accessible for read
    if (visibility === "public" && requestedPermission === "read") {
      return true;
    }

    // For private files, we would need to check ownership
    // For now, we'll allow access if user is authenticated
    if (visibility === "private" && userId) {
      return true;
    }

    return false;
  }
}
