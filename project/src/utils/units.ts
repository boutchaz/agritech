const UNIT_LABELS: Record<string, Record<string, string>> = {
  LITER:  { fr: 'litre',     en: 'liter',    ar: 'لتر'   },
  KG:     { fr: 'kg',        en: 'kg',        ar: 'كغ'    },
  G:      { fr: 'g',         en: 'g',         ar: 'غ'     },
  TON:    { fr: 'tonne',     en: 'ton',       ar: 'طن'    },
  UNIT:   { fr: 'unité',     en: 'unit',      ar: 'وحدة'  },
  BOX:    { fr: 'boîte',     en: 'box',       ar: 'صندوق' },
  BAG:    { fr: 'sac',       en: 'bag',       ar: 'كيس'   },
  BOTTLE: { fr: 'bouteille', en: 'bottle',    ar: 'زجاجة' },
};

export function localizeUnit(unit: string | undefined | null, lang: string): string {
  if (!unit) return '';
  const key = unit.toUpperCase();
  return UNIT_LABELS[key]?.[lang.slice(0, 2)] ?? unit.toLowerCase();
}

export function formatQuantity(
  qty: number | null | undefined,
  unit: string | undefined | null,
  lang: string,
): string {
  const n = Number(qty ?? 0);
  const trimmed = Number.isInteger(n) ? n.toString() : parseFloat(n.toFixed(3)).toString();
  const label = localizeUnit(unit, lang);
  return label ? `${trimmed} ${label}` : trimmed;
}
