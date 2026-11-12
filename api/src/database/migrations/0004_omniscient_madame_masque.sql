CREATE TABLE "company_manager_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"companyId" uuid NOT NULL,
	"fromMemberId" uuid,
	"toMemberId" uuid,
	"changedByUserId" uuid,
	"origin" text NOT NULL,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "createdByUserId" uuid;--> statement-breakpoint
ALTER TABLE "company_manager_changes" ADD CONSTRAINT "company_manager_changes_companyId_companies_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_manager_changes" ADD CONSTRAINT "company_manager_changes_fromMemberId_company_members_id_fk" FOREIGN KEY ("fromMemberId") REFERENCES "public"."company_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_manager_changes" ADD CONSTRAINT "company_manager_changes_toMemberId_company_members_id_fk" FOREIGN KEY ("toMemberId") REFERENCES "public"."company_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_manager_changes" ADD CONSTRAINT "company_manager_changes_changedByUserId_users_id_fk" FOREIGN KEY ("changedByUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_createdByUserId_users_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;