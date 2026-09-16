CREATE TABLE "restaurant_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cognito_sub" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(254) NOT NULL,
	"phone" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_users_cognitoSub_unique" UNIQUE("cognito_sub"),
	CONSTRAINT "restaurant_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "cuisine_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(60) NOT NULL,
	"slug" varchar(60) NOT NULL,
	"icon_key" varchar(255),
	"position" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "cuisine_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "opening_hours" (
	"id" uuid PRIMARY KEY NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"opens_at" time NOT NULL,
	"closes_at" time NOT NULL,
	CONSTRAINT "opening_hours_day_of_week_range" CHECK ("opening_hours"."day_of_week" BETWEEN 0 AND 6)
);
--> statement-breakpoint
CREATE TABLE "restaurant_cuisines" (
	"restaurant_id" uuid NOT NULL,
	"cuisine_category_id" uuid NOT NULL,
	CONSTRAINT "restaurant_cuisines_restaurant_id_cuisine_category_id_pk" PRIMARY KEY("restaurant_id","cuisine_category_id")
);
--> statement-breakpoint
CREATE TABLE "restaurant_order_counters" (
	"restaurant_id" uuid PRIMARY KEY NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "restaurant_order_counters_positive" CHECK ("restaurant_order_counters"."next_number" >= 1)
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" varchar(80) NOT NULL,
	"legal_name" varchar(160) NOT NULL,
	"trade_name" varchar(120) NOT NULL,
	"cnpj" char(14) NOT NULL,
	"phone" varchar(20),
	"email" varchar(254),
	"description" text,
	"logo_key" varchar(255),
	"banner_key" varchar(255),
	"zip_code" char(8) NOT NULL,
	"street" varchar(160) NOT NULL,
	"number" varchar(20) NOT NULL,
	"complement" varchar(80),
	"neighborhood" varchar(80) NOT NULL,
	"city" varchar(80) NOT NULL,
	"state" char(2) NOT NULL,
	"delivery_fee_cents" integer DEFAULT 0 NOT NULL,
	"min_order_cents" integer DEFAULT 0 NOT NULL,
	"avg_prep_time_min" smallint DEFAULT 30 NOT NULL,
	"status" "restaurant_status" DEFAULT 'DRAFT' NOT NULL,
	"is_accepting_orders" boolean DEFAULT false NOT NULL,
	"rating_avg" numeric(3, 2) DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "restaurants_cnpj_unique" UNIQUE("cnpj"),
	CONSTRAINT "restaurants_delivery_fee_non_negative" CHECK ("restaurants"."delivery_fee_cents" >= 0),
	CONSTRAINT "restaurants_min_order_non_negative" CHECK ("restaurants"."min_order_cents" >= 0),
	CONSTRAINT "restaurants_rating_avg_range" CHECK ("restaurants"."rating_avg" BETWEEN 0 AND 5),
	CONSTRAINT "restaurants_rating_count_non_negative" CHECK ("restaurants"."rating_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "restaurant_members" ADD CONSTRAINT "restaurant_members_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_members" ADD CONSTRAINT "restaurant_members_user_id_restaurant_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."restaurant_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_cuisines" ADD CONSTRAINT "restaurant_cuisines_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_cuisines" ADD CONSTRAINT "restaurant_cuisines_cuisine_category_id_cuisine_categories_id_fk" FOREIGN KEY ("cuisine_category_id") REFERENCES "public"."cuisine_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_order_counters" ADD CONSTRAINT "restaurant_order_counters_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "restaurant_members_restaurant_id_user_id_index" ON "restaurant_members" USING btree ("restaurant_id","user_id");--> statement-breakpoint
CREATE INDEX "restaurant_members_user_id_index" ON "restaurant_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "opening_hours_restaurant_id_day_of_week_index" ON "opening_hours" USING btree ("restaurant_id","day_of_week");--> statement-breakpoint
CREATE INDEX "restaurant_cuisines_cuisine_category_id_index" ON "restaurant_cuisines" USING btree ("cuisine_category_id");--> statement-breakpoint
CREATE INDEX "restaurants_status_index" ON "restaurants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "restaurants_city_status_index" ON "restaurants" USING btree ("city","status");