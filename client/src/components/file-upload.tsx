import { useState, useEffect, useRef } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import XHRUpload from "@uppy/xhr-upload";
import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";
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

  const [uppy] = useState(() => {
    const u = new Uppy({
      restrictions: {
        maxFileSize,
        maxNumberOfFiles: 1,
        allowedFileTypes: accept.split(",").map((type) => type.trim()),
      },
    });
    
    // Don't use Dashboard plugin here - DashboardModal handles it
    
    u.use(XHRUpload, {
      endpoint: "/api/objects/upload-direct",
      fieldName: "file",
      getResponseData: (xhr: XMLHttpRequest) => {
        // Parse JSON response and convert objectPath to url for XHRUpload
        const response = JSON.parse(xhr.responseText);
        return { url: response.objectPath };
      },
    });
    
    // Auto-start upload when file is added
    u.on('file-added', (file) => {
      u.upload().catch((err) => {
        console.error('Upload failed:', err);
      });
    });
    
    return u;
  });

  useEffect(() => {
    const handleUploadSuccess = async (file: any, response: any) => {
      console.log("Upload success response:", response);
      
      if (!file) {
        console.error("No file in upload response");
        return;
      }

      // XHRUpload returns the response with url (converted from objectPath by getResponseData)
      const uploadedPath = response?.body?.url || response?.url;
      
      if (!uploadedPath) {
        console.error("No url in response:", response);
        setModalOpen(false);
        uppy.cancelAll();
        return;
      }

      console.log("Uploaded path:", uploadedPath);
      setUploadedPath(uploadedPath);
      onUploadCompleteRef.current(uploadedPath);
      setModalOpen(false);
      
      // Clear Uppy queue for next upload
      uppy.cancelAll();
    };

    const handleUploadError = (error: any) => {
      console.error("Upload error:", error);
    };

    uppy.on("upload-success", handleUploadSuccess);
    uppy.on("upload-error", handleUploadError);

    return () => {
      uppy.off("upload-success", handleUploadSuccess);
      uppy.off("upload-error", handleUploadError);
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
          onClick={() => {
            console.log("Upload button clicked for:", label);
            setModalOpen(true);
          }}
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
        onRequestClose={() => {
          console.log("Modal closed");
          setModalOpen(false);
        }}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}
