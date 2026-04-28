"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import CollectionUploader from "@/components/CollectionUploader";

export default function SecretCollectionPage() {
  const router = useRouter();

  useEffect(() => {
    const ok = localStorage.getItem("reeltunes_admin");
    if (!ok) router.push("/secret");
  }, [router]);

  function logout() {
    localStorage.removeItem("reeltunes_admin");
    router.push("/");
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Collection Processor</h1>
        <button className="secondary-button" onClick={logout}>
          Logout
        </button>
      </div>

      <CollectionUploader />
    </main>
  );
}
