CREATE TABLE "processed_messages" (
	"message_id" varchar(128) PRIMARY KEY NOT NULL,
	"consumer" varchar(60) NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_daily_sales" (
	"product_id" uuid NOT NULL,
	"date" date NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"revenue_cents" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "product_daily_sales_product_id_date_pk" PRIMARY KEY("product_id","date"),
	CONSTRAINT "product_daily_sales_non_negative" CHECK ("product_daily_sales"."quantity" >= 0 AND "product_daily_sales"."revenue_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "restaurant_daily_stats" (
	"restaurant_id" uuid NOT NULL,
	"date" date NOT NULL,
	"orders_count" integer DEFAULT 0 NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"canceled_count" integer DEFAULT 0 NOT NULL,
	"gross_revenue_cents" bigint DEFAULT 0 NOT NULL,
	"delivery_fee_revenue_cents" bigint DEFAULT 0 NOT NULL,
	"total_prep_seconds" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_daily_stats_restaurant_id_date_pk" PRIMARY KEY("restaurant_id","date"),
	CONSTRAINT "restaurant_daily_stats_non_negative" CHECK (
      "restaurant_daily_stats"."orders_count" >= 0 AND "restaurant_daily_stats"."delivered_count" >= 0 AND "restaurant_daily_stats"."canceled_count" >= 0
      AND "restaurant_daily_stats"."gross_revenue_cents" >= 0 AND "restaurant_daily_stats"."delivery_fee_revenue_cents" >= 0
      AND "restaurant_daily_stats"."total_prep_seconds" >= 0
    )
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"comment" varchar(1000),
	"reply" varchar(1000),
	"replied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_orderId_unique" UNIQUE("order_id"),
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_id_customer_id_restaurant_id" UNIQUE("id","customer_id","restaurant_id");
--> statement-breakpoint
ALTER TABLE "product_daily_sales" ADD CONSTRAINT "product_daily_sales_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_daily_sales" ADD CONSTRAINT "product_daily_sales_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_daily_stats" ADD CONSTRAINT "restaurant_daily_stats_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_customer_id_restaurant_id_orders_id_customer_id_restaurant_id_fk" FOREIGN KEY ("order_id","customer_id","restaurant_id") REFERENCES "public"."orders"("id","customer_id","restaurant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_daily_sales_restaurant_id_date_index" ON "product_daily_sales" USING btree ("restaurant_id","date");--> statement-breakpoint
CREATE INDEX "reviews_restaurant_id_created_at_index" ON "reviews" USING btree ("restaurant_id","created_at");