export function isIOSDevice() {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(userAgent) || (
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
  );
}

function toDownloadFilename(filename?: string | null, fallback = "reeltunes-download.mp3") {
  return filename?.trim() || fallback;
}

async function shareBlob(file: File) {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: file.name,
      text: "Downloaded from ReelTunes",
    });
    return true;
  }

  return false;
}

export async function triggerDownload(url: string, filename?: string | null) {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  if (isIOSDevice()) {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const blob = await response.blob();
    const file = new File([blob], toDownloadFilename(filename), {
      type: blob.type || "audio/mpeg",
    });

    if (await shareBlob(file)) {
      return;
    }

    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
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