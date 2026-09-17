ALTER TABLE "reviews" DROP CONSTRAINT "reviews_orderId_unique";--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_unique" UNIQUE("order_id");