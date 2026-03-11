"use client";

import * as React from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
  recommendedSize?: string;
  maxSizeMB?: number;
}

export function ImageUpload({ value, onChange, className, recommendedSize, maxSizeMB = 3 }: ImageUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);

    try {
      // Validate on client side first
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Tipo de archivo no permitido. Usa JPG, PNG, GIF o WebP");
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`El archivo es muy grande. Máximo ${maxSizeMB}MB`);
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al subir la imagen");
      }

      onChange(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = () => {
    onChange("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleInputChange}
        className="hidden"
        id="image-upload"
      />

      {value ? (
        // Preview
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img
            src={value}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        // Upload zone
        <label
          htmlFor="image-upload"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center w-full h-48 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
            dragActive
              ? "border-brand bg-brand-subtle"
              : "border-border hover:border-text-tertiary hover:bg-bg-secondary",
            uploading && "pointer-events-none opacity-60"
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-brand animate-spin" />
              <span className="text-sm text-text-secondary">Subiendo...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              {dragActive ? (
                <>
                  <ImageIcon className="h-8 w-8 text-brand" />
                  <span className="text-sm text-brand">Suelta la imagen aquí</span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-text-secondary" />
                  <span className="text-sm text-text-secondary">
                    Arrastra una imagen o haz clic para seleccionar
                  </span>
                  <span className="text-xs text-text-secondary/70">
                    JPG, PNG, GIF, WebP (máx. {maxSizeMB}MB)
                  </span>
                  {recommendedSize && (
                    <span className="text-xs text-text-secondary/70">
                      Recommended: {recommendedSize}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </label>
      )}

      {error && (
        <p className="mt-2 text-sm text-error">{error}</p>
      )}
    </div>
  );
}
