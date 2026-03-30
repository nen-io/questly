CREATE TABLE "realm_onboarding_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"realm_id" integer NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"current_step" text DEFAULT 'intro' NOT NULL,
	"completed_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_visited_step" text DEFAULT 'intro' NOT NULL,
	"launched_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "realm_onboarding_state_realm_id_unique" UNIQUE("realm_id")
);
--> statement-breakpoint
ALTER TABLE "realm_onboarding_state" ADD CONSTRAINT "realm_onboarding_state_realm_id_realms_id_fk" FOREIGN KEY ("realm_id") REFERENCES "public"."realms"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "realm_onboarding_state" ("realm_id", "status", "current_step", "completed_steps", "last_visited_step", "launched_at")
SELECT
  rs."realm_id",
  CASE
    WHEN rs."onboarding_completed" THEN 'launched'
    ELSE 'not_started'
  END,
  CASE
    WHEN rs."onboarding_completed" THEN 'launch'
    ELSE 'intro'
  END,
  CASE
    WHEN rs."onboarding_completed" THEN '["intro","identity","landing","player","attribute","quest","reward","launch"]'::jsonb
    ELSE '[]'::jsonb
  END,
  CASE
    WHEN rs."onboarding_completed" THEN 'launch'
    ELSE 'intro'
  END,
  CASE
    WHEN rs."onboarding_completed" THEN now()
    ELSE NULL
  END
FROM "realm_settings" rs
ON CONFLICT ("realm_id") DO NOTHING;
