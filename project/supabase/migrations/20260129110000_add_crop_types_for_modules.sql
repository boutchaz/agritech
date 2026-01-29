-- Add Crop Types for Module System
-- Migration Date: 2026-01-29
-- Description: Adds crop type data for module filtering and classification

-- Note: The crop_types table already exists in the base schema
-- This migration adds module-specific crop type categories

-- Check if module column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crop_types' AND column_name = 'module_slug'
  ) THEN
    ALTER TABLE crop_types ADD COLUMN module_slug VARCHAR(100);
    COMMENT ON COLUMN crop_types.module_slug IS 'Associated module slug for this crop type';
  END IF;
END $$;

-- Insert default crop types with module associations
INSERT INTO crop_types (name, name_fr, name_ar, description, description_fr, description_ar, organization_id, module_slug)
VALUES
  -- Fruit Trees (orchards module)
  ('Fruit Trees', 'Arbres fruitiers', 'أشجار الفاكهة',
   'Trees cultivated for their edible fruit', 'Arbres cultivés pour leurs fruits comestibles', 'أشجار تزرع من أجل ثمارها الصالحة للأكل',
   NULL, 'orchards'),
  ('Citrus', 'Agrumes', 'حمضيات',
   'Citrus fruit trees including oranges, lemons, and grapefruits', 'Agrumes comprenant les oranges, les citrons et les pamplemousses', 'أشجار الحمضيات بما في ذلك البرتقال والليمون والجريب فروت',
   NULL, 'orchards'),
  ('Stone Fruits', 'Fruits à noyau', 'فواكه ذات النواة',
   'Fruits with a large stone/pit (peaches, plums, apricots)', 'Fruits à noyau (pêches, prunes, abricots)', 'فواكه ذات نواة كبيرة (خوخ، برقوق، مشمش)',
   NULL, 'orchards'),
  ('Pome Fruits', 'Fruits à pépins', 'فواكه من الفصيلة الوردية',
   'Apples, pears, and quince', 'Pommes, poires et coings', 'التفاح والكمثرى والسفرجل',
   NULL, 'orchards'),
  ('Tropical Fruits', 'Fruits tropicaux', 'فواكه استوائية',
   'Bananas, mangoes, papaya, and other tropical fruits', 'Bananes, mangues, papayes et autres fruits tropicaux', 'موز، مانجو، بابايا وفواكه استوائية أخرى',
   NULL, 'orchards'),

  -- Cereals (general crops module)
  ('Cereals', 'Céréales', 'الحبوب',
   'Grain crops including wheat, barley, and corn', 'Cultures céréalières dont blé, orge et maïs', 'محاصيل الحبوب بما في ذلك القمح والشعير والذرة',
   NULL, 'crops'),
  ('Wheat', 'Blé', 'قمح',
   'Common wheat for flour production', 'Blé commun pour la production de farine', 'القمح الشائع لإنتاج الدقيق',
   NULL, 'crops'),
  ('Barley', 'Orge', 'شعير',
   'Barley for food, feed, and malt production', 'Orge pour l alimentation, l alimentation animale et la production de malt', 'الشعير للغذاء والأعلاف وإنتاج المالت',
   NULL, 'crops'),
  ('Corn', 'Maïs', 'ذرة',
   'Corn/Maize for grain and silage', 'Maïs pour grain et ensilage', 'الذرة للحبوب والعلف',
   NULL, 'crops'),
  ('Rice', 'Riz', 'أرز',
   'Rice cultivation in paddies', 'Riziculture dans les rizières', 'زراعة الأرز في المزارع',
   NULL, 'crops'),

  -- Vegetables (general crops module)
  ('Vegetables', 'Légumes', 'خضروات',
   'Vegetable crops for fresh market and processing', 'Cultures maraîchères pour le marché frais et la transformation', 'محاصيل الخضروات للسوق الطازجة والتصنيع',
   NULL, 'crops'),
  ('Leafy Greens', 'Feuilles vertes', 'الخضروات الورقية',
   'Lettuce, spinach, kale, and other leaf vegetables', 'Laitue, épinards, chou kale et autres légumes feuilles', 'الخس والسبانخ والكرنب والخضروات الورقية الأخرى',
   NULL, 'crops'),
  ('Solanaceous', 'Solanacées', 'الباذنجانية',
   'Tomatoes, peppers, eggplant, and potatoes', 'Tomates, poivrons, aubergines et pommes de terre', 'الطماطم والفلفل والباذنجان والبطاطس',
   NULL, 'crops'),
  ('Root Vegetables', 'Légumes-racines', 'الخضروات الجذرية',
   'Carrots, radishes, turnips, and beets', 'Carottes, radis, navets et betteraves', 'الجزر والفجل واللفت والبنجر',
   NULL, 'crops'),
  ('Legumes', 'Légumineuses', 'البقوليات',
   'Beans, peas, lentils, and other pulse crops', 'Haricots, pois, lentilles et autres légumineuses', 'الفاصوليا والبازلاء والعدس والمحاصيل البقولية الأخرى',
   NULL, 'crops'),

  -- Industrial Crops
  ('Industrial Crops', 'Cultures industrielles', 'المحاصيل الصناعية',
   'Crops for industrial processing (sugar, oil, fiber)', 'Cultures pour transformation industrielle (sucre, huile, fibre)', 'محاصيل للمعالجة الصناعية (السكر والزيت والألياف)',
   NULL, 'crops'),
  ('Sugar Crops', 'Cultures sucrières', 'المحاصيل السكرية',
   'Sugarcane and sugar beet', 'Canne à sucre et betterave sucrière', 'قصب السكر والبنجر السكري',
   NULL, 'crops'),
  ('Oil Crops', 'Cultures oléagineuses', 'المحاصيل الزيتية',
   'Sunflower, rapeseed, soybean, and olive', 'Tournesol, colza, soja et olive', 'عباد الشمس واللفت وفول الصويا والزيتون',
   NULL, 'crops'),
  ('Fiber Crops', 'Cultures fibreuses', 'المحاصيل الليفية',
   'Cotton, flax, and hemp', 'Coton, lin et chanvre', 'القطن والكتان والقنب',
   NULL, 'crops'),

  -- Forage Crops
  ('Forage Crops', 'Cultures fourragères', 'محاصيل الأعلاف',
   'Crops for animal feed and pasture', 'Cultures pour l alimentation animale et les pâturages', 'محاصيل لأعلاف الحيوانات والمراعي',
   NULL, 'crops'),
  ('Pasture Grass', 'Herbe de pâturage', 'عشب المراعي',
   'Grasses for grazing and hay production', 'Herbes pour le pâturage et la production de foin', 'أعشاب للرعي وإنتاج القش',
   NULL, 'crops'),
  ('Alfalfa', 'Luzerne', 'برسيم',
   'Alfalfa for high-quality hay and silage', 'Luzerne pour le foin et l ensilage de haute qualité', 'البرسيم للقش والعلف عالي الجودة',
   NULL, 'crops')
ON CONFLICT (organization_id, name) DO NOTHING;

-- Create index for module-based filtering
CREATE INDEX IF NOT EXISTS idx_crop_types_module_slug ON crop_types(module_slug) WHERE module_slug IS NOT NULL;

-- Update module_translations to include crop type translations
-- This allows the module to show relevant crop types
CREATE OR REPLACE FUNCTION get_module_crop_types(p_module_slug VARCHAR, p_locale VARCHAR DEFAULT 'en')
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT
) LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.id,
    CASE
      WHEN p_locale = 'fr' AND ct.name_fr IS NOT NULL THEN ct.name_fr
      WHEN p_locale = 'ar' AND ct.name_ar IS NOT NULL THEN ct.name_ar
      ELSE ct.name
    END AS name,
    CASE
      WHEN p_locale = 'fr' AND ct.description_fr IS NOT NULL THEN ct.description_fr
      WHEN p_locale = 'ar' AND ct.description_ar IS NOT NULL THEN ct.description_ar
      ELSE ct.description
    END AS description
  FROM crop_types ct
  WHERE ct.module_slug = p_module_slug
     OR ct.module_slug IS NULL  -- Include general types
  ORDER BY ct.name;
END;
$$;
