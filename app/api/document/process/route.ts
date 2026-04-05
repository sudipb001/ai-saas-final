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

export async function POST(req: Request) {
  let jobId: string | null = null;

  try {
    const body = await req.json();
    const filePath = body?.filePath;

    if (typeof filePath !== "string" || !filePath.trim()) {
      return NextResponse.json(
        { error: "filePath is required" },
        { status: 400 },
      );
    }

    // STEP 1 — Create Job (pending)
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

    const createdJobId = createdJob.id;
    jobId = createdJobId;

    // STEP 2 — Mark processing
    await updateProcessingJob(createdJobId, "processing");

    // STEP 3 — Existing processing (UNCHANGED)
    const text = await extractTextFromDocument(filePath);

    if (!text || !text.trim()) {
      throw new DocumentExtractionError(
        "No extractable text found in document",
      );
    }

    const summary = await summarizeDocumentText(text);

    const fileName = filePath.split("/").pop() || filePath;

    const { data: insertedDocument, error } = await supabaseAdmin
      .from("documents")
      .insert({
        file_name: fileName,
        file_path: filePath,
        summary,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // STEP 4 — Link job to document
    const { error: linkError } = await supabaseAdmin
      .from("processing_jobs")
      .update({
        document_id: insertedDocument?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", createdJobId);

    if (linkError) {
      throw new Error(linkError.message);
    }

    // STEP 5 — Mark completed
    await updateProcessingJob(createdJobId, "completed");

    // STEP 6 — Response (unchanged + job_id)
    return NextResponse.json({
      summary,
      filePath,
      fileName,
      job_id: createdJobId,
    });
  } catch (error) {
    // STEP 7 — Failure handling
    if (jobId) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";

      try {
        await updateProcessingJob(jobId, "failed", message);
      } catch (jobUpdateError) {
        console.error(
          "Failed to mark processing job as failed:",
          jobUpdateError,
        );
      }
    }

    if (error instanceof DocumentExtractionError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
