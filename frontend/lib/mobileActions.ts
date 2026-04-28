export function isIOSDevice() {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(userAgent) || (
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
  );
}

export function triggerDownload(url: string, filename?: string | null) {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  if (isIOSDevice()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  if (filename) link.download = filename;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function shareContent({
  title,
  text,
  url,
}: {
  title: string;
  text?: string;
  url: string;
}) {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    await navigator.share({ title, text, url });
    return true;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(url);
  }

  return false;
}