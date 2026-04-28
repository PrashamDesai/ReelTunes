import { NextResponse } from "next/server";

const URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi;
const INSTAGRAM_REEL_PATTERN =
  /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p)\/[^\s"'<>]+/i;

function readFieldValue(value: FormDataEntryValue | null) {
  if (typeof value === "string") return value.trim();
  return "";
}

function sanitizeCandidate(url: string) {
  // Remove trailing punctuation and query params
  return url
    .split("?")[0] // Remove query params
    .split("#")[0] // Remove hash
    .replace(/[),.;!\?\s]+$/, "") // Remove trailing punctuation
    .trim();
}

function extractSharedUrl(formData: FormData) {
  const titleValue = readFieldValue(formData.get("title"));
  const urlValue = readFieldValue(formData.get("url"));
  const textValue = readFieldValue(formData.get("text"));
  const combined = [titleValue, urlValue, textValue].filter(Boolean).join("\n");

  if (!combined) return "";

  // First try exact Instagram match from URL field (most reliable)
  const exactInstagramMatch =
    urlValue.match(INSTAGRAM_REEL_PATTERN)?.[0] ??
    textValue.match(INSTAGRAM_REEL_PATTERN)?.[0] ??
    titleValue.match(INSTAGRAM_REEL_PATTERN)?.[0];

  if (exactInstagramMatch) {
    return sanitizeCandidate(exactInstagramMatch);
  }

  // Fallback to any URL pattern
  const anyUrlMatch = combined.match(URL_PATTERN)?.[0];
  return anyUrlMatch ? sanitizeCandidate(anyUrlMatch) : "";
}

function redirectHome(request: Request, sharedUrl?: string) {
  // Determine the correct origin
  let origin = "https://reeltunes.onrender.com";
  
  // Try to get from environment first
  if (process.env.VERCEL_URL) {
    origin = `https://${process.env.VERCEL_URL}`;
  } else if (process.env.NEXT_PUBLIC_DEPLOY_URL) {
    origin = process.env.NEXT_PUBLIC_DEPLOY_URL;
  } else {
    // Fallback to request origin if available
    try {
      const reqUrl = new URL(request.url);
      if (reqUrl.hostname !== "localhost") {
        origin = `${reqUrl.protocol}//${reqUrl.host}`;
      }
    } catch (e) {
      // Ignore parse errors, use fallback
    }
  }

  const destination = new URL("/?mode=song", origin);
  if (sharedUrl) {
    destination.searchParams.set("shared", sharedUrl);
  }

  return NextResponse.redirect(destination, { status: 303 });
}

export async function GET(request: Request) {
  return redirectHome(request);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sharedUrl = extractSharedUrl(formData);
    return redirectHome(request, sharedUrl);
  } catch (error) {
    console.error("Share target error:", error);
    return redirectHome(request);
  }
}
