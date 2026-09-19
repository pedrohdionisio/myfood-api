CREATE TYPE "public"."payment_charge_status" AS ENUM('PENDING', 'PAID', 'EXPIRED', 'CANCELED', 'REFUND_PENDING', 'REFUNDED', 'FAILED');--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"event_id" varchar(128) PRIMARY KEY NOT NULL,
	"event" varchar(60) NOT NULL,
	"provider_charge_id" varchar(64),
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"provider_charge_id" varchar(64) NOT NULL,
	"status" "payment_charge_status" DEFAULT 'PENDING' NOT NULL,
	"amount_cents" integer NOT NULL,
	"br_code" text NOT NULL,
	"platform_fee_cents" integer,
	"receipt_url" varchar(255),
	"expires_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_providerChargeId_unique" UNIQUE("provider_charge_id"),
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_order_id_index" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_status_expires_at_index" ON "payments" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_one_open_charge" ON "payments" USING btree ("order_id") WHERE "payments"."status" = 'PENDING';