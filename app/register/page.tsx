"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signUp({
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
        <h1 className="mb-4 text-2xl font-bold">Register</h1>

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
          className="w-full bg-blue-600 p-2 text-white disabled:opacity-70"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Creating account..." : "Register"}
        </button>

        <p className="mt-4 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600 underline">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
