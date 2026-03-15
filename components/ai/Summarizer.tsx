"use client";

import { useState } from "react";

export default function Summarizer() {
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSummarize = async () => {
    if (!text) {
      alert("Please enter document text");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/ai/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
      }),
    });

    const data = await response.json();

    setSummary(data.summary);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl w-full space-y-4">
      <h2 className="text-2xl font-bold">AI Document Summarizer</h2>

      <textarea
        className="w-full border p-3 rounded h-40"
        placeholder="Paste document text here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button
        onClick={handleSummarize}
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? "Generating summary..." : "Summarize Document"}
      </button>
      {summary && (
        <div className="border p-4 rounded bg-gray-50 text-gray-900">
          <h3 className="font-semibold mb-2 text-gray-800">Summary</h3>
          <p className="text-gray-900">{summary}</p>
        </div>
      )}

      {/* {summary && (
        <div className="border p-4 rounded bg-gray-50">
          <h3 className="font-semibold mb-2">Summary</h3>
          <p>{summary}</p>
        </div>
      )} */}
    </div>
  );
}
