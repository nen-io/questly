CREATE TABLE "theme_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"audience" text NOT NULL,
	"description" text NOT NULL,
	"tokens" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "theme_presets_key_unique" UNIQUE("key")
);

CREATE TABLE "realms" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "realms_slug_unique" UNIQUE("slug")
);

CREATE TABLE "realm_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"realm_id" integer NOT NULL,
	"theme_preset_id" integer NOT NULL,
	"platform_name" text NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "realm_settings_realm_id_unique" UNIQUE("realm_id")
);

CREATE TABLE "content_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"realm_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"realm_id" integer NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"avatar_storage_key" text,
	"email" text,
	"email_verified_at" timestamp,
	"role" text DEFAULT 'player' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"email_notifications_enabled" boolean DEFAULT true NOT NULL,
	"in_app_notifications_enabled" boolean DEFAULT true NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

CREATE TABLE "user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"realm_id" integer NOT NULL,
	"token_version" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_session_id_unique" UNIQUE("session_id")
);

CREATE TABLE "email_verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);

CREATE TABLE "point_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"realm_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#1f2937' NOT NULL,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "player_point_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"realm_id" integer NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"color" text,
	"icon" text,
	"recurrence" text DEFAULT 'daily' NOT NULL,
	"assignment_mode" text DEFAULT 'all_players' NOT NULL,
	"expires_in_hours" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "task_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "task_point_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"kind" text NOT NULL,
	"amount" integer NOT NULL
);

CREATE TABLE "task_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"due_at" timestamp,
	"resolved_at" timestamp,
	"notes" text,
	"point_snapshot" jsonb
);

CREATE TABLE "task_run_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_run_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "task_run_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_run_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"media_type" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"thumbnail_storage_key" text NOT NULL,
	"thumbnail_mime_type" text NOT NULL,
	"original_name" text,
	"size_bytes" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_run_media_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "task_run_media_thumbnail_storage_key_unique" UNIQUE("thumbnail_storage_key")
);

CREATE TABLE "rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"realm_id" integer NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"color" text,
	"icon" text,
	"assignment_mode" text DEFAULT 'all_players' NOT NULL,
	"cooldown_days" integer DEFAULT 0 NOT NULL,
	"is_redeemable" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "reward_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"reward_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "reward_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"reward_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"amount" integer NOT NULL
);

CREATE TABLE "reward_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"reward_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'purchased' NOT NULL,
	"purchased_at" timestamp DEFAULT now() NOT NULL,
	"redeemed_at" timestamp,
	"point_snapshot" jsonb
);

