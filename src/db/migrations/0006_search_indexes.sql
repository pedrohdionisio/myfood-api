-- Busca por nome com pg_trgm. O índice é sobre immutable_unaccent(...) e não sobre a
-- coluna crua, então a query precisa aplicar a MESMA função para o índice ser usado.
CREATE INDEX restaurants_trade_name_trgm
  ON restaurants USING gin (immutable_unaccent(trade_name) gin_trgm_ops);

CREATE INDEX products_name_trgm
  ON products USING gin (immutable_unaccent(name) gin_trgm_ops);
