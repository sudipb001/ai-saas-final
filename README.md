# 1. Project Overview

This is a Next.js App Router AI SaaS learning project with Supabase auth/storage/database and OpenAI-based summarization/chat.

Real implemented behavior:

- Users register/login with Supabase auth on client pages.
- Dashboard includes: text summarizer UI, chatbot UI, file upload + document list UI, and a simple "Pro" subscription button.
- File upload stores the raw file in Supabase Storage, then creates a processing job in `processing_jobs`.
- A polling worker inside the `/api/document/process` route module attempts extraction + summarization and inserts a row into `documents`.
- Dashboard fetches documents from API and displays recent summaries.

High-level flow in code:

Upload -> Processing -> AI -> Storage -> Dashboard

# 2. System Architecture

Frontend (Next.js App Router)

- `app/dashboard/page.tsx` is the main authenticated page.
- UI components:
  - `components/documents/FileUpload.tsx`
  - `components/ai/Chatbot.tsx`
  - `components/ai/Summarizer.tsx`
  - `components/dashboard/Pricing.tsx`
- Login and register pages use Supabase client auth methods.

API Layer

- `/api/ai/chat`:
  - Auth via `getAuthenticatedUser`.
  - Checks usage limits (`checkUsageLimit`) and in-memory rate limit (`checkRateLimit`).
  - Calls OpenAI (`chatWithAI`) and logs request to `ai_requests`.
- `/api/ai/summarize`:
  - Auth via `getAuthenticatedUser`.
  - Calls OpenAI summarization for direct text input.
- `/api/document/process`:
  - Auth via `getAuthenticatedUser`.
  - Enqueues job in `processing_jobs`.
  - Also starts module-level polling worker (`setInterval`) that processes pending jobs.
- `/api/job/[id]`:
  - Auth via `getAuthenticatedUser`.
  - Returns job status and linked document id.
- `/api/documents`:
  - Auth via `getAuthenticatedUser`.
  - Returns user-filtered document rows.
- `/api/document/pdf` and `/api/document/excel`:
  - Auth via `getAuthenticatedUser`.
  - Export PDF for one document and Excel for document list.
- `/api/subscriptions/create`:
  - Does not use token auth helper; accepts `userId` and `plan` from request body.
- `/api/document/extract`:
  - No auth check; extracts text from a provided storage path.

Worker / Queue System

- Queue table: `processing_jobs`.
- Poll loop in API route module checks for pending jobs every 3 seconds.
- Claims job (`pending` -> `processing`) and runs extraction + summarization pipeline.

Database (Supabase)

- Main tables in schema files:
  - `documents`
  - `processing_jobs`
  - `ai_requests`
  - `subscriptions`
- `user_id` exists on all main tables.
- RLS policies are defined in SQL, but runtime queries mostly use service role client (`supabaseAdmin`).

Storage

- Uses Supabase bucket named `documents`.
- Uploaded paths are generated as `uploads/<uuid>.<ext>`.

AI Integration

- OpenAI SDK with `gpt-4o-mini`.
- Chat endpoint uses single prompt/response call.
- Document summarization for extracted text uses chunking + final synthesis call.

# 3. Data Flow (CRITICAL)

User Upload
-> Storage
-> API
-> Job Creation
-> Worker Processing
-> AI Calls
-> Database Insert
-> UI Fetch

Actual implemented pipeline details:

1. User selects PDF/TXT in dashboard upload component.
2. Client uploads file directly to Supabase Storage bucket `documents` (`uploads/<uuid>.<ext>`).
3. Client calls `/api/document/process` with `filePath` and `userId` in JSON body.
4. API inserts `processing_jobs` row with `status = pending`.
5. Route-local worker polling loop picks oldest pending job and marks it processing.
6. Worker downloads file from storage and extracts text (`pdf-parse` for PDF, decoder for TXT).
7. Worker summarizes extracted text with OpenAI and inserts a `documents` row.
8. Worker updates job with `document_id` and terminal status.
9. Frontend polls `/api/job/[id]` every 2 seconds, then reloads `/api/documents`.

# 4. Key Features (ONLY WHAT EXISTS)

- File upload to Supabase Storage (PDF/TXT).
- Document processing pipeline (storage download -> extraction -> AI summary -> DB insert).
- AI chat endpoint with usage cap + in-memory rate limit.
- Text summarization endpoint for pasted text.
- Dashboard UI with auth gate and logout.
- Job status endpoint and frontend polling.
- Basic retry fields and retry update logic in worker helpers.
- Console-based structured logging for job stages and errors.
- Document export endpoints (PDF and Excel generation).
- Simple subscription row creation endpoint and UI trigger.

# 5. Current Limitations (VERY IMPORTANT)

- Auth is partially implemented and can be bypassed:
  - `getAuthenticatedUser` accepts `userId` from body/query if no bearer token exists.
  - This allows identity assertion from request payload/query instead of verified session token.
