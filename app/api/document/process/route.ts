import { NextResponse } from "next/server";
import {
  DocumentExtractionError,
  extractTextFromDocument,
} from "@/services/documentProcessor";
import { summarizeDocumentText } from "@/services/aiService";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * Structured logging helper for job monitoring
 */
function logJob(stage: string, data: Record<string, unknown>) {
  console.log("[JOB]", {
    ...data,
    stage,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Structured error logging helper for job monitoring
 */
function logJobError(
  stage: string,
  data: Record<string, unknown>,
  error: unknown,
) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error("[JOB_ERROR]", {
    ...data,
    stage,
    error: errorMessage,
    timestamp: new Date().toISOString(),
  });
}

type JobStatus = "pending" | "processing" | "completed" | "failed";
type QueueJob = {
  id: string;
  file_path: string;
  attempts: number;
  max_attempts: number;
};

declare global {
  // eslint-disable-next-line no-var
  var documentJobWorkerStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var documentJobWorkerInterval: NodeJS.Timeout | undefined;
}

/**
 * Updates a processing job row with the latest status, error details, and timestamp.
 */
async function updateProcessingJob(
  jobId: string,
  status: JobStatus,
  errorMessage?: string,
) {
  logJob("JOB_STATUS_UPDATE", {
    jobId,
    status,
    hasError: !!errorMessage,
  });

  const { error } = await supabaseAdmin
    .from("processing_jobs")
    .update({
      status,
      error_message: errorMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    logJobError("JOB_STATUS_UPDATE_FAILED", { jobId, status }, error);
    throw new Error(`Failed to update processing job: ${error.message}`);
  }
}

/**
 * Fetches the oldest pending job and attempts to atomically claim it for processing.
 */
async function pickNextJob(): Promise<QueueJob | null> {
  logJob("WORKER_POLL_START", {});

  const { data: pendingJob, error } = await supabaseAdmin
    .from("processing_jobs")
    .select("id, file_path, attempts, max_attempts")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    logJobError("WORKER_POLL_FAILED", {}, error);
    throw new Error(`Failed to query pending job: ${error.message}`);
  }

  if (!pendingJob?.id || !pendingJob.file_path) {
    logJob("NO_PENDING_JOB", {
      queue_checked: true,
    });
    return null;
  }

  logJob("JOB_FOUND", {
    jobId: pendingJob.id,
    filePath: pendingJob.file_path,
    attempts: pendingJob.attempts,
    maxAttempts: pendingJob.max_attempts,
  });

  // Retry check
  if (pendingJob.attempts >= pendingJob.max_attempts) {
    logJob("MAX_RETRIES_REACHED", {
      jobId: pendingJob.id,
      attempts: pendingJob.attempts,
      maxAttempts: pendingJob.max_attempts,
    });
    await updateProcessingJob(
      pendingJob.id,
      "failed",
      "Max retry attempts reached",
    );
    return null;
  }

  // Claim job
  logJob("JOB_CLAIM_START", {
    jobId: pendingJob.id,
    filePath: pendingJob.file_path,
  });

  const { data: claimedJob, error: claimError } = await supabaseAdmin
    .from("processing_jobs")
    .update({
      status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", pendingJob.id)
    .eq("status", "pending")
    .select("id, file_path, attempts, max_attempts")
    .maybeSingle();

  if (claimError) {
    logJobError("JOB_CLAIM_FAILED", { jobId: pendingJob.id }, claimError);
    throw new Error(`Failed to claim job: ${claimError.message}`);
  }

  if (claimedJob) {
    logJob("JOB_CLAIMED_SUCCESS", {
      jobId: claimedJob.id,
      filePath: claimedJob.file_path,
      attempts: claimedJob.attempts,
    });
  }

  return claimedJob || null;
}

/**
 * Runs the full processing pipeline for one job: extract text, summarize, store,
 * link document, and mark terminal status.
 */
async function processDocumentJob(jobId: string, filePath: string) {
  try {
    // Step 1 — Mark processing
    logJob("PROCESSING_STARTED", {
      jobId,
      filePath,
    });

    await updateProcessingJob(jobId, "processing");

    // Step 2 — Extract text
    logJob("EXTRACTION_START", {
      jobId,
      filePath,
    });

    const text = await extractTextFromDocument(filePath);

    logJob("EXTRACTION_SUCCESS", {
      jobId,
      filePath,
      textLength: text?.length ?? 0,
    });

    if (!text || !text.trim()) {
      throw new DocumentExtractionError(
        "No extractable text found in document",
      );
    }

    // Step 3 — AI summarization
    logJob("AI_PROCESSING_START", {
      jobId,
      filePath,
      textLength: text.length,
    });

    const summary = await summarizeDocumentText(text);

    logJob("AI_PROCESSING_SUCCESS", {
      jobId,
      filePath,
      summaryLength: summary?.length ?? 0,
    });

    const fileName = filePath.split("/").pop() || filePath;

    // Step 4 — Insert document
    logJob("DOCUMENT_INSERT_START", {
      jobId,
      filePath,
      fileName,
    });

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

    logJob("DOCUMENT_INSERT_SUCCESS", {
      jobId,
      documentId: insertedDocument?.id ?? null,
      filePath,
    });

    // Step 5 — Link job to document
    logJob("JOB_DOCUMENT_LINK_START", {
      jobId,
      documentId: insertedDocument?.id ?? null,
    });

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

    logJob("JOB_DOCUMENT_LINK_SUCCESS", {
      jobId,
      documentId: insertedDocument?.id ?? null,
    });

    // Step 6 — Mark completed
    logJob("JOB_COMPLETION_START", {
      jobId,
      filePath,
    });

    await updateProcessingJob(jobId, "completed");

    logJob("JOB_COMPLETED", {
      jobId,
      filePath,
      documentId: insertedDocument?.id ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    logJobError("PROCESSING_FAILED", { jobId, filePath }, error);

    try {
      await updateProcessingJob(jobId, "failed", message);
    } catch (jobUpdateError) {
      logJobError("FAILED_JOB_STATUS_UPDATE_ERROR", { jobId }, jobUpdateError);
      console.error("Failed to mark processing job as failed:", jobUpdateError);
    }
  }
}

/**
 * Executes one worker cycle by claiming the next available job and processing it.
 */
async function runJobWorker() {
  try {
    const job = await pickNextJob();

    if (!job) return;

    logJob("WORKER_PROCESSING_JOB", {
      jobId: job.id,
      filePath: job.file_path,
      attempts: job.attempts,
    });

    await processDocumentJobSafe(job);
  } catch (error) {
    logJobError("WORKER_CYCLE_ERROR", {}, error);
    console.error("Worker error:", error);
  }
}

/**
 * Starts the singleton polling loop that continuously checks for pending jobs.
 */
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

/**
 * Enqueues a new document processing job and returns its job identifier.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const filePath = body?.filePath;

    if (typeof filePath !== "string" || !filePath.trim()) {
      logJobError("JOB_CREATION_VALIDATION_FAILED", {}, "filePath is required");
      return NextResponse.json(
        { error: "filePath is required" },
        { status: 400 },
      );
    }

    logJob("JOB_CREATION_START", {
      filePath,
    });

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
      logJobError(
        "JOB_CREATION_FAILED",
        { filePath },
        createJobError || message,
      );
      return NextResponse.json({ error: message }, { status: 500 });
    }

    logJob("JOB_CREATED_SUCCESS", {
      jobId: createdJob.id,
      filePath,
      status: "pending",
    });

    // Route only enqueues job; worker loop processes it independently.
    return NextResponse.json({
      job_id: createdJob.id,
      status: "pending",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    logJobError("JOB_CREATION_EXCEPTION", {}, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Handles failed job execution by recording error details and applying retry policy.
 */
async function handleJobFailure(job: QueueJob, error: unknown) {
  const message =
    error instanceof Error ? error.message : "Internal Server Error";

  const nextAttempts = job.attempts + 1;

  const status = nextAttempts >= job.max_attempts ? "failed" : "pending";

  logJob("JOB_FAILURE_HANDLING", {
    jobId: job.id,
    filePath: job.file_path,
    currentAttempts: job.attempts,
    nextAttempts,
    maxAttempts: job.max_attempts,
    error: message,
    decidedStatus: status,
  });

  if (status === "pending") {
    logJob("JOB_RETRY_ENABLED", {
      jobId: job.id,
      filePath: job.file_path,
      nextAttempts,
      maxAttempts: job.max_attempts,
    });
  } else {
    logJob("JOB_RETRY_EXHAUSTED", {
      jobId: job.id,
      filePath: job.file_path,
      attempts: job.attempts,
      maxAttempts: job.max_attempts,
    });
  }

  const { error: updateError } = await supabaseAdmin
    .from("processing_jobs")
    .update({
      status,
      attempts: nextAttempts,
      error_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  if (updateError) {
    logJobError(
      "JOB_FAILURE_UPDATE_FAILED",
      {
        jobId: job.id,
        status,
        attempts: nextAttempts,
      },
      updateError,
    );
    console.error("Failed to update job retry:", updateError);
  }
}

/**
 * Wraps job execution with finalization and retry-aware failure handling.
 */
async function processDocumentJobSafe(job: QueueJob) {
  try {
    await processDocumentJob(job.id, job.file_path);

    logJob("JOB_FINALIZED_SUCCESS", {
      jobId: job.id,
      filePath: job.file_path,
    });

    await updateProcessingJob(job.id, "completed");
  } catch (error) {
    logJobError(
      "JOB_FINALIZED_ERROR",
      {
        jobId: job.id,
        filePath: job.file_path,
        attempts: job.attempts,
      },
      error,
    );

    console.error("Job failed:", error);

    await handleJobFailure(job, error);
  }
}
