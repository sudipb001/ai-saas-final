import openai from "@/lib/openai";
import { truncateText } from "@/utils/aiTextUtils";
import { splitTextIntoChunks } from "@/utils/textChunker";
// import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_INPUT_LENGTH = 8000;

export async function summarizeDocument(text: string): Promise<string> {
  const safeText = truncateText(text, MAX_INPUT_LENGTH);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You summarize documents clearly and concisely.",
      },
      {
        role: "user",
        content: `Summarize the following document:\n\n${safeText}`,
      },
    ],
    temperature: 0.5,
  });

  return response.choices[0].message.content || "";
}

export async function chatWithAI(message: string): Promise<string> {
  const safeMessage = truncateText(message, MAX_INPUT_LENGTH);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a helpful AI assistant.",
      },
      {
        role: "user",
        content: safeMessage,
      },
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content || "";
}

export async function summarizeDocumentText(text: string) {
  const chunks = splitTextIntoChunks(text, 3000);

  const partialSummaries: string[] = [];

  for (const chunk of chunks) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You summarize documents clearly and concisely.",
        },
        {
          role: "user",
          content: `Summarize this document section:\n\n${chunk}`,
        },
      ],
      temperature: 0.3,
    });

    const summary = response.choices[0].message.content || "";
    partialSummaries.push(summary);
  }

  const combinedSummary = partialSummaries.join("\n");

  const finalResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Create a concise final summary from these section summaries.",
      },
      {
        role: "user",
        content: combinedSummary,
      },
    ],
  });

  return finalResponse.choices[0].message.content || "";
}

export async function logAIRequest(
  userId: string,
  type: string,
  prompt: string,
  response: string,
) {
  console.log("Logging AI request:", {
    userId,
    type,
  });

  const { data, error } = await supabaseAdmin
    .from("ai_requests")
    .insert({
      user_id: userId,
      request_type: type,
      prompt: prompt,
      response: response,
    })
    .select();

  if (error) {
    console.error("AI request log error:", error);
  } else {
    console.log("AI request logged successfully:", data);
  }
}
