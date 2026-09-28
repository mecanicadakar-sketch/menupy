-- Ejecutá este script en la consola SQL de Neon
-- (en tu proyecto de Neon: pestaña "SQL Editor")

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'generico',
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  category_id INT REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price INT DEFAULT 0,
  image TEXT DEFAULT '',
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Datos iniciales: cambiá el usuario, el PIN y el mensaje de envío por los tuyos
INSERT INTO config (key, value) VALUES
  ('admin_user', 'Usuario'),
  ('pin', 'Ricaji270985#'),
  ('delivery_note', 'El costo de envío se coordina según la zona')
ON CONFLICT (key) DO NOTHING;

-- Categoría y producto de ejemplo para probar que todo funciona
INSERT INTO categories (name, icon, sort_order) VALUES ('Almuerzos', 'almuerzo', 1)
ON CONFLICT DO NOTHING;

INSERT INTO items (id, category_id, name, description, price, sort_order)
SELECT 'alm1', id, 'Menú del día', 'Plato completo, varía según el día', 25000, 1
FROM categories WHERE name = 'Almuerzos'
ON CONFLICT (id) DO NOTHING;
