import { useState, useEffect, useRef } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import { Button } from "@/components/ui/button";
import { Upload, FileCheck, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface FileUploadProps {
  label: string;
  accept?: string;
  maxFileSize?: number;
  onUploadComplete: (filePath: string) => void;
  currentFilePath?: string;
  testId?: string;
}

export function FileUpload({
  label,
  accept = "image/*,.pdf",
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  onUploadComplete,
  currentFilePath,
  testId,
}: FileUploadProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | undefined>(currentFilePath);
  const onUploadCompleteRef = useRef(onUploadComplete);
  
  // Keep the callback ref up to date without triggering effect re-runs
  useEffect(() => {
    onUploadCompleteRef.current = onUploadComplete;
  }, [onUploadComplete]);

  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxFileSize,
        maxNumberOfFiles: 1,
        allowedFileTypes: accept.split(",").map((type) => type.trim()),
      },
    }).use(AwsS3, {
      shouldUseMultipart: false,
      async getUploadParameters(file) {
        const response = await fetch("/api/objects/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to get upload URL");
        }

        const data = await response.json();

        return {
          method: "PUT",
          url: data.uploadURL,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        };
      },
    })
  );

  useEffect(() => {
    const handleUploadSuccess = async (file: any, response: any) => {
      if (!file || !response.uploadURL) return;

      // Set ACL to private for labourer documents
      const aclResponse = await fetch("/api/objects/acl", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          objectURL: response.uploadURL,
          visibility: "private",
        }),
      });

      if (!aclResponse.ok) {
        console.error("Failed to set object ACL");
        return;
      }

      const aclData = await aclResponse.json();
      setUploadedPath(aclData.objectPath);
      onUploadCompleteRef.current(aclData.objectPath);
      setModalOpen(false);
      
      // Clear Uppy queue for next upload
      uppy.cancelAll();
    };

    uppy.on("upload-success", handleUploadSuccess);

    return () => {
      uppy.off("upload-success", handleUploadSuccess);
    };
  }, [uppy]);

  const handleRemove = () => {
    setUploadedPath(undefined);
    onUploadCompleteRef.current("");
    uppy.cancelAll();
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      
      {uploadedPath ? (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-green-600" />
              <span className="text-sm">File uploaded successfully</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              data-testid={`${testId}-remove`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setModalOpen(true)}
          className="w-full"
          data-testid={testId}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload {label}
        </Button>
      )}

      <DashboardModal
        uppy={uppy}
        open={modalOpen}
        onRequestClose={() => setModalOpen(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}
