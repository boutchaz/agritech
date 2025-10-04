-- Seed default tree categories and trees for all organizations
-- This will be inserted for each organization that exists

DO $$
DECLARE
    org_record RECORD;
    category_id uuid;
BEGIN
    -- Loop through all organizations
    FOR org_record IN SELECT id FROM public.organizations LOOP

        -- Insert tree categories and their trees for this organization

        -- Category 1: Arbres fruitiers à noyau
        INSERT INTO public.tree_categories (organization_id, category)
        VALUES (org_record.id, 'Arbres fruitiers à noyau')
        RETURNING id INTO category_id;

        INSERT INTO public.trees (category_id, name) VALUES
            (category_id, 'Olivier'),
            (category_id, 'Pêcher'),
            (category_id, 'Abricotier'),
            (category_id, 'Prunier'),
            (category_id, 'Cerisier'),
            (category_id, 'Amandier'),
            (category_id, 'Nectarine'),
            (category_id, 'Arganier');

        -- Category 2: Arbres fruitiers à pépins
        INSERT INTO public.tree_categories (organization_id, category)
        VALUES (org_record.id, 'Arbres fruitiers à pépins')
        RETURNING id INTO category_id;

        INSERT INTO public.trees (category_id, name) VALUES
            (category_id, 'Pommier'),
            (category_id, 'Poirier'),
            (category_id, 'Cognassier'),
            (category_id, 'Nashi');

        -- Category 3: Agrumes
        INSERT INTO public.tree_categories (organization_id, category)
        VALUES (org_record.id, 'Agrumes')
        RETURNING id INTO category_id;

        INSERT INTO public.trees (category_id, name) VALUES
            (category_id, 'Oranger'),
            (category_id, 'Mandariner'),
            (category_id, 'Citronnier'),
            (category_id, 'Pamplemoussier'),
            (category_id, 'Pomelo'),
            (category_id, 'Combava'),
            (category_id, 'Cédratier');

        -- Category 4: Arbres tropicaux et subtropicaus
        INSERT INTO public.tree_categories (organization_id, category)
        VALUES (org_record.id, 'Arbres tropicaux et subtropicaus')
        RETURNING id INTO category_id;

        INSERT INTO public.trees (category_id, name) VALUES
            (category_id, 'Avocatier'),
            (category_id, 'Manguier'),
            (category_id, 'Litchi'),
            (category_id, 'Longanier'),
            (category_id, 'Ramboutan'),
            (category_id, 'Garambolier'),
            (category_id, 'Goyavier'),
            (category_id, 'Coroddolier'),
            (category_id, 'Cherimolier'),
            (category_id, 'Sapotillier'),
            (category_id, 'Jacquier'),
            (category_id, 'Durian'),
            (category_id, 'Papayer'),
            (category_id, 'Bananiers');

        -- Category 5: Arbres à fruits secs
        INSERT INTO public.tree_categories (organization_id, category)
        VALUES (org_record.id, 'Arbres à fruits secs')
        RETURNING id INTO category_id;

        INSERT INTO public.trees (category_id, name) VALUES
            (category_id, 'Noyer'),
            (category_id, 'Châtagnier'),
            (category_id, 'Noisetier'),
            (category_id, 'Pistachier'),
            (category_id, 'Macadamia'),
            (category_id, 'Cacaoyer'),
            (category_id, 'Caféier');

        -- Category 6: Vigne et assimilés
        INSERT INTO public.tree_categories (organization_id, category)
        VALUES (org_record.id, 'Vigne et assimilés')
        RETURNING id INTO category_id;

        INSERT INTO public.trees (category_id, name) VALUES
            (category_id, 'Vigne'),
            (category_id, 'Kiwier'),
            (category_id, 'Grenadier'),
            (category_id, 'Figuier'),
            (category_id, 'Murier');

        -- Category 7: Palamcées fruitières
        INSERT INTO public.tree_categories (organization_id, category)
        VALUES (org_record.id, 'Palamcées fruitières')
        RETURNING id INTO category_id;

        INSERT INTO public.trees (category_id, name) VALUES
            (category_id, 'Palmier dattier'),
            (category_id, 'Cocotier'),
            (category_id, 'Plamier à huile'),
            (category_id, 'Açai');

        -- Insert plantation types
        INSERT INTO public.plantation_types (organization_id, type, spacing, trees_per_ha) VALUES
            (org_record.id, 'Super intensif', '4x1,5', 1666),
            (org_record.id, 'Super intensif', '3x1,5', 2222),
            (org_record.id, 'Intensif', '4x2', 1250),
            (org_record.id, 'Intensif', '3x2', 1666),
            (org_record.id, 'Semi-intensif', '6x3', 555),
            (org_record.id, 'Traditionnel amélioré', '6x6', 277),
            (org_record.id, 'Traditionnel', '8x8', 156),
            (org_record.id, 'Traditionnel', '8x7', 179),
            (org_record.id, 'Traditionnel très espacé', '10x10', 100);

    END LOOP;
END $$;

