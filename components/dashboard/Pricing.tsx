"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Pricing() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("You must be logged in");
        return;
      }

      const response = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: "pro",
          userId: user.id,
        }),
      });

      const data = await response.json();

      alert("Subscription created: " + data.id);
    } catch {
      alert("Subscription failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Pro Plan</h2>

      <p className="mb-4">Unlimited AI usage and premium features.</p>

      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="bg-purple-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Processing..." : "Subscribe"}
      </button>
    </div>
  );
}