CREATE TABLE "platform_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"realm_id" integer NOT NULL,
	"type" text NOT NULL,
	"actor_user_id" integer,
	"subject_user_id" integer,
	"task_id" integer,
	"task_run_id" integer,
	"reward_id" integer,
	"reward_purchase_id" integer,
	"comment_id" integer,
	"summary" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"realm_id" integer NOT NULL,
	"recipient_user_id" integer NOT NULL,
	"actor_user_id" integer,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"metadata" jsonb,
	"read_at" timestamp,
	"email_status" text DEFAULT 'pending' NOT NULL,
	"emailed_at" timestamp,
	"email_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "realm_settings" ADD CONSTRAINT "realm_settings_realm_id_realms_id_fk" FOREIGN KEY ("realm_id") REFERENCES "public"."realms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "realm_settings" ADD CONSTRAINT "realm_settings_theme_preset_id_theme_presets_id_fk" FOREIGN KEY ("theme_preset_id") REFERENCES "public"."theme_presets"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_realm_id_realms_id_fk" FOREIGN KEY ("realm_id") REFERENCES "public"."realms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "users" ADD CONSTRAINT "users_realm_id_realms_id_fk" FOREIGN KEY ("realm_id") REFERENCES "public"."realms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_realm_id_realms_id_fk" FOREIGN KEY ("realm_id") REFERENCES "public"."realms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "point_categories" ADD CONSTRAINT "point_categories_realm_id_realms_id_fk" FOREIGN KEY ("realm_id") REFERENCES "public"."realms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "player_point_balances" ADD CONSTRAINT "player_point_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "player_point_balances" ADD CONSTRAINT "player_point_balances_category_id_point_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."point_categories"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_realm_id_realms_id_fk" FOREIGN KEY ("realm_id") REFERENCES "public"."realms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "task_point_rules" ADD CONSTRAINT "task_point_rules_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "task_point_rules" ADD CONSTRAINT "task_point_rules_category_id_point_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."point_categories"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "task_runs" ADD CONSTRAINT "task_runs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "task_runs" ADD CONSTRAINT "task_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "task_run_comments" ADD CONSTRAINT "task_run_comments_task_run_id_task_runs_id_fk" FOREIGN KEY ("task_run_id") REFERENCES "public"."task_runs"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "task_run_comments" ADD CONSTRAINT "task_run_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "task_run_media" ADD CONSTRAINT "task_run_media_task_run_id_task_runs_id_fk" FOREIGN KEY ("task_run_id") REFERENCES "public"."task_runs"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "task_run_media" ADD CONSTRAINT "task_run_media_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_realm_id_realms_id_fk" FOREIGN KEY ("realm_id") REFERENCES "public"."realms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "reward_assignments" ADD CONSTRAINT "reward_assignments_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "reward_assignments" ADD CONSTRAINT "reward_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "reward_costs" ADD CONSTRAINT "reward_costs_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "reward_costs" ADD CONSTRAINT "reward_costs_category_id_point_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."point_categories"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "reward_purchases" ADD CONSTRAINT "reward_purchases_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "reward_purchases" ADD CONSTRAINT "reward_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_realm_id_realms_id_fk" FOREIGN KEY ("realm_id") REFERENCES "public"."realms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_task_run_id_task_runs_id_fk" FOREIGN KEY ("task_run_id") REFERENCES "public"."task_runs"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_reward_purchase_id_reward_purchases_id_fk" FOREIGN KEY ("reward_purchase_id") REFERENCES "public"."reward_purchases"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_comment_id_task_run_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."task_run_comments"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_realm_id_realms_id_fk" FOREIGN KEY ("realm_id") REFERENCES "public"."realms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

CREATE UNIQUE INDEX "content_blocks_realm_key_idx" ON "content_blocks" USING btree ("realm_id","key");
CREATE UNIQUE INDEX "user_sessions_user_session_idx" ON "user_sessions" USING btree ("user_id","session_id");
CREATE UNIQUE INDEX "point_categories_realm_slug_idx" ON "point_categories" USING btree ("realm_id","slug");
CREATE UNIQUE INDEX "player_point_balances_user_category_idx" ON "player_point_balances" USING btree ("user_id","category_id");
CREATE UNIQUE INDEX "tasks_realm_slug_idx" ON "tasks" USING btree ("realm_id","slug");
CREATE UNIQUE INDEX "task_assignments_task_user_idx" ON "task_assignments" USING btree ("task_id","user_id");
CREATE UNIQUE INDEX "task_point_rules_task_category_kind_idx" ON "task_point_rules" USING btree ("task_id","category_id","kind");
CREATE UNIQUE INDEX "task_runs_active_task_user_idx" ON "task_runs" USING btree ("task_id","user_id","status","started_at");
CREATE UNIQUE INDEX "task_run_media_task_run_sort_idx" ON "task_run_media" USING btree ("task_run_id","sort_order");
CREATE UNIQUE INDEX "rewards_realm_slug_idx" ON "rewards" USING btree ("realm_id","slug");
CREATE UNIQUE INDEX "reward_assignments_reward_user_idx" ON "reward_assignments" USING btree ("reward_id","user_id");
CREATE UNIQUE INDEX "reward_costs_reward_category_idx" ON "reward_costs" USING btree ("reward_id","category_id");
CREATE UNIQUE INDEX "reward_purchases_reward_user_purchase_idx" ON "reward_purchases" USING btree ("reward_id","user_id","purchased_at");
CREATE INDEX "platform_events_realm_created_idx" ON "platform_events" USING btree ("realm_id","created_at");
CREATE INDEX "platform_events_type_idx" ON "platform_events" USING btree ("type","created_at");
