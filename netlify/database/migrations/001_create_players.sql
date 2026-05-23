CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  nickname TEXT UNIQUE NOT NULL,
  estate TEXT NOT NULL DEFAULT 'Крестьянин',
  diamonds INTEGER NOT NULL DEFAULT 0,
  licenses TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO players (nickname, estate, diamonds, licenses) VALUES
  ('sasha13131', 'Высшая власть', 10000, ARRAY['Шахтёрская', 'Строительная']),
  ('dimon2009', 'Дворянин', 5000, ARRAY['Торговая']);
