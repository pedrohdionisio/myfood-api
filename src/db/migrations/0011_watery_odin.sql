CREATE TYPE "public"."order_event_type" AS ENUM('ORDER_CREATED', 'ORDER_DELIVERED', 'ORDER_CANCELED');--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "order_event_type" NOT NULL,
	"order_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "outbox_events_pending" ON "outbox_events" USING btree ("created_at") WHERE "outbox_events"."published_at" is null;