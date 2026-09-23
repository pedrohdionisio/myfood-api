-- A descoberta é por cidade, sem coordenadas: o PostGIS nunca foi usado. A 0000 deixou de
-- criá-lo, e esta o remove dos bancos que já tinham rodado a versão antiga dela.
DROP EXTENSION IF EXISTS postgis;
--> statement-breakpoint
-- Servia só à busca de produtos por nome, que saiu da API.
DROP INDEX IF EXISTS products_name_trgm;