-- Create a trigger function to auto-seed tree data for new organizations
CREATE OR REPLACE FUNCTION seed_tree_data_for_new_organization()
RETURNS TRIGGER AS $$
DECLARE
    category_id uuid;
BEGIN
    -- Category 1: Arbres fruitiers à noyau
    INSERT INTO public.tree_categories (organization_id, category)
    VALUES (NEW.id, 'Arbres fruitiers à noyau')
    RETURNING id INTO category_id;

    INSERT INTO public.trees (category_id, name) VALUES
        (category_id, 'Olivier'),
        (category_id, 'Pêcher'),
        (category_id, 'Abricotier'),
        (category_id, 'Prunier'),
        (category_id, 'Cerisier'),
        (category_id, 'Amandier'),
        (category_id, 'Nectarine'),
        (category_id, 'Arganier');

    -- Category 2: Arbres fruitiers à pépins
    INSERT INTO public.tree_categories (organization_id, category)
    VALUES (NEW.id, 'Arbres fruitiers à pépins')
    RETURNING id INTO category_id;

    INSERT INTO public.trees (category_id, name) VALUES
        (category_id, 'Pommier'),
        (category_id, 'Poirier'),
        (category_id, 'Cognassier'),
        (category_id, 'Nashi');

    -- Category 3: Agrumes
    INSERT INTO public.tree_categories (organization_id, category)
    VALUES (NEW.id, 'Agrumes')
    RETURNING id INTO category_id;

    INSERT INTO public.trees (category_id, name) VALUES
        (category_id, 'Oranger'),
        (category_id, 'Mandariner'),
        (category_id, 'Citronnier'),
        (category_id, 'Pamplemoussier'),
        (category_id, 'Pomelo'),
        (category_id, 'Combava'),
        (category_id, 'Cédratier');

    -- Category 4: Arbres tropicaux et subtropicaus
    INSERT INTO public.tree_categories (organization_id, category)
    VALUES (NEW.id, 'Arbres tropicaux et subtropicaus')
    RETURNING id INTO category_id;

    INSERT INTO public.trees (category_id, name) VALUES
        (category_id, 'Avocatier'),
        (category_id, 'Manguier'),
        (category_id, 'Litchi'),
        (category_id, 'Longanier'),
        (category_id, 'Ramboutan'),
        (category_id, 'Garambolier'),
        (category_id, 'Goyavier'),
        (category_id, 'Coroddolier'),
        (category_id, 'Cherimolier'),
        (category_id, 'Sapotillier'),
        (category_id, 'Jacquier'),
        (category_id, 'Durian'),
        (category_id, 'Papayer'),
        (category_id, 'Bananiers');

    -- Category 5: Arbres à fruits secs
    INSERT INTO public.tree_categories (organization_id, category)
    VALUES (NEW.id, 'Arbres à fruits secs')
    RETURNING id INTO category_id;

    INSERT INTO public.trees (category_id, name) VALUES
        (category_id, 'Noyer'),
        (category_id, 'Châtagnier'),
        (category_id, 'Noisetier'),
        (category_id, 'Pistachier'),
        (category_id, 'Macadamia'),
        (category_id, 'Cacaoyer'),
        (category_id, 'Caféier');

    -- Category 6: Vigne et assimilés
    INSERT INTO public.tree_categories (organization_id, category)
    VALUES (NEW.id, 'Vigne et assimilés')
    RETURNING id INTO category_id;

    INSERT INTO public.trees (category_id, name) VALUES
        (category_id, 'Vigne'),
        (category_id, 'Kiwier'),
        (category_id, 'Grenadier'),
        (category_id, 'Figuier'),
        (category_id, 'Murier');

    -- Category 7: Palamcées fruitières
    INSERT INTO public.tree_categories (organization_id, category)
    VALUES (NEW.id, 'Palamcées fruitières')
    RETURNING id INTO category_id;

    INSERT INTO public.trees (category_id, name) VALUES
        (category_id, 'Palmier dattier'),
        (category_id, 'Cocotier'),
        (category_id, 'Plamier à huile'),
        (category_id, 'Açai');

    -- Insert plantation types
    INSERT INTO public.plantation_types (organization_id, type, spacing, trees_per_ha) VALUES
        (NEW.id, 'Super intensif', '4x1,5', 1666),
        (NEW.id, 'Super intensif', '3x1,5', 2222),
        (NEW.id, 'Intensif', '4x2', 1250),
        (NEW.id, 'Intensif', '3x2', 1666),
        (NEW.id, 'Semi-intensif', '6x3', 555),
        (NEW.id, 'Traditionnel amélioré', '6x6', 277),
        (NEW.id, 'Traditionnel', '8x8', 156),
        (NEW.id, 'Traditionnel', '8x7', 179),
        (NEW.id, 'Traditionnel très espacé', '10x10', 100);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-seed data for new organizations
CREATE TRIGGER trigger_seed_tree_data_for_new_organization
    AFTER INSERT ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION seed_tree_data_for_new_organization();
