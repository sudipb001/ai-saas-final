import openai from "@/lib/openai";
import { truncateText } from "@/utils/aiTextUtils";

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
  const MAX_LENGTH = 8000;

  const safeText = text.slice(0, MAX_LENGTH);

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
