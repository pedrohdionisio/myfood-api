DROP INDEX "restaurants_city_status_index";--> statement-breakpoint
CREATE INDEX "restaurants_city_status" ON "restaurants" USING btree (immutable_unaccent(lower("city")),"status");