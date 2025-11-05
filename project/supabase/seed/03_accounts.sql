-- Seed a minimal Chart of Accounts per organization with multilingual labels
-- Idempotent: skips rows where (organization_id, code) already exists

-- Pre-clean duplicates by keeping the lowest id per (organization_id, code)
WITH d AS (
  SELECT a.id
  FROM public.accounts a
  JOIN public.accounts b
    ON a.organization_id = b.organization_id
   AND a.code = b.code
   AND a.id > b.id
)
DELETE FROM public.accounts a
USING d
WHERE a.id = d.id;

-- 1) Insert ERPNext-style GROUP accounts (hierarchy)
-- Root groups
WITH roots AS (
  SELECT * FROM (
    VALUES
      ('1000', 'Assets', 'Actifs', 'الأصول', 'Asset'),
      ('2000', 'Liabilities', 'Passifs', 'الخصوم', 'Liability'),
      ('3000', "Owner's Equity", 'Capitaux propres', 'حقوق الملكية', 'Equity'),
      ('4000', 'Income', 'Produits', 'الإيرادات', 'Revenue'),
      ('5000', 'Expenses', 'Charges', 'المصاريف', 'Expense')
  ) AS t(code, name_en, name_fr, name_ar, account_type)
)
INSERT INTO public.accounts (
  organization_id,
  code,
  name,
  account_type,
  is_group,
  description
)
SELECT
  o.id,
  r.code,
  r.name_en,
  r.account_type,
  true,
  json_build_object('name_fr', r.name_fr, 'name_ar', r.name_ar)::text
FROM public.organizations o
CROSS JOIN roots r
LEFT JOIN public.accounts a
  ON a.organization_id = o.id AND a.code = r.code
WHERE a.id IS NULL
ON CONFLICT (organization_id, code) DO NOTHING;

-- Common sub-groups
WITH subs AS (
  SELECT * FROM (
    VALUES
      -- Assets
      ('1100', 'Current Assets', 'Actifs courants', 'الأصول المتداولة', 'Asset', '1000'),
      ('1200', 'Non-Current Assets', 'Actifs non courants', 'الأصول غير المتداولة', 'Asset', '1000'),
      -- Liabilities
      ('2100', 'Current Liabilities', 'Passifs courants', 'الخصوم المتداولة', 'Liability', '2000'),
      ('2200', 'Non-Current Liabilities', 'Passifs non courants', 'الخصوم غير المتداولة', 'Liability', '2000'),
      -- Equity
      ('3100', 'Retained Earnings', 'Résultats reportés', 'الأرباح المحتجزة', 'Equity', '3000'),
      -- Income
      ('4100', 'Operating Income', 'Produits d’exploitation', 'إيرادات التشغيل', 'Revenue', '4000'),
      -- Expenses
      ('5100', 'Operating Expenses', 'Charges d’exploitation', 'مصروفات التشغيل', 'Expense', '5000')
  ) AS t(code, name_en, name_fr, name_ar, account_type, parent_code)
)
INSERT INTO public.accounts (
  organization_id,
  code,
  name,
  account_type,
  is_group,
  description,
  parent_id
)
SELECT
  o.id,
  s.code,
  s.name_en,
  s.account_type,
  true,
  json_build_object('name_fr', s.name_fr, 'name_ar', s.name_ar)::text,
  p.id
FROM public.organizations o
CROSS JOIN subs s
JOIN public.accounts p
  ON p.organization_id = o.id AND p.code = s.parent_code
LEFT JOIN public.accounts a
  ON a.organization_id = o.id AND a.code = s.code
WHERE a.id IS NULL
ON CONFLICT (organization_id, code) DO NOTHING;

-- 2) Insert key LEDGER accounts under appropriate groups
WITH seed AS (
  SELECT * FROM (
    VALUES
      -- code, name_en, name_fr, name_ar, account_type, account_subtype
      ('1110', 'Cash', 'Caisse', 'نقد', 'Asset', 'Current Asset'),
      ('1120', 'Bank', 'Banque', 'بنك', 'Asset', 'Current Asset'),
      ('1130', 'Accounts Receivable', 'Clients', 'الذمم المدينة', 'Asset', 'Receivable'),
      ('1140', 'Inventory', 'Stocks', 'المخزون', 'Asset', 'Inventory'),
      ('1210', 'Fixed Assets', 'Immobilisations', 'الأصول الثابتة', 'Asset', 'Fixed Asset'),
      ('2110', 'Accounts Payable', 'Fournisseurs', 'الذمم الدائنة', 'Liability', 'Payable'),
      ('2120', 'Taxes Payable', 'Taxes à payer', 'ضرائب مستحقة', 'Liability', 'Tax'),
      ('3010', "Owner's Equity", 'Capitaux propres', 'حقوق الملكية', 'Equity', 'Equity'),
      ('4110', 'Sales Revenue', 'Ventes', 'إيرادات المبيعات', 'Revenue', 'Sales'),
      ('5110', 'Cost of Goods Sold', 'Coût des ventes', 'تكلفة البضائع المباعة', 'Expense', 'COGS'),
      ('5120', 'Salaries Expense', 'Salaires', 'مصروف الرواتب', 'Expense', 'Payroll'),
      ('5130', 'Utilities Expense', 'Services publics', 'مصروف الخدمات', 'Expense', 'Utilities'),
      ('5140', 'Maintenance Expense', 'Maintenance', 'مصروف الصيانة', 'Expense', 'Maintenance'),
      ('5150', 'Supplies Expense', 'Fournitures', 'مصروف المستلزمات', 'Expense', 'Supplies')
  ) AS t(code, name_en, name_fr, name_ar, account_type, account_subtype)
)
INSERT INTO public.accounts (
  organization_id,
  code,
  name,
  account_type,
  account_subtype,
  description,
  is_group,
  parent_id
)
SELECT
  o.id,
  s.code,
  s.name_en,
  s.account_type,
  s.account_subtype,
  -- store translations in description as JSON for UI fallback
  json_build_object('name_fr', s.name_fr, 'name_ar', s.name_ar)::text,
  false,
  CASE
    WHEN s.code LIKE '11%' THEN (SELECT id FROM public.accounts pa WHERE pa.organization_id = o.id AND pa.code = '1100')
    WHEN s.code LIKE '12%' THEN (SELECT id FROM public.accounts pa WHERE pa.organization_id = o.id AND pa.code = '1200')
    WHEN s.code LIKE '21%' THEN (SELECT id FROM public.accounts pa WHERE pa.organization_id = o.id AND pa.code = '2100')
    WHEN s.code LIKE '30%' THEN (SELECT id FROM public.accounts pa WHERE pa.organization_id = o.id AND pa.code = '3000')
    WHEN s.code LIKE '41%' THEN (SELECT id FROM public.accounts pa WHERE pa.organization_id = o.id AND pa.code = '4100')
    WHEN s.code LIKE '51%' THEN (SELECT id FROM public.accounts pa WHERE pa.organization_id = o.id AND pa.code = '5100')
    ELSE (SELECT id FROM public.accounts pa WHERE pa.organization_id = o.id AND pa.code = '1000')
  END
FROM public.organizations o
CROSS JOIN seed s
LEFT JOIN public.accounts a
  ON a.organization_id = o.id AND a.code = s.code
WHERE a.id IS NULL
ON CONFLICT (organization_id, code) DO NOTHING;


