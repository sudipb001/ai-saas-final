import { NextResponse } from "next/server";
import {
  DocumentExtractionError,
  extractTextFromDocument,
} from "@/services/documentProcessor";
import { summarizeDocumentText } from "@/services/aiService";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type JobStatus = "pending" | "processing" | "completed" | "failed";

async function updateProcessingJob(
  jobId: string,
  status: JobStatus,
  errorMessage?: string,
) {
  const { error } = await supabaseAdmin
    .from("processing_jobs")
    .update({
      status,
      error_message: errorMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed to update processing job: ${error.message}`);
  }
}

// Background processing function
async function processDocumentJob(jobId: string, filePath: string) {
  try {
    // Step 1 — Mark processing
    await updateProcessingJob(jobId, "processing");

    // Step 2 — Extract text
    const text = await extractTextFromDocument(filePath);

    if (!text || !text.trim()) {
      throw new DocumentExtractionError(
        "No extractable text found in document",
      );
    }

    // Step 3 — AI summarization
    const summary = await summarizeDocumentText(text);

    const fileName = filePath.split("/").pop() || filePath;

    // Step 4 — Insert document
    const { data: insertedDocument, error: insertError } = await supabaseAdmin
      .from("documents")
      .insert({
        file_name: fileName,
        file_path: filePath,
        summary,
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    // Step 5 — Link job to document
    const { error: linkError } = await supabaseAdmin
      .from("processing_jobs")
      .update({
        document_id: insertedDocument?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (linkError) {
      throw new Error(linkError.message);
    }

    // Step 6 — Mark completed
    await updateProcessingJob(jobId, "completed");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    try {
      await updateProcessingJob(jobId, "failed", message);
    } catch (jobUpdateError) {
      console.error("Failed to mark processing job as failed:", jobUpdateError);
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const filePath = body?.filePath;

    if (typeof filePath !== "string" || !filePath.trim()) {
      return NextResponse.json(
        { error: "filePath is required" },
        { status: 400 },
      );
    }

    // Step 1 — Create job
    const { data: createdJob, error: createJobError } = await supabaseAdmin
      .from("processing_jobs")
      .insert({
        file_path: filePath,
        status: "pending",
      })
      .select("id")
      .single();

    if (createJobError || !createdJob?.id) {
      const message =
        createJobError?.message || "Failed to create processing job";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const jobId = createdJob.id;

    // Step 2 — Run processing in background
    setTimeout(() => {
      processDocumentJob(jobId, filePath).catch(console.error);
    }, 0);

    // Step 3 — Return immediately
    return NextResponse.json({
      job_id: jobId,
      status: "pending",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
