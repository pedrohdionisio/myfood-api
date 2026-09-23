ALTER TABLE "push_tokens" ALTER COLUMN "customer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD COLUMN "restaurant_user_id" uuid;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_restaurant_user_id_restaurant_users_id_fk" FOREIGN KEY ("restaurant_user_id") REFERENCES "public"."restaurant_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "push_tokens_restaurant_user_id_index" ON "push_tokens" USING btree ("restaurant_user_id");--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_single_owner" CHECK (num_nonnulls("push_tokens"."customer_id", "push_tokens"."restaurant_user_id") = 1);