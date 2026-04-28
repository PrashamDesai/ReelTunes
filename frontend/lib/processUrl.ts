export async function processUrl(mode: 'single' | 'collection', url: string) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://a19f-202-131-110-138.ngrok-free.app";
  const endpoint = mode === "single" ? "/process-single" : "/process-batch";
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    try {
      const payload = await response.json();
      if (typeof payload?.detail === "string") throw new Error(payload.detail);
    } catch (e) {
      throw new Error(`Request failed with status ${response.status}.`);
    }
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [payload];
}
