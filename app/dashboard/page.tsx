"use client";

import { useEffect, useState } from "react";
import Summarizer from "@/components/ai/Summarizer";
import Chatbot from "@/components/ai/Chatbot";
import FileUpload from "@/components/documents/FileUpload";
import Pricing from "@/components/dashboard/Pricing";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      setCheckingAuth(false);
    };

    void checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-lg font-medium">Checking session...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-10 p-10">
      <div className="flex w-full max-w-4xl justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <button
          onClick={handleLogout}
          className="rounded bg-red-600 px-4 py-2 text-white"
        >
          Logout
        </button>
      </div>

      <Summarizer />
      <Chatbot />
      <FileUpload />
      <Pricing />
    </main>
  );
}
