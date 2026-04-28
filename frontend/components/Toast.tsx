"use client";

import { useEffect, useState } from "react";

export default function Toast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent)?.detail as { message?: string } | undefined;
      setMessage(detail?.message ?? "");
      setVisible(true);
      window.setTimeout(() => setVisible(false), 3000);
    }

    window.addEventListener("reeltunes-toast", handler as EventListener);
    return () => window.removeEventListener("reeltunes-toast", handler as EventListener);
  }, []);

  return (
    <div
      aria-live="polite"
      className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 transform transition-all duration-300 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
      }`}
    >
      <div className="rounded-lg bg-black/75 px-4 py-2 text-sm font-medium text-white shadow-lg">
        {message}
      </div>
    </div>
  );
}
