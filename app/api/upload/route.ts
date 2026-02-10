import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

// Maximum file size: 3MB
const MAX_FILE_SIZE = 3 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Magic bytes for file type validation (first bytes of file)
const MAGIC_BYTES: Record<string, { bytes: number[]; extension: string }> = {
  "image/jpeg": { bytes: [0xFF, 0xD8, 0xFF], extension: "jpg" },
  "image/png": { bytes: [0x89, 0x50, 0x4E, 0x47], extension: "png" },
  "image/gif": { bytes: [0x47, 0x49, 0x46, 0x38], extension: "gif" },
  "image/webp": { bytes: [0x52, 0x49, 0x46, 0x46], extension: "webp" }, // RIFF header
};

// Validate file by checking magic bytes
function validateMagicBytes(buffer: Buffer): { valid: boolean; type: string | null; extension: string | null } {
  for (const [mimeType, config] of Object.entries(MAGIC_BYTES)) {
    const { bytes, extension } = config;
    let matches = true;
    for (let i = 0; i < bytes.length; i++) {
      if (buffer[i] !== bytes[i]) {
        matches = false;
        break;
      }
    }
    // For WebP, also check for "WEBP" signature at offset 8
    if (matches && mimeType === "image/webp") {
      const webpSignature = buffer.slice(8, 12).toString("ascii");
      if (webpSignature !== "WEBP") {
        matches = false;
      }
    }
    if (matches) {
      return { valid: true, type: mimeType, extension };
    }
  }
  return { valid: false, type: null, extension: null };
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // Rate limiting - strict for uploads
  const rateLimitResponse = await checkRateLimit(request, "write");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size first (before reading full content)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 3MB" },
        { status: 400 }
      );
    }

    // Read file bytes for magic byte validation
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate file type by checking magic bytes (not trusting client MIME type)
    const magicValidation = validateMagicBytes(buffer);
    if (!magicValidation.valid || !magicValidation.extension) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPG, PNG, GIF, WebP. File content does not match expected format." },
        { status: 400 }
      );
    }

    // Also check that client-provided MIME type matches actual content
    if (!ALLOWED_TYPES.includes(file.type) || file.type !== magicValidation.type) {
      return NextResponse.json(
        { error: "File type mismatch. The file content does not match the declared type." },
        { status: 400 }
      );
    }

    // Generate unique filename with validated extension (ignore client-provided extension)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = magicValidation.extension; // Use validated extension, not client-provided
    const filename = `${timestamp}-${randomStr}.${extension}`;
    const filePath = `events/${filename}`;

    const { data, error } = await supabase.storage
      .from("images")
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("images")
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      imageUrl: urlData.publicUrl,
      filename,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
