CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cnpj" text NOT NULL,
	"legalName" text NOT NULL,
	"tradeName" text NOT NULL,
	"sector" text NOT NULL,
	"size" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"website" text,
	"about" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
CREATE TABLE "company_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"companyId" uuid NOT NULL,
	"userId" uuid,
	"name" text NOT NULL,
	"jobTitle" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"isPrimary" boolean DEFAULT false NOT NULL,
	"inviteTokenHash" text,
	"inviteExpiresAt" timestamp,
	"joinedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_members_companyId_email_unique" UNIQUE("companyId","email")
);
--> statement-breakpoint
CREATE TABLE "mentor_accounts" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"fullName" text NOT NULL,
	"cpf" text NOT NULL,
	"birthDate" date NOT NULL,
	"phone" text NOT NULL,
	"pixKeyType" text NOT NULL,
	"pixKey" text NOT NULL,
	"bio" text NOT NULL,
	"expertise" text[] DEFAULT '{}' NOT NULL,
	"termsAcceptedAt" timestamp NOT NULL,
	"openedAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mentor_accounts_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"birthDate" date,
	"city" text,
	"neighborhood" text,
	"phone" text,
	"interests" text[] DEFAULT '{}' NOT NULL,
	"goal" text,
	"headline" text,
	"bio" text,
	"talentVisible" boolean DEFAULT false NOT NULL,
	"onboardingCompletedAt" timestamp,
	"onboardingSkippedAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_companyId_companies_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_accounts" ADD CONSTRAINT "mentor_accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;