"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.replace("/dashboard");
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-96 rounded border p-6">
        <h1 className="mb-4 text-2xl font-bold">Login</h1>

        <input
          type="email"
          placeholder="Email"
          className="mb-3 w-full border p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="mb-3 w-full border p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="w-full bg-green-600 p-2 text-white disabled:opacity-70"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="mt-4 text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-blue-600 underline"
          >
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
