CREATE TYPE "public"."actor_type" AS ENUM('CUSTOMER', 'RESTAURANT_USER', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('IOS', 'ANDROID');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('OWNER', 'DRIVER');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING_PAYMENT', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'REJECTED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('ONLINE', 'CASH', 'CARD_ON_DELIVERY');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."restaurant_status" AS ENUM('DRAFT', 'ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"label" varchar(40),
	"zip_code" char(8) NOT NULL,
	"street" varchar(160) NOT NULL,
	"number" varchar(20) NOT NULL,
	"complement" varchar(80),
	"neighborhood" varchar(80) NOT NULL,
	"city" varchar(80) NOT NULL,
	"state" char(2) NOT NULL,
	"reference" varchar(160),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cognito_sub" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(254) NOT NULL,
	"phone" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_cognitoSub_unique" UNIQUE("cognito_sub"),
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"platform" "device_platform" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_addresses_customer_id_index" ON "customer_addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_addresses_one_default" ON "customer_addresses" USING btree ("customer_id") WHERE "customer_addresses"."is_default";--> statement-breakpoint
CREATE INDEX "push_tokens_customer_id_index" ON "push_tokens" USING btree ("customer_id");