import { NextResponse } from "next/server";

const URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi;
const INSTAGRAM_REEL_PATTERN =
  /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p)\/[^\s"'<>]+/i;

function readFieldValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeCandidate(url: string) {
  return url.replace(/[),.;!?]+$/, "");
}

function extractSharedUrl(formData: FormData) {
  const urlValue = readFieldValue(formData.get("url"));
  const textValue = readFieldValue(formData.get("text"));
  const combined = [urlValue, textValue].filter(Boolean).join("\n");

  if (!combined) return "";

  const exactInstagramMatch =
    urlValue.match(INSTAGRAM_REEL_PATTERN)?.[0] ??
    textValue.match(INSTAGRAM_REEL_PATTERN)?.[0];

  if (exactInstagramMatch) {
    return sanitizeCandidate(exactInstagramMatch);
  }

  const anyUrlMatch = combined.match(URL_PATTERN)?.[0];
  return anyUrlMatch ? sanitizeCandidate(anyUrlMatch) : "";
}

function redirectHome(request: Request, sharedUrl?: string) {
  const deployedUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL("/", request.url).origin;
  const destination = new URL("/?mode=song", deployedUrl);
  if (sharedUrl) {
    destination.searchParams.set("shared", sharedUrl);
  }

  return NextResponse.redirect(destination, { status: 303 });
}

export async function GET(request: Request) {
  return redirectHome(request);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const sharedUrl = extractSharedUrl(formData);

  return redirectHome(request, sharedUrl);
}
