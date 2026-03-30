CREATE TABLE "task_run_media_jobs" (
    "id" serial PRIMARY KEY NOT NULL,
    "realm_id" integer NOT NULL REFERENCES "realms"("id"),
    "task_run_id" integer NOT NULL REFERENCES "task_runs"("id"),
    "user_id" integer NOT NULL REFERENCES "users"("id"),
    "media_type" text NOT NULL,
    "mime_type" text NOT NULL,
    "storage_key" text NOT NULL UNIQUE,
    "original_name" text,
    "size_bytes" integer,
    "sort_order" integer NOT NULL DEFAULT 0,
    "status" text NOT NULL DEFAULT 'pending',
    "attempt_count" integer NOT NULL DEFAULT 0,
    "last_error" text,
    "next_attempt_at" timestamp NOT NULL DEFAULT now(),
    "locked_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "task_run_media_jobs_status_next_attempt_idx"
    ON "task_run_media_jobs" ("status", "next_attempt_at");

CREATE INDEX "task_run_media_jobs_task_run_idx"
    ON "task_run_media_jobs" ("task_run_id");
