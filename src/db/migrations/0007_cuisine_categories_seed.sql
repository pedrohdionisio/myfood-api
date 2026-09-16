-- Categorias de culinária são dados de plataforma: não há papel de admin (D6) e nenhuma
-- rota as cria. Os ids são fixos para que dev, futuro staging e produção falem dos mesmos
-- registros, e o ON CONFLICT mantém a migration repetível sem sobrescrever edições manuais.
INSERT INTO cuisine_categories (id, name, slug, position) VALUES
  ('01a0abd1-4d34-74bc-931f-92cb1a86378d', 'Pizza', 'pizza', 10),
  ('01a0abd1-4d35-70bf-a4c7-ed785e2e6fba', 'Hambúrguer', 'hamburguer', 20),
  ('01a0abd1-4d35-70bf-a4c7-f0a263abbfed', 'Japonesa', 'japonesa', 30),
  ('01a0abd1-4d35-70bf-a4c7-f4df18ae024c', 'Brasileira', 'brasileira', 40),
  ('01a0abd1-4d35-70bf-a4c7-fa1047c01fed', 'Lanches', 'lanches', 50),
  ('01a0abd1-4d35-70bf-a4c7-fd52b8c0f6ea', 'Açaí', 'acai', 60),
  ('01a0abd1-4d35-70bf-a4c8-00145ed94bc0', 'Saudável', 'saudavel', 70),
  ('01a0abd1-4d35-70bf-a4c8-07a8a33ff43e', 'Doces & Bolos', 'doces-e-bolos', 80),
  ('01a0abd1-4d35-70bf-a4c8-08356b7b4580', 'Italiana', 'italiana', 90),
  ('01a0abd1-4d35-70bf-a4c8-0fbade98b317', 'Árabe', 'arabe', 100),
  ('01a0abd1-4d35-70bf-a4c8-12689cbce1b5', 'Chinesa', 'chinesa', 110),
  ('01a0abd1-4d35-70bf-a4c8-166190cf8317', 'Mexicana', 'mexicana', 120),
  ('01a0abd1-4d35-70bf-a4c8-1a1c79180a6a', 'Marmita', 'marmita', 130),
  ('01a0abd1-4d35-70bf-a4c8-1c75459986d5', 'Pastel', 'pastel', 140),
  ('01a0abd1-4d35-70bf-a4c8-23ad41db497d', 'Churrasco', 'churrasco', 150),
  ('01a0abd1-4d35-70bf-a4c8-2535c4f613f1', 'Frutos do Mar', 'frutos-do-mar', 160),
  ('01a0abd1-4d35-70bf-a4c8-2a2603f6bea0', 'Vegetariana', 'vegetariana', 170),
  ('01a0abd1-4d35-70bf-a4c8-2cf4e73ff654', 'Padaria', 'padaria', 180),
  ('01a0abd1-4d35-70bf-a4c8-31c827322664', 'Sorvetes', 'sorvetes', 190),
  ('01a0abd1-4d35-70bf-a4c8-3466775c9214', 'Bebidas', 'bebidas', 200)
ON CONFLICT (slug) DO NOTHING;
