ALTER TABLE "realm_onboarding_state"
ALTER COLUMN "current_step" SET DEFAULT 'identity';
--> statement-breakpoint
ALTER TABLE "realm_onboarding_state"
ALTER COLUMN "last_visited_step" SET DEFAULT 'identity';
--> statement-breakpoint
UPDATE "realm_onboarding_state"
SET
  "current_step" = CASE WHEN "current_step" = 'intro' THEN 'identity' ELSE "current_step" END,
  "last_visited_step" = CASE WHEN "last_visited_step" = 'intro' THEN 'identity' ELSE "last_visited_step" END,
  "completed_steps" = (
    SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
    FROM jsonb_array_elements_text("completed_steps") AS value
    WHERE value <> 'intro'
  ),
  "updated_at" = now();
