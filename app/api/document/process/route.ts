import { NextResponse } from "next/server";
import {
  DocumentExtractionError,
  extractTextFromDocument,
} from "@/services/documentProcessor";
import { summarizeDocumentText } from "@/services/aiService";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type JobStatus = "pending" | "processing" | "completed" | "failed";
type QueueJob = {
  id: string;
  file_path: string;
};

declare global {
  // eslint-disable-next-line no-var
  var documentJobWorkerStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var documentJobWorkerInterval: NodeJS.Timeout | undefined;
}

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

async function pickNextJob(): Promise<QueueJob | null> {
  const { data: pendingJob, error: pendingJobError } = await supabaseAdmin
    .from("processing_jobs")
    .select("id, file_path")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pendingJobError) {
    throw new Error(`Failed to query pending job: ${pendingJobError.message}`);
  }

  if (!pendingJob?.id || !pendingJob.file_path) {
    return null;
  }

  // Compare-and-set update prevents two workers from claiming the same job.
  const { data: claimedJob, error: claimError } = await supabaseAdmin
    .from("processing_jobs")
    .update({
      status: "processing",
      updated_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", pendingJob.id)
    .eq("status", "pending")
    .select("id, file_path")
    .maybeSingle();

  if (claimError) {
    throw new Error(`Failed to claim pending job: ${claimError.message}`);
  }

  if (!claimedJob?.id || !claimedJob.file_path) {
    return null;
  }

  return claimedJob as QueueJob;
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

async function runJobWorker() {
  try {
    const job = await pickNextJob();

    if (!job) {
      return;
    }

    await processDocumentJob(job.id, job.file_path);
  } catch (error) {
    console.error("Job worker iteration failed:", error);
  }
}

function startWorker() {
  if (globalThis.documentJobWorkerInterval) {
    return;
  }

  const pollIntervalMs = 3000;

  globalThis.documentJobWorkerInterval = setInterval(() => {
    void runJobWorker();
  }, pollIntervalMs);
}

if (!globalThis.documentJobWorkerStarted) {
  startWorker();
  globalThis.documentJobWorkerStarted = true;
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

    // Route only enqueues job; worker loop processes it independently.
    return NextResponse.json({
      job_id: createdJob.id,
      status: "pending",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
