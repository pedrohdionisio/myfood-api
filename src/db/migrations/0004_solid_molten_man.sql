CREATE TABLE "delivery_confirmation_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" varchar(120) NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"quantity" smallint NOT NULL,
	"total_cents" integer NOT NULL,
	"notes" varchar(280),
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_unit_price_non_negative" CHECK ("order_items"."unit_price_cents" >= 0),
	CONSTRAINT "order_items_total_matches_line" CHECK ("order_items"."total_cents" = "order_items"."unit_price_cents" * "order_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status" NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" uuid,
	"reason" varchar(280),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_number" integer NOT NULL,
	"customer_id" uuid NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"driver_member_id" uuid,
	"status" "order_status" NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"change_for_cents" integer,
	"subtotal_cents" integer NOT NULL,
	"delivery_fee_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"delivery_code" char(4) NOT NULL,
	"notes" varchar(280),
	"delivery_zip_code" char(8) NOT NULL,
	"delivery_street" varchar(160) NOT NULL,
	"delivery_number" varchar(20) NOT NULL,
	"delivery_complement" varchar(80),
	"delivery_neighborhood" varchar(80) NOT NULL,
	"delivery_city" varchar(80) NOT NULL,
	"delivery_state" char(2) NOT NULL,
	"delivery_reference" varchar(160),
	"cancellation_reason" varchar(280),
	"confirmed_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_total_matches_parts" CHECK ("orders"."total_cents" = "orders"."subtotal_cents" + "orders"."delivery_fee_cents" - "orders"."discount_cents"),
	CONSTRAINT "orders_subtotal_non_negative" CHECK ("orders"."subtotal_cents" >= 0),
	CONSTRAINT "orders_delivery_fee_non_negative" CHECK ("orders"."delivery_fee_cents" >= 0),
	CONSTRAINT "orders_discount_non_negative" CHECK ("orders"."discount_cents" >= 0),
	CONSTRAINT "orders_total_non_negative" CHECK ("orders"."total_cents" >= 0),
	CONSTRAINT "orders_delivery_code_format" CHECK ("orders"."delivery_code" ~ '^[0-9]{4}$'),
	CONSTRAINT "orders_change_only_for_cash" CHECK ("orders"."change_for_cents" IS NULL OR "orders"."payment_method" = 'CASH')
);
--> statement-breakpoint
ALTER TABLE "restaurant_members" ADD CONSTRAINT "restaurant_members_id_restaurant_id" UNIQUE("id","restaurant_id");
--> statement-breakpoint
ALTER TABLE "delivery_confirmation_attempts" ADD CONSTRAINT "delivery_confirmation_attempts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_confirmation_attempts" ADD CONSTRAINT "delivery_confirmation_attempts_member_id_restaurant_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."restaurant_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_driver_member_id_restaurant_id_restaurant_members_id_restaurant_id_fk" FOREIGN KEY ("driver_member_id","restaurant_id") REFERENCES "public"."restaurant_members"("id","restaurant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delivery_confirmation_attempts_order_id_created_at_index" ON "delivery_confirmation_attempts" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "idempotency_keys_created_at_index" ON "idempotency_keys" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_id_index" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_index" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_status_history_order_id_created_at_index" ON "order_status_history" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_restaurant_id_display_number_index" ON "orders" USING btree ("restaurant_id","display_number");--> statement-breakpoint
CREATE INDEX "orders_restaurant_id_status_index" ON "orders" USING btree ("restaurant_id","status");--> statement-breakpoint
CREATE INDEX "orders_restaurant_id_created_at_index" ON "orders" USING btree ("restaurant_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_customer_id_created_at_index" ON "orders" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_driver_member_id_status_index" ON "orders" USING btree ("driver_member_id","status");