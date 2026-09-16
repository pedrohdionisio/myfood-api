CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() é STABLE e o Postgres recusa função STABLE em índice de expressão.
-- Os índices de busca usam este wrapper IMMUTABLE. Alterar o dicionário unaccent
-- exigiria reindexar tudo que depende dele.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1)
$$;