- Auth coverage is inconsistent:
  - `/api/document/extract` has no auth enforcement.
  - `/api/subscriptions/create` does not verify token/session; trusts body `userId`.
- Several frontend requests do not send bearer tokens:
  - They rely on `userId` fallback or fail auth.
  - `/api/ai/summarize`, `/api/document/pdf`, and `/api/document/excel` calls from UI do not provide `userId` fallback values.
- Service-role Supabase client is used for most API DB access:
  - RLS protections are effectively bypassed by server code; isolation depends on manual `.eq("user_id", user.id)` filters.
- Worker execution model is not production-safe:
  - Polling worker runs in API route memory via `setInterval`.
  - No dedicated worker process, distributed lock, or queue backend.
  - Multi-instance deployment can cause duplicate workers and race behavior.
- Job lifecycle handling has correctness issues:
  - `processDocumentJob` catches errors internally and does not rethrow.
  - Wrapper `processDocumentJobSafe` then marks job as `completed`, which can overwrite prior failure state.
  - Retry handler is not reliably reached for failures inside the inner function.
- Frontend poll error handling is weak:
  - Failed job in polling callback can resolve silently and still continue with "Document ready" flow.
- Storage lifecycle cleanup is missing:
  - Failed/abandoned uploads are not deleted.
  - No retention or cleanup worker for orphaned files.
- Validation is minimal:
  - File extension/content checks are basic and mostly client-side.
  - No strict server-side mime/content integrity checks before processing.
- Performance and cost controls are limited:
  - In-memory rate limiter resets per process and does not work globally across instances.
  - Large documents are chunked, but processing is sequential with no backpressure/priority management.

# 6. Security Model

How authentication works

- Primary path: bearer token in `Authorization` header, resolved with `supabaseAdmin.auth.getUser(token)`.
- Fallback path: `userId` from request body (POST) or query string (GET).

Where it is enforced

- Enforced in:
  - `/api/ai/chat`
  - `/api/ai/summarize`
  - `/api/document/process`
  - `/api/documents`
  - `/api/job/[id]`
  - `/api/document/pdf`
  - `/api/document/excel`

Where it is not enforced

- `/api/document/extract` has no auth.
- `/api/subscriptions/create` accepts `userId` directly and does not use auth helper.

User isolation status

- Database schema has `user_id` columns and RLS policies.
- Runtime uses service-role DB client in APIs, so RLS is bypassed for those operations.
- Isolation currently depends on route-level query filters and trusted `userId` resolution, not strict token-only identity.

# 7. Async Processing Model

Job lifecycle

- `pending` -> `processing` -> `completed` or `failed`
- Stored in `processing_jobs` with `attempts`, `max_attempts`, timestamps, and optional `error_message`.

Worker behavior

- Worker is started by importing `/api/document/process` route module.
- Uses `setInterval` polling every 3 seconds.
- Claims one pending job at a time and processes it.

Queue system

- Queue is implemented as a database table (`processing_jobs`).
- Polling query selects oldest pending row and updates it to processing.

Retry logic

- Retry helper computes `nextAttempts` and flips status to `pending` or `failed`.
- Max attempts are read from row (`max_attempts`, default 3).
- Current implementation has error-propagation issues that can prevent retry path from executing consistently.

# 8. Local Development Setup

Environment variables

Create `.env.local` using the template values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

Install and run

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

Supabase setup (required)

- Provision a Supabase project.
- Apply schema SQL (`supabase_schema.sql` is the most complete schema in this repo, including `processing_jobs`).
- Ensure a storage bucket named `documents` exists.
- Enable email/password auth users for login/register flow.

# 9. Production Considerations

Must-fix before real deployment

- Remove body/query `userId` auth fallback; require verified bearer token/session only.
- Enforce auth consistently on all APIs, including `/api/document/extract` and subscription creation.
- Replace route-local in-memory worker with dedicated background worker/queue infrastructure.
- Correct job failure propagation so failed jobs do not end as completed.
- Add robust server-side validation for file type/content and request payloads.
- Avoid service-role DB calls for user-scoped reads/writes where possible, or harden authorization checks.

Scaling concerns

- In-memory rate limiter does not scale across instances.
- DB polling queue can become inefficient under high throughput.
- OpenAI calls are synchronous per chunk and can increase latency/cost for large documents.

Architecture limitations

- No distributed locking/job deduplication strategy.
- No dead-letter queue.
- Limited observability (console logs only; no centralized metrics/tracing/alerts).

# 10. Learning Context (IMPORTANT)

This repository is best understood as a learning and debugging project, not a production template.

- It intentionally combines working paths with incomplete/unsafe paths so architecture and failure modes can be studied.
- It is useful for understanding upload pipelines, API route design, queue-like workflows, and auth pitfalls in real code.
- The current implementation is intentionally imperfect and should be hardened before any real-world deployment.
