import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { Response } from "express";
import { PassThrough } from "stream";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export interface LocalFile {
  path: string;
  metadata: { [key: string]: any };
}

export class LocalStorageService {
  private baseDir: string;

  constructor() {
    // Store files in ./uploads directory
    this.baseDir = path.resolve(process.cwd(), "uploads");
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.mkdir(path.join(this.baseDir, "private"), { recursive: true });
      await fs.mkdir(path.join(this.baseDir, "public"), { recursive: true });
    } catch (error) {
      console.error("Error creating upload directories:", error);
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    // For local storage, we don't need a signed URL
    // Instead, return a unique file path that the client can POST to
    const objectId = randomUUID();
    const filePath = `/api/objects/local-upload/${objectId}`;
    return filePath;
  }

  async uploadFile(objectId: string, fileData: Buffer, contentType?: string): Promise<string> {
    const fileName = `${objectId}${this.getFileExtension(contentType)}`;
    const filePath = path.join(this.baseDir, "private", fileName);
    
    await fs.writeFile(filePath, fileData);
    
    // Store metadata in a separate JSON file
    const metadataPath = filePath + ".meta.json";
    await fs.writeFile(metadataPath, JSON.stringify({
      contentType: contentType || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      visibility: "private",
    }));
    
    return `/objects/uploads/${fileName}`;
  }

  async getObjectEntityFile(objectPath: string): Promise<LocalFile> {
    // Parse path like /objects/uploads/filename.ext
    const match = objectPath.match(/^\/objects\/uploads\/(.+)$/);
    if (!match) {
      throw new ObjectNotFoundError();
    }

    const fileName = match[1];
    const filePath = path.join(this.baseDir, "private", fileName);
    const metadataPath = filePath + ".meta.json";

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new ObjectNotFoundError();
    }

    // Read metadata if it exists
    let metadata: any = { visibility: "private" };
    try {
      const metadataContent = await fs.readFile(metadataPath, "utf-8");
      metadata = JSON.parse(metadataContent);
    } catch {
      // Metadata doesn't exist, use defaults
    }

    return {
      path: filePath,
      metadata,
    };
  }

  async downloadObject(file: LocalFile, res: Response, cacheTtlSec: number = 3600) {
    try {
      const stats = await fs.stat(file.path);
      const isPublic = file.metadata?.visibility === "public";

      res.set({
        "Content-Type": file.metadata?.contentType || "application/octet-stream",
        "Content-Length": stats.size.toString(),
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      });

      // Stream the file
      const fileData = await fs.readFile(file.path);
      res.send(fileData);
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
    
    // Try to extract path from a full URL (for backwards compatibility)
    if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
      const url = new URL(rawPath);
      const urlPath = url.pathname;
      if (urlPath.startsWith("/objects/")) {
        return urlPath;
      }
    }
    
    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: { owner: string; visibility: "public" | "private" }
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    
    // Update metadata file
    const match = normalizedPath.match(/^\/objects\/uploads\/(.+)$/);
    if (!match) {
      return normalizedPath;
    }

    const fileName = match[1];
    const filePath = path.join(this.baseDir, "private", fileName);
    const metadataPath = filePath + ".meta.json";

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return normalizedPath;
    }

    // Read existing metadata or create new
    let metadata: any = {};
    try {
      const metadataContent = await fs.readFile(metadataPath, "utf-8");
      metadata = JSON.parse(metadataContent);
    } catch {
      // Create new metadata
    }

    // Update ACL policy
    metadata.aclPolicy = aclPolicy;
    metadata.visibility = aclPolicy.visibility;

    // Save metadata
    await fs.writeFile(metadataPath, JSON.stringify(metadata));

    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    file,
    requestedPermission,
  }: {
    userId?: string;
    file: LocalFile;
    requestedPermission?: "read" | "write";
  }): Promise<boolean> {
    const aclPolicy = file.metadata?.aclPolicy;
    if (!aclPolicy) {
      return false;
    }

    // Public objects are always accessible for read
    if (aclPolicy.visibility === "public" && requestedPermission === "read") {
      return true;
    }

    // Access control requires the user id
    if (!userId) {
      return false;
    }

    // The owner of the object can always access it
    if (aclPolicy.owner === userId) {
      return true;
    }

    return false;
  }

  private getFileExtension(contentType?: string): string {
    if (!contentType) return "";
    
    const extensionMap: { [key: string]: string } = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "application/pdf": ".pdf",
      "application/msword": ".doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    };
    
    return extensionMap[contentType] || "";
  }
}

