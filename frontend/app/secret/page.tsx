"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SecretLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (username === "admin" && password === "admin123") {
      localStorage.setItem("reeltunes_admin", "1");
      router.push("/secret/collection");
    } else {
      setError("Invalid credentials");
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="panel p-6">
        <h1 className="text-xl font-bold text-white">Admin Login</h1>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="input-shell w-full"
            autoComplete="username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="input-shell w-full"
            autoComplete="current-password"
          />
          <button type="submit" className="primary-button w-full">
            Login
          </button>
          {error && <p className="text-rose-300 text-sm">{error}</p>}
        </form>
      </div>
    </main>
  );
}
