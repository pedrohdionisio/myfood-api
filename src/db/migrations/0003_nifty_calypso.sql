CREATE TABLE "menu_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_categories_id_restaurant_id" UNIQUE("id","restaurant_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"menu_category_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"image_key" varchar(255),
	"position" smallint DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_non_negative" CHECK ("products"."price_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_menu_category_id_restaurant_id_menu_categories_id_restaurant_id_fk" FOREIGN KEY ("menu_category_id","restaurant_id") REFERENCES "public"."menu_categories"("id","restaurant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "menu_categories_restaurant_id_position_index" ON "menu_categories" USING btree ("restaurant_id","position");--> statement-breakpoint
CREATE INDEX "products_restaurant_id_menu_category_id_position_index" ON "products" USING btree ("restaurant_id","menu_category_id","position");