/*
  # Add Day Laborer Specialties

  1. Changes
    - Insert default task categories
    - No need to recreate table or policy as they already exist

  2. Security
    - Maintain existing RLS policies
*/

-- Insert default task categories if they don't exist
INSERT INTO task_categories (name, description)
VALUES
  ('Fertilisation', 'Application des engrais et amendements'),
  ('Taille', 'Taille des arbres et arbustes'),
  ('Récolte', 'Récolte des fruits et produits'),
  ('Irrigation', 'Gestion et maintenance de l''irrigation'),
  ('Désherbage', 'Contrôle des mauvaises herbes'),
  ('Entretien', 'Entretien général des parcelles'),
  ('Protection', 'Application des traitements phytosanitaires'),
  ('Plantation', 'Plantation des arbres et cultures'),
  ('Traitement', 'Application des traitements phytosanitaires')
ON CONFLICT DO NOTHING;