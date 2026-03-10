-- Add Agriculture and Élevage activity-type modules
-- These represent the types of farming activities available to organizations

INSERT INTO modules (name, icon, category, description, required_plan, is_available) VALUES
  -- Agriculture modules
  ('arbres_fruitiers', 'TreeDeciduous', 'agriculture', 'Gestion des arbres fruitiers (pommiers, agrumes, grenadiers, avocatiers...)', NULL, true),
  ('aeroponie', 'Droplets', 'agriculture', 'Culture aéroponique', NULL, true),
  ('hydroponie', 'Waves', 'agriculture', 'Culture hydroponique', NULL, true),
  ('maraichage', 'Sprout', 'agriculture', 'Maraîchage et cultures légumières', NULL, true),
  ('myciculture', 'Flower2', 'agriculture', 'Myciculture - culture de champignons', NULL, true),
  ('pisciculture', 'Fish', 'agriculture', 'Pisciculture - élevage de poissons', NULL, true),
  -- Élevage modules
  ('bovin', 'Beef', 'elevage', 'Élevage bovin', NULL, true),
  ('ovin', 'CircleDot', 'elevage', 'Élevage ovin', NULL, true),
  ('camelin', 'CircleDot', 'elevage', 'Élevage camelin', NULL, true),
  ('caprin', 'CircleDot', 'elevage', 'Élevage caprin', NULL, true),
  ('aviculture', 'Bird', 'elevage', 'Aviculture - élevage de volailles', NULL, true),
  ('couveuses', 'Egg', 'elevage', 'Gestion des couveuses (poussins, poulet de chair, poules pondeuses)', NULL, true)
ON CONFLICT (name) DO NOTHING;
