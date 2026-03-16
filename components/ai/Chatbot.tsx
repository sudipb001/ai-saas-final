"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    const currentMessage = input;
    setInput("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("User not authenticated");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentMessage,
          userId: user.id,
        }),
      });

      const data = await response.json();

      const aiMessage: Message = {
        role: "assistant",
        content: data.reply,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      alert("AI chat failed");
    }

    setLoading(false);
  };

  return (
    <div className="w-full max-w-2xl border border-gray-700 rounded p-4 bg-gray-900">
      <h2 className="text-xl font-bold mb-4">AI Chatbot Assistant</h2>

      <div className="h-64 overflow-y-auto mb-4 space-y-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-2 rounded ${
              msg.role === "user"
                ? "bg-blue-600 text-white text-right"
                : "bg-gray-700 text-gray-100"
            }`}
          >
            {msg.content}
          </div>
        ))}

        {loading && <div className="text-gray-400">AI is typing...</div>}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          className="flex-1 border border-gray-600 bg-gray-800 text-white p-2 rounded"
        />

        <button
          onClick={sendMessage}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
