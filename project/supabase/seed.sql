-- =====================================================
-- SEED DATA
-- =====================================================
-- Loaded automatically after `supabase db reset`
-- Order matters: roles → work_units → accounts
-- =====================================================

-- \i directives are not supported by supabase db reset.
-- Run manually with psql if needed:
--   \i seed/01_roles.sql
--   \i seed/02_work_units.sql
--   \i seed/03_accounts.sql

-- =====================================================
-- crop_ai_references seed
-- =====================================================
-- Source: agritech-api/referentials/DATA_*.json
-- Note: crop_types.code values must exist before these run (created in schema.sql).
--
-- Seed runs:
--   dev:  automatically via 'npm run db:reset'
--   prod: manually via 'npm run db:seed:remote' after 'npm run db:push'

-- Seed crop_ai_references from repo referentials (DATA_*.json). Idempotent: upserts on crop_type.
-- Regenerate: node project/scripts/generate-crop-ai-references-sql.mjs

INSERT INTO public.crop_ai_references (crop_type, version, reference_data)
VALUES (
  'agrumes',
  '1.0',
  $crop_ai_ref_agrumes${
  "metadata": {
    "version": "1.0",
    "date": "2026-02",
    "culture": "agrumes",
    "famille": "Rutaceae",
    "genre": "Citrus",
    "pays": "Maroc"
  },
  "phenological_stages": [
    {
      "key": "winter_rest",
      "name_fr": "Repos hivernal",
      "name_en": "Winter rest",
      "name_ar": "الراحة الشتوية",
      "months": [12, 1, 2],
      "thresholds": [
        { "key": "frost_risk", "label_fr": "Risque de gel", "label_en": "Frost risk", "compare": "below", "value": 0, "unit": "h", "icon": "snowflake" },
        { "key": "cold_stress", "label_fr": "Stress froid", "label_en": "Cold stress", "compare": "below", "value": 7, "unit": "h", "icon": "snowflake" }
      ]
    },
    {
      "key": "flowering",
      "name_fr": "Floraison",
      "name_en": "Flowering",
      "name_ar": "الإزهار",
      "months": [3, 4, 5],
      "thresholds": [
        { "key": "optimal_flowering", "label_fr": "Conditions optimales", "label_en": "Optimal conditions", "compare": "between", "value": 18, "upper": 28, "unit": "h", "icon": "leaf" },
        { "key": "heat_stress", "label_fr": "Stress thermique", "label_en": "Heat stress", "compare": "above", "value": 35, "unit": "h", "icon": "flame" }
      ]
    },
    {
      "key": "fruit_growth",
      "name_fr": "Grossissement des fruits",
      "name_en": "Fruit growth",
      "name_ar": "نمو الثمار",
      "months": [6, 7, 8, 9],
      "thresholds": [
        { "key": "growing_hours", "label_fr": "Heures de croissance", "label_en": "Growing hours", "compare": "above", "value": 13, "unit": "h", "icon": "sun" },
        { "key": "extreme_heat", "label_fr": "Chaleur extrême", "label_en": "Extreme heat", "compare": "above", "value": 38, "unit": "h", "icon": "flame" }
      ]
    }
  ],
  "phases_maturite_ans": {
    "juvenile": [
      0,
      5
    ],
    "entree_production": [
      5,
      10
    ],
    "pleine_production": [
      10,
      40
    ],
    "maturite_avancee": [
      40,
      60
    ],
    "senescence": [
      60,
      200
    ]
  },
  "gdd": {
    "tbase_c": 13.0,
    "plafond_c": 36.0,
    "reference": "Calibration engine — citrus growing degree days (caps)"
  },
  "seuils_meteo": {
    "gel": {
      "threshold_c": 0.0,
      "detection_months": [
        3,
        4,
        5
      ],
      "severity": "high"
    },
    "canicule": {
      "tmax_c": 40.0,
      "consecutive_days": 3,
      "severity": "high"
    },
    "vent_chaud": {
      "temperature_c": 38.0,
      "wind_kmh": 30.0,
      "humidity_max_pct": 25.0,
      "severity": "medium"
    },
    "secheresse": {
      "rain_mm_max_per_day": 5.0,
      "dry_season_days": 60,
      "transition_days": 30,
      "rainy_season_days": 20,
      "severity": "medium"
    }
  },
  "capacites_calibrage": {
    "supported": true,
    "phenology_mode": "state_machine",
    "subtypes": {
      "traditionnel": {
        "required_indices": [
          "NDVI",
          "NIRv",
          "NDMI",
          "NDRE",
          "EVI",
          "MSAVI",
          "MSI",
          "GCI"
        ]
      },
      "intensif": {
        "required_indices": [
          "NDVI",
          "NIRv",
          "NDMI",
          "NDRE",
          "EVI",
          "MSAVI",
          "MSI",
          "GCI"
        ]
      },
      "super_intensif": {
        "required_indices": [
          "NDVI",
          "NIRv",
          "NDMI",
          "NDRE",
          "EVI",
          "MSAVI",
          "MSI",
          "GCI"
        ]
      }
    },
    "min_observed_images": 10,
    "min_history_days": 120,
    "min_history_months_for_period_percentiles": 24,
    "required_indices": [
      "NDVI",
      "NIRv",
      "NDMI",
      "NDRE",
      "EVI",
      "MSAVI",
      "MSI",
      "GCI"
    ]
  },
  "especes": {
    "orange": {
      "nom_scientifique": "Citrus sinensis",
      "part_production_maroc": "60%",
      "types": [
        "Navel",
        "Blonde",
        "Sanguine"
      ]
    },
    "petits_agrumes": {
      "nom_scientifique": "Citrus reticulata",
      "part_production_maroc": "25%",
      "types": [
        "Clémentine",
        "Mandarine",
        "Tangor"
      ]
    },
    "citron": {
      "nom_scientifique": "Citrus limon",
      "part_production_maroc": "8%",
      "types": [
        "Eureka",
        "Lisbon",
        "Verna"
      ]
    },
    "pomelo": {
      "nom_scientifique": "Citrus paradisi",
      "part_production_maroc": "3%",
      "types": [
        "Star Ruby",
        "Marsh"
      ]
    }
  },
  "varietes": {
    "oranges": [
      {
        "code": "NAVELINE",
        "nom": "Naveline",
        "type": "Navel",
        "maturite": [
          "nov",
          "dec",
          "jan"
        ],
        "calibre": "gros",
        "qualite": "excellente",
        "export": true
      },
      {
        "code": "WASH_NAVEL",
        "nom": "Washington Navel",
        "type": "Navel",
        "maturite": [
          "dec",
          "jan",
          "Fev"
        ],
        "calibre": "tres_gros",
        "qualite": "excellente"
      },
      {
        "code": "NAVELATE",
        "nom": "Navelate",
        "type": "Navel",
        "maturite": [
          "jan",
          "Fev",
          "mar"
        ],
        "calibre": "gros",
        "qualite": "tres_bonne",
        "tardive": true
      },
      {
        "code": "SALUSTIANA",
        "nom": "Salustiana",
        "type": "Blonde",
        "maturite": [
          "dec",
          "jan",
          "Fev",
          "mar"
        ],
        "usage": "jus",
        "qualite": "tres_bonne"
      },
      {
        "code": "VALENCIA",
        "nom": "Valencia Late",
        "type": "Blonde",
        "maturite": [
          "Avr",
          "Mai",
          "Juin"
        ],
        "qualite": "excellente",
        "tres_tardive": true
      },
      {
        "code": "MAROC_LATE",
        "nom": "Maroc Late",
        "type": "Blonde",
        "maturite": [
          "mar",
          "Avr",
          "Mai",
          "Juin"
        ],
        "qualite": "excellente",
        "specialite_maroc": true
      },
      {
        "code": "SANGUINELLI",
        "nom": "Sanguinelli",
        "type": "Sanguine",
        "maturite": [
          "jan",
          "Fev",
          "mar"
        ],
        "niche": true
      }
    ],
    "petits_agrumes": [
      {
        "code": "CLEM_COMMUNE",
        "nom": "Clémentine Commune",
        "type": "Clementine",
        "maturite": [
          "oct",
          "nov",
          "dec"
        ],
        "pepins": [
          0,
          2
        ],
        "conservation": "moyenne"
      },
      {
        "code": "NULES",
        "nom": "Nules",
        "type": "Clementine",
        "maturite": [
          "nov",
          "dec"
        ],
        "pepins": [
          0,
          1
        ],
        "conservation": "bonne",
        "export": true
      },
      {
        "code": "MARISOL",
        "nom": "Marisol",
        "type": "Clementine",
        "maturite": [
          "Sept",
          "oct"
        ],
        "tres_precoce": true,
        "conservation": "faible"
      },
      {
        "code": "NOUR",
        "nom": "Nour",
        "type": "Clementine",
        "maturite": [
          "jan",
          "Fev",
          "mar"
        ],
        "tardive": true,
        "origine": "Maroc"
      },
      {
        "code": "NADORCOTT",
        "nom": "Nadorcott/Afourer",
        "type": "Mandarine",
        "maturite": [
          "jan",
          "Fev",
          "mar",
          "Avr"
        ],
        "premium": true,
        "conservation": "excellente"
      },
      {
        "code": "ORTANIQUE",
        "nom": "Ortanique",
        "type": "Tangor",
        "maturite": [
          "Fev",
          "mar",
          "Avr"
        ],
        "pepins": [
          5,
          15
        ],
        "hybride": "Orange x Tangerine"
      },
      {
        "code": "NOVA",
        "nom": "Nova",
        "type": "Mandarine",
        "maturite": [
          "nov",
          "dec",
          "jan"
        ],
        "arome": "intense"
      }
    ],
    "citrons": [
      {
        "code": "EUREKA",
        "nom": "Eureka",
        "maturite": "toute_annee",
        "acidite": "elevee",
        "standard": true
      },
      {
        "code": "LISBON",
        "nom": "Lisbon",
        "maturite": [
          "nov",
          "dec",
          "jan",
          "Fev",
          "mar",
          "Avr",
          "Mai"
        ],
        "acidite": "elevee",
        "rustique": true
      },
      {
        "code": "VERNA",
        "nom": "Verna",
        "maturite": [
          "Fev",
          "mar",
          "Avr",
          "Mai",
          "Juin",
          "Juil"
        ],
        "acidite": "moyenne",
        "peu_pepins": true
      },
      {
        "code": "MEYER",
        "nom": "Meyer",
        "maturite": [
          "nov",
          "dec",
          "jan",
          "Fev",
          "mar"
        ],
        "acidite": "faible",
        "hybride": true
      }
    ],
    "pomelos": [
      {
        "code": "STAR_RUBY",
        "nom": "Star Ruby",
        "chair": "rouge",
        "maturite": [
          "nov",
          "dec",
          "jan",
          "Fev",
          "mar"
        ],
        "gout": "peu_amer",
        "principal": true
      },
      {
        "code": "RIO_RED",
        "nom": "Rio Red",
        "chair": "rouge",
        "maturite": [
          "nov",
          "dec",
          "jan",
          "Fev",
          "mar",
          "Avr"
        ],
        "gout": "peu_amer"
      },
      {
        "code": "MARSH",
        "nom": "Marsh",
        "chair": "blonde",
        "maturite": [
          "nov",
          "dec",
          "jan",
          "Fev",
          "mar",
          "Avr"
        ],
        "gout": "legerement_amer"
      }
    ]
  },
  "porte_greffes": [
    {
      "code": "BIGARADIER",
      "nom": "Bigaradier",
      "vigueur": "forte",
      "calcaire": "excellente",
      "salinite": "bonne",
      "phytophthora": "sensible",
      "tristeza": "TRES_SENSIBLE",
      "qualite_fruit": "excellente",
      "exclusion_Cl": "bonne",
      "note": "RISQUE Tristeza - éviter nouvelles plantations"
    },
    {
      "code": "CARRIZO",
      "nom": "Citrange Carrizo",
      "vigueur": "moyenne_forte",
      "calcaire": "moyenne",
      "salinite": "faible",
      "phytophthora": "tolerante",
      "tristeza": "tolerante",
      "qualite_fruit": "bonne",
      "exclusion_Cl": "faible",
      "recommande_si_tristeza": true
    },
    {
      "code": "VOLKAMERIANA",
      "nom": "Volkameriana",
      "vigueur": "tres_forte",
      "calcaire": "bonne",
      "salinite": "bonne",
      "phytophthora": "moyenne",
      "tristeza": "tolerante",
      "qualite_fruit": "moyenne",
      "exclusion_Cl": "bonne",
      "recommande_si_salin": true
    },
    {
      "code": "MACROPHYLLA",
      "nom": "Macrophylla",
      "vigueur": "tres_forte",
      "calcaire": "bonne",
      "salinite": "bonne",
      "phytophthora": "moyenne",
      "tristeza": "tolerante",
      "qualite_fruit": "faible",
      "exclusion_Cl": "bonne"
    },
    {
      "code": "CLEOPATRE",
      "nom": "Mandarinier Cléopâtre",
      "vigueur": "moyenne",
      "calcaire": "excellente",
      "salinite": "bonne",
      "phytophthora": "sensible",
      "tristeza": "tolerante",
      "qualite_fruit": "excellente",
      "exclusion_Cl": "bonne"
    },
    {
      "code": "PONCIRUS",
      "nom": "Poncirus trifoliata",
      "vigueur": "nanisante",
      "calcaire": "tres_faible",
      "salinite": "faible",
      "phytophthora": "tres_tolerante",
      "tristeza": "tolerante",
      "qualite_fruit": "excellente",
      "note": "Éviter sol calcaire"
    }
  ],
  "guide_choix_pg": {
    "sol_calcaire_pH>7.5": {
      "recommande": [
        "Bigaradier",
        "Mandarinier Cléopâtre"
      ],
      "eviter": [
        "Poncirus",
        "Citrange"
      ]
    },
    "sol_salin_CE>2": {
      "recommande": [
        "Volkameriana",
        "Macrophylla",
        "Bigaradier"
      ],
      "eviter": [
        "Citrange Carrizo"
      ]
    },
    "sol_lourd_mal_draine": {
      "recommande": [
        "Citrange Carrizo",
        "Poncirus"
      ],
      "eviter": [
        "Bigaradier",
        "Volkameriana"
      ]
    },
    "presence_tristeza": {
      "recommande": [
        "Citrange",
        "Volkameriana",
        "Citrumelo"
      ],
      "interdit": [
        "Bigaradier"
      ]
    }
  },
  "exigences_climatiques": {
    "orange": {
      "T_optimale": [
        22,
        28
      ],
      "T_min_croissance": 13,
      "gel_feuilles": [
        -3,
        -5
      ],
      "gel_fruits": [
        -2,
        -3
      ],
      "gel_mortel": [
        -8,
        -10
      ],
      "heures_froid": [
        200,
        400
      ]
    },
    "clementine": {
      "T_optimale": [
        20,
        26
      ],
      "T_min_croissance": 13,
      "gel_feuilles": [
        -3,
        -5
      ],
      "gel_fruits": -2,
      "gel_mortel": -8,
      "heures_froid": [
        100,
        200
      ]
    },
    "citron": {
      "T_optimale": [
        20,
        30
      ],
      "T_min_croissance": 15,
      "gel_feuilles": [
        -2,
        -3
      ],
      "gel_fruits": [
        -1,
        -2
      ],
      "gel_mortel": [
        -5,
        -6
      ],
      "heures_froid": 0
    },
    "pomelo": {
      "T_optimale": [
        23,
        30
      ],
      "T_min_croissance": 15,
      "gel_feuilles": -2,
      "gel_fruits": -1,
      "gel_mortel": -4,
      "heures_froid": 0
    }
  },
  "exigences_sol": {
    "pH_optimal": [
      6.0,
      7.0
    ],
    "pH_tolerance": [
      5.5,
      8.0
    ],
    "calcaire_actif_max_pct": 8,
    "CE_sol_optimal_dS_m": 1.5,
    "CE_sol_max_dS_m": 3.0,
    "texture": "sablo_limoneux",
    "drainage": "bon_a_excellent",
    "profondeur_utile_min_cm": 60,
    "nappe_phreatique_min_cm": 100
  },
  "systemes": {
    "traditionnel": {
      "densite_arbres_ha": [
        200,
        300
      ],
      "ecartement_m": "7×5 à 8×6",
      "irrigation": "gravitaire",
      "entree_production_annee": [
        5,
        6
      ],
      "pleine_production_annee": [
        10,
        12
      ],
      "duree_vie_ans": [
        40,
        50
      ],
      "indice_cle": "NIRv",
      "rendement_pleine_prod_t_ha": [
        20,
        35
      ]
    },
    "intensif": {
      "densite_arbres_ha": [
        400,
        600
      ],
      "ecartement_m": "5×3 à 6×4",
      "irrigation": "goutte_a_goutte",
      "entree_production_annee": [
        3,
        4
      ],
      "pleine_production_annee": [
        6,
        8
      ],
      "duree_vie_ans": [
        25,
        35
      ],
      "indice_cle": "NIRv",
      "rendement_pleine_prod_t_ha": [
        40,
        60
      ]
    },
    "super_intensif": {
      "densite_arbres_ha": [
        800,
        1200
      ],
      "ecartement_m": "4×2 à 5×2.5",
      "irrigation": "gag_haute_frequence",
      "entree_production_annee": [
        2,
        3
      ],
      "pleine_production_annee": [
        5,
        6
      ],
      "duree_vie_ans": [
        15,
        20
      ],
      "indice_cle": "NIRv",
      "rendement_pleine_prod_t_ha": [
        50,
        80
      ]
    }
  },
  "seuils_satellite": {
    "traditionnel": {
      "NDVI": {
        "optimal": [
          0.5,
          0.7
        ],
        "vigilance": 0.45,
        "alerte": 0.4
      },
      "NIRv": {
        "optimal": [
          0.12,
          0.28
        ],
        "vigilance": 0.1,
        "alerte": 0.08
      },
      "NDMI": {
        "optimal": [
          0.18,
          0.38
        ],
        "vigilance": 0.14,
        "alerte": 0.1
      }
    },
    "intensif": {
      "NDVI": {
        "optimal": [
          0.6,
          0.78
        ],
        "vigilance": 0.55,
        "alerte": 0.5
      },
      "NIRv": {
        "optimal": [
          0.18,
          0.35
        ],
        "vigilance": 0.15,
        "alerte": 0.12
      },
      "NDMI": {
        "optimal": [
          0.22,
          0.42
        ],
        "vigilance": 0.18,
        "alerte": 0.14
      }
    },
    "super_intensif": {
      "NDVI": {
        "optimal": [
          0.68,
          0.85
        ],
        "vigilance": 0.63,
        "alerte": 0.58
      },
      "NIRv": {
        "optimal": [
          0.22,
          0.42
        ],
        "vigilance": 0.2,
        "alerte": 0.17
      },
      "NDMI": {
        "optimal": [
          0.28,
          0.48
        ],
        "vigilance": 0.24,
        "alerte": 0.2
      }
    }
  },
  "varietes_calibrage": [
    {
      "code": "ORANGE_NAVEL",
      "nom": "Orange Navel",
      "aliases": [
        "NAVELINE",
        "Naveline",
        "WASH_NAVEL",
        "Washington Navel",
        "NAVELATE",
        "Navelate",
        "SALUSTIANA",
        "Salustiana",
        "SANGUINELLI",
        "Sanguinelli"
      ],
      "yield_unit": "t/ha",
      "yield_curve_key": "orange_navel"
    },
    {
      "code": "ORANGE_VALENCIA",
      "nom": "Orange Valencia",
      "aliases": [
        "VALENCIA",
        "Valencia",
        "Valencia Late",
        "MAROC_LATE",
        "Maroc Late"
      ],
      "yield_unit": "t/ha",
      "yield_curve_key": "orange_valencia"
    },
    {
      "code": "CLEMENTINE",
      "nom": "Clémentine / Mandarine",
      "aliases": [
        "CLEM_COMMUNE",
        "Clémentine Commune",
        "NULES",
        "Nules",
        "MARISOL",
        "Marisol",
        "NOUR",
        "Nour",
        "NADORCOTT",
        "Nadorcott",
        "Nadorcott/Afourer",
        "Afourer",
        "ORTANIQUE",
        "Ortanique",
        "NOVA",
        "Nova"
      ],
      "yield_unit": "t/ha",
      "yield_curve_key": "clementine"
    },
    {
      "code": "CITRON",
      "nom": "Citron",
      "aliases": [
        "EUREKA",
        "Eureka",
        "LISBON",
        "Lisbon",
        "VERNA",
        "Verna",
        "MEYER",
        "Meyer"
      ],
      "yield_unit": "t/ha",
      "yield_curve_key": "citron"
    },
    {
      "code": "POMELO",
      "nom": "Pomelo",
      "aliases": [
        "STAR_RUBY",
        "Star Ruby",
        "MARSH",
        "Marsh"
      ],
      "yield_unit": "t/ha",
      "yield_curve_key": "pomelo"
    }
  ],
  "rendement_t_ha": {
    "orange_navel": {
      "juvenile": [
        5,
        15
      ],
      "entree_production": [
        20,
        35
      ],
      "pleine_production": [
        35,
        50
      ],
      "maturite_avancee": [
        45,
        60
      ],
      "senescence": [
        40,
        55
      ]
    },
    "orange_valencia": {
      "juvenile": [
        5,
        15
      ],
      "entree_production": [
        25,
        40
      ],
      "pleine_production": [
        40,
        60
      ],
      "maturite_avancee": [
        55,
        80
      ],
      "senescence": [
        50,
        70
      ]
    },
    "clementine": {
      "juvenile": [
        5,
        12
      ],
      "entree_production": [
        18,
        30
      ],
      "pleine_production": [
        30,
        45
      ],
      "maturite_avancee": [
        40,
        55
      ],
      "senescence": [
        35,
        50
      ]
    },
    "citron": {
      "juvenile": [
        5,
        10
      ],
      "entree_production": [
        15,
        30
      ],
      "pleine_production": [
        30,
        50
      ],
      "maturite_avancee": [
        45,
        70
      ],
      "senescence": [
        40,
        60
      ]
    },
    "pomelo": {
      "juvenile": [
        5,
        12
      ],
      "entree_production": [
        20,
        35
      ],
      "pleine_production": [
        40,
        60
      ],
      "maturite_avancee": [
        55,
        80
      ],
      "senescence": [
        50,
        70
      ]
    }
  },
  "stades_phenologiques": [
    {
      "nom": "Repos hivernal",
      "mois": [
        "dec",
        "jan"
      ],
      "coef_nirvp": 0.7
    },
    {
      "nom": "Flush printemps",
      "mois": [
        "Fev",
        "mar"
      ],
      "coef_nirvp": 1.0
    },
    {
      "nom": "Floraison",
      "mois": [
        "mar",
        "Avr"
      ],
      "coef_nirvp": 0.95
    },
    {
      "nom": "Nouaison",
      "mois": [
        "Avr",
        "Mai"
      ],
      "coef_nirvp": 0.9
    },
    {
      "nom": "Chute juin",
      "mois": [
        "Mai",
        "Juin"
      ],
      "coef_nirvp": 0.85
    },
    {
      "nom": "Grossissement I",
      "mois": [
        "Juin",
        "Juil"
      ],
      "coef_nirvp": 0.95
    },
    {
      "nom": "Flush été",
      "mois": [
        "Juil",
        "Aout"
      ],
      "coef_nirvp": 1.0
    },
    {
      "nom": "Grossissement II",
      "mois": [
        "Aout",
        "Sept"
      ],
      "coef_nirvp": 0.95
    },
    {
      "nom": "Véraison",
      "mois": [
        "Sept",
        "oct"
      ],
      "coef_nirvp": 0.9
    },
    {
      "nom": "Maturation",
      "mois": [
        "oct",
        "nov",
        "dec"
      ],
      "coef_nirvp": 0.85
    },
    {
      "nom": "Flush automne",
      "mois": [
        "oct",
        "nov"
      ],
      "coef_nirvp": 0.9
    }
  ],
  "options_nutrition": {
    "A": {
      "nom": "Nutrition équilibrée",
      "condition": "analyse_sol < 2 ans ET analyse_eau"
    },
    "B": {
      "nom": "Nutrition foliaire prioritaire",
      "condition": "PAS analyse_sol OU > 3 ans"
    },
    "C": {
      "nom": "Gestion salinité",
      "condition": "CE_eau > 1.5 dS/m OU CE_sol > 2 dS/m"
    }
  },
  "export_kg_tonne": {
    "orange": {
      "N": [
        1.8,
        2.2
      ],
      "P2O5": [
        0.4,
        0.6
      ],
      "K2O": [
        2.5,
        3.5
      ],
      "CaO": [
        0.8,
        1.2
      ],
      "MgO": [
        0.3,
        0.5
      ]
    },
    "clementine": {
      "N": [
        1.5,
        2.0
      ],
      "P2O5": [
        0.3,
        0.5
      ],
      "K2O": [
        2.0,
        3.0
      ],
      "CaO": [
        0.6,
        1.0
      ],
      "MgO": [
        0.2,
        0.4
      ]
    },
    "citron": {
      "N": [
        2.0,
        2.5
      ],
      "P2O5": [
        0.4,
        0.6
      ],
      "K2O": [
        3.0,
        4.0
      ],
      "CaO": [
        0.8,
        1.2
      ],
      "MgO": [
        0.3,
        0.5
      ]
    },
    "pomelo": {
      "N": [
        1.5,
        2.0
      ],
      "P2O5": [
        0.3,
        0.5
      ],
      "K2O": [
        2.5,
        3.5
      ],
      "CaO": [
        0.6,
        1.0
      ],
      "MgO": [
        0.2,
        0.4
      ]
    }
  },
  "entretien_kg_ha": {
    "jeune_1-3_ans": {
      "N": [
        40,
        80
      ],
      "P2O5": [
        20,
        40
      ],
      "K2O": [
        30,
        60
      ]
    },
    "entree_prod_4-6_ans": {
      "N": [
        100,
        150
      ],
      "P2O5": [
        40,
        60
      ],
      "K2O": [
        80,
        120
      ]
    },
    "intensif_pleine_prod": {
      "N": [
        180,
        280
      ],
      "P2O5": [
        60,
        100
      ],
      "K2O": [
        150,
        250
      ]
    },
    "super_intensif": {
      "N": [
        250,
        400
      ],
      "P2O5": [
        80,
        120
      ],
      "K2O": [
        200,
        350
      ]
    }
  },
  "fractionnement_pct": {
    "fev": {
      "N": 15,
      "P2O5": 40,
      "K2O": 10,
      "objectif": "Pré-floraison"
    },
    "mar_avr": {
      "N": 25,
      "P2O5": 30,
      "K2O": 15,
      "objectif": "Floraison-nouaison"
    },
    "mai_juin": {
      "N": 20,
      "P2O5": 15,
      "K2O": 20,
      "objectif": "Grossissement I"
    },
    "juil_aout": {
      "N": 20,
      "P2O5": 10,
      "K2O": 25,
      "objectif": "Grossissement II"
    },
    "sept_oct": {
      "N": 10,
      "P2O5": 5,
      "K2O": 20,
      "objectif": "Maturation"
    },
    "nov": {
      "N": 10,
      "P2O5": 0,
      "K2O": 10,
      "objectif": "Post-récolte"
    }
  },
  "ajustement_espece": {
    "orange_navel": {
      "N": 1.0,
      "K": 1.0,
      "note": "Éviter excès N (éclatement)"
    },
    "orange_valencia": {
      "N": 1.1,
      "K": 1.0,
      "note": "Production élevée"
    },
    "clementine": {
      "N": 0.9,
      "K": 1.0,
      "note": "Éviter calibre excessif"
    },
    "citron": {
      "N": 1.15,
      "K": 1.1,
      "note": "Remontant, besoins continus"
    },
    "pomelo": {
      "N": 1.0,
      "K": 1.1,
      "note": "Gros fruits"
    }
  },
  "formes_engrais": {
    "N_recommande": [
      "nitrate_calcium",
      "nitrate_ammonium",
      "uree_si_pH<7"
    ],
    "P_recommande": [
      "MAP",
      "acide_phosphorique"
    ],
    "K_recommande": [
      "sulfate_potasse",
      "nitrate_potasse"
    ],
    "K_conditionnel": "KCl acceptable si CE_eau < 1.0 ET Cl_eau < 100 mg/L",
    "note": "Agrumes sensibles Cl mais moins que avocatier"
  },
  "seuils_foliaires": {
    "periode_prelevement": "Août-Septembre, feuilles 4-6 mois",
    "N": {
      "unite": "%",
      "carence": 2.2,
      "suffisant": [
        2.2,
        2.4
      ],
      "optimal": [
        2.4,
        2.7
      ],
      "exces": 3.0
    },
    "P": {
      "unite": "%",
      "carence": 0.09,
      "suffisant": [
        0.09,
        0.11
      ],
      "optimal": [
        0.12,
        0.17
      ],
      "exces": 0.2
    },
    "K": {
      "unite": "%",
      "carence": 0.7,
      "suffisant": [
        0.7,
        1.0
      ],
      "optimal": [
        1.0,
        1.5
      ],
      "exces": 2.0
    },
    "Ca": {
      "unite": "%",
      "carence": 2.0,
      "suffisant": [
        2.0,
        3.0
      ],
      "optimal": [
        3.0,
        5.0
      ],
      "exces": 6.0
    },
    "Mg": {
      "unite": "%",
      "carence": 0.2,
      "suffisant": [
        0.2,
        0.3
      ],
      "optimal": [
        0.3,
        0.5
      ],
      "exces": 0.7
    },
    "Fe": {
      "unite": "ppm",
      "carence": 35,
      "suffisant": [
        35,
        60
      ],
      "optimal": [
        60,
        120
      ],
      "exces": 200
    },
    "Zn": {
      "unite": "ppm",
      "carence": 18,
      "suffisant": [
        18,
        25
      ],
      "optimal": [
        25,
        100
      ],
      "exces": 200
    },
    "Mn": {
      "unite": "ppm",
      "carence": 18,
      "suffisant": [
        18,
        25
      ],
      "optimal": [
        25,
        100
      ],
      "exces": 500
    },
    "B": {
      "unite": "ppm",
      "carence": 20,
      "suffisant": [
        20,
        35
      ],
      "optimal": [
        35,
        100
      ],
      "exces": 150
    },
    "Cu": {
      "unite": "ppm",
      "carence": 3,
      "suffisant": [
        3,
        5
      ],
      "optimal": [
        5,
        15
      ],
      "exces": 20
    },
    "Cl": {
      "unite": "%",
      "toxique": 0.7
    },
    "Na": {
      "unite": "%",
      "toxique": 0.25
    }
  },
  "salinite": {
    "orange_mandarine": {
      "CE_eau_optimal": 1.0,
      "CE_eau_limite": 2.0,
      "CE_sol_limite": 2.5,
      "Cl_eau_limite_mg_L": 150,
      "Cl_foliaire_toxique_pct": 0.7
    },
    "citron": {
      "CE_eau_optimal": 0.8,
      "CE_eau_limite": 1.5,
      "CE_sol_limite": 2.0,
      "Cl_eau_limite_mg_L": 100,
      "Cl_foliaire_toxique_pct": 0.5
    },
    "pomelo": {
      "CE_eau_optimal": 1.2,
      "CE_eau_limite": 2.5,
      "CE_sol_limite": 3.0,
      "Cl_eau_limite_mg_L": 200,
      "Cl_foliaire_toxique_pct": 0.8
    }
  },
  "kc": {
    "jeune": {
      "jan_fev": 0.45,
      "mar_avr": 0.55,
      "mai_juin": 0.65,
      "juil_aout": 0.7,
      "sept_oct": 0.6,
      "nov_dec": 0.5
    },
    "adulte": {
      "jan_fev": 0.65,
      "mar_avr": 0.75,
      "mai_juin": 0.85,
      "juil_aout": 0.9,
      "sept_oct": 0.8,
      "nov_dec": 0.7
    }
  },
  "rdi": {
    "floraison": {
      "sensibilite": "tres_haute",
      "rdi_possible": false,
      "reduction": 0
    },
    "nouaison": {
      "sensibilite": "haute",
      "rdi_possible": false,
      "reduction": 0
    },
    "grossissement_I": {
      "sensibilite": "haute",
      "rdi_possible": "prudence",
      "reduction": [
        0,
        10
      ]
    },
    "grossissement_II": {
      "sensibilite": "moderee",
      "rdi_possible": true,
      "reduction": [
        15,
        25
      ]
    },
    "maturation": {
      "sensibilite": "faible",
      "rdi_possible": true,
      "reduction": [
        25,
        35
      ]
    },
    "note": "RDI pré-récolte augmente °Brix +0.5-1.0 mais réduit calibre"
  },
  "phytosanitaire": {
    "maladies": [
      {
        "nom": "Gommose",
        "agent": "Phytophthora citrophthora, P. nicotianae",
        "conditions": "sol_mal_draine_exces_eau",
        "prevention": [
          "drainage",
          "PG_tolerant",
          "point_greffe_haut"
        ],
        "traitement": [
          "Phosphonate",
          "Métalaxyl"
        ]
      },
      {
        "nom": "Tristeza",
        "agent": "Citrus Tristeza Virus (CTV)",
        "vecteur": "pucerons",
        "prevention": "PG_tolerant_obligatoire",
        "traitement": null,
        "note": "AUCUN curatif - arrachage si sévère"
      },
      {
        "nom": "Alternariose",
        "agent": "Alternaria alternata",
        "conditions": "HR > 80%, pluie",
        "varietes_sensibles": [
          "Minneola",
          "Nova",
          "Fortune"
        ],
        "traitement": [
          "Cuivre",
          "Mancozèbe",
          "Difénoconazole"
        ]
      }
    ],
    "ravageurs": [
      {
        "nom": "Cératite",
        "degats": "piqures_fruits",
        "periode": "veraison_recolte",
        "seuil": "2% fruits piqués",
        "traitement": "Spinosad + piégeage"
      },
      {
        "nom": "Cochenilles",
        "degats": "fumagine",
        "periode": "toute_annee",
        "traitement": "Huile blanche, Spirotetramat"
      },
      {
        "nom": "Pucerons",
        "degats": "deformation_pousses_virus",
        "periode": "printemps",
        "traitement": "Imidaclopride, Spirotetramat"
      },
      {
        "nom": "Mineuse",
        "degats": "galeries_feuilles",
        "periode": "flush",
        "traitement": "Abamectine, Imidaclopride"
      },
      {
        "nom": "Acariens",
        "degats": "feuilles_bronze",
        "periode": "ete_sec",
        "traitement": "Abamectine, soufre"
      },
      {
        "nom": "Thrips",
        "degats": "cicatrices_fruits",
        "periode": "floraison",
        "traitement": "Spinosad"
      }
    ]
  },
  "calendrier_phyto_preventif": {
    "jan": {
      "cible": "Cochenilles",
      "produit": "Huile blanche",
      "dose": "15-20 L/ha"
    },
    "fev_mar": {
      "cible": "Gommose",
      "produit": "Phosphonate",
      "dose": "5 mL/L foliaire",
      "condition": "sol_humide"
    },
    "avr": {
      "cible": "Pucerons",
      "produit": "Imidaclopride",
      "condition": "si_colonies"
    },
    "mai": {
      "cible": "Mineuse",
      "produit": "Abamectine",
      "dose": "0.5 L/ha",
      "condition": "si_presence"
    },
    "aout_oct": {
      "cible": "Cératite",
      "produit": "Spinosad + attractif",
      "dose": "0.2 L/ha",
      "condition": "piegeage + seuil"
    },
    "nov": {
      "cible": "Cuivre hivernal",
      "produit": "Cuivre",
      "dose": "3 kg/ha"
    }
  },
  "maturite_recolte": {
    "orange_navel": {
      "indice": "ratio_Brix_Acidite",
      "min": 8,
      "optimal": [
        10,
        14
      ],
      "autre": "couleur_80%"
    },
    "orange_valencia": {
      "indice": "ratio_Brix_Acidite",
      "min": 8,
      "optimal": [
        10,
        16
      ],
      "autre": "Brix >= 10"
    },
    "clementine": {
      "indice": "ratio_Brix_Acidite",
      "min": 7,
      "optimal": [
        10,
        14
      ],
      "autre": "couleur_100%"
    },
    "citron": {
      "indice": "acidite_titrable",
      "min_pct": 5,
      "optimal_pct": [
        5,
        7
      ],
      "autre": "jus >= 25%"
    },
    "pomelo": {
      "indice": "ratio_Brix_Acidite",
      "min": 5.5,
      "optimal": [
        6,
        8
      ],
      "autre": "Brix >= 9"
    }
  },
  "defauts_qualite": {
    "granulation": {
      "cause": "recolte_tardive_K_faible",
      "prevention": "recolter_a_temps_K_suffisant"
    },
    "eclatement": {
      "cause": "exces_N_stress_hydrique",
      "prevention": "equilibre_N_K_irrigation_reguliere"
    },
    "petit_calibre": {
      "cause": "charge_excessive_stress_eau",
      "prevention": "eclaircissage_irrigation"
    },
    "peau_epaisse": {
      "cause": "exces_N",
      "prevention": "reduire_N"
    },
    "reverdissement": {
      "cause": "recolte_tardive_Valencia",
      "prevention": "ethylene_si_necessaire"
    },
    "oleocellose": {
      "cause": "recolte_humide_blessures",
      "prevention": "recolter_sec_manipulation_douce"
    }
  },
  "alertes": [
    {
      "code": "AGR-01",
      "nom": "Stress hydrique",
      "seuil": "NDMI < P15 (2 passages) + T > 30",
      "priorite": "urgente"
    },
    {
      "code": "AGR-02",
      "nom": "Excès eau / Gommose",
      "seuil": "NDMI > P95 + pluie > 40mm/sem",
      "priorite": "urgente"
    },
    {
      "code": "AGR-03",
      "nom": "Risque gel",
      "seuil": "Tmin prévue < 0°C",
      "priorite": "urgente"
    },
    {
      "code": "AGR-04",
      "nom": "Gel avéré",
      "seuil": "Tmin < -2°C (orange) ou < 0°C (citron)",
      "priorite": "urgente"
    },
    {
      "code": "AGR-05",
      "nom": "Canicule",
      "seuil": "Tmax > 40°C (3j) + HR < 30%",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-06",
      "nom": "Vent chaud",
      "seuil": "T > 38 + HR < 25% + vent > 30 km/h",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-07",
      "nom": "Conditions Gommose",
      "seuil": "Sol saturé > 48h + T 18-28",
      "priorite": "urgente"
    },
    {
      "code": "AGR-08",
      "nom": "Risque Cératite",
      "seuil": "Véraison + T 20-30 + piège positif",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-09",
      "nom": "Pression pucerons",
      "seuil": "Flush + T 18-28 + colonies",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-10",
      "nom": "Risque Alternaria",
      "seuil": "HR > 85% + pluie + variété sensible",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-11",
      "nom": "Chlorose ferrique",
      "seuil": "NDRE < P10 + GCI ↘ + pH sol > 7.5",
      "priorite": "vigilance"
    },
    {
      "code": "AGR-12",
      "nom": "Carence Zn",
      "seuil": "Feuilles petites mouchetées + flush",
      "priorite": "vigilance"
    },
    {
      "code": "AGR-13",
      "nom": "Toxicité Cl",
      "seuil": "Brûlures foliaires + CE eau > 2.5",
      "priorite": "urgente"
    },
    {
      "code": "AGR-14",
      "nom": "Floraison faible",
      "seuil": "Floraison < 50% attendue",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-15",
      "nom": "Chute excessive",
      "seuil": "Charge < 40% post-nouaison",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-16",
      "nom": "Maturité récolte",
      "seuil": "Ratio Brix/Acidité atteint + couleur",
      "priorite": "info"
    },
    {
      "code": "AGR-17",
      "nom": "Année OFF probable",
      "seuil": "N-1 très productif + flush faible",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-18",
      "nom": "Risque granulation",
      "seuil": "Récolte tardive + K foliaire bas",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-19",
      "nom": "Dépérissement",
      "seuil": "NIRv ↘ > 20% (4 passages)",
      "priorite": "urgente"
    },
    {
      "code": "AGR-20",
      "nom": "Tristeza suspectée",
      "seuil": "NDVI ↘ + PG bigaradier + déclin rapide",
      "priorite": "urgente"
    }
  ],
  "modele_predictif": {
    "variables": [
      {
        "nom": "floraison",
        "source": "satellite_terrain",
        "poids": [
          0.2,
          0.3
        ]
      },
      {
        "nom": "alternance_N-1_N-2",
        "source": "historique",
        "poids": [
          0.2,
          0.3
        ]
      },
      {
        "nom": "conditions_floraison",
        "source": "meteo",
        "poids": [
          0.15,
          0.25
        ]
      },
      {
        "nom": "NIRv_cumule",
        "source": "satellite",
        "poids": [
          0.15,
          0.25
        ]
      },
      {
        "nom": "stress_hydrique",
        "source": "bilan_hydrique",
        "poids": [
          0.1,
          0.2
        ]
      },
      {
        "nom": "gel",
        "source": "meteo",
        "poids": "fort_si_1"
      },
      {
        "nom": "age_verger",
        "source": "profil",
        "type": "ajustement"
      }
    ],
    "precision_attendue": {
      "traditionnel": {
        "R2": [
          0.4,
          0.55
        ],
        "MAE_pct": [
          30,
          45
        ]
      },
      "intensif": {
        "R2": [
          0.5,
          0.65
        ],
        "MAE_pct": [
          20,
          35
        ]
      },
      "super_intensif": {
        "R2": [
          0.55,
          0.7
        ],
        "MAE_pct": [
          15,
          30
        ]
      }
    },
    "previsibilite_espece": {
      "orange_navel": "moyenne",
      "orange_valencia": "bonne",
      "clementine": "moyenne",
      "citron": "difficile_remontant",
      "pomelo": "bonne"
    }
  },
  "plan_annuel_type_orange_intensif_50T": {
    "jan": {
      "NPK": "N15+P20+K10",
      "micro": "Fe-EDDHA",
      "biostim": null,
      "phyto": "Huile blanche",
      "irrigation_L_sem": 50
    },
    "fev": {
      "NPK": "N25+P15+K15",
      "micro": null,
      "biostim": "Humiques+Algues",
      "phyto": "Phosphonate",
      "irrigation_L_sem": 60
    },
    "mar": {
      "NPK": "N30+K20",
      "micro": "Zn+Mn foliaire",
      "biostim": "Algues",
      "phyto": null,
      "irrigation_L_sem": 80
    },
    "avr": {
      "NPK": "N25+P10+K15",
      "micro": "B floraison",
      "biostim": "Aminés",
      "phyto": "Pucerons si présence",
      "irrigation_L_sem": 100
    },
    "mai": {
      "NPK": "N20+K25",
      "micro": "Zn foliaire",
      "biostim": "Humiques+Aminés",
      "phyto": "Mineuse si présence",
      "irrigation_L_sem": 130
    },
    "juin": {
      "NPK": "N20+K30",
      "micro": "Fe-EDDHA",
      "biostim": null,
      "phyto": null,
      "irrigation_L_sem": 160
    },
    "juil": {
      "NPK": "N15+K30",
      "micro": "Zn+Mn foliaire",
      "biostim": "Algues",
      "phyto": null,
      "irrigation_L_sem": 180
    },
    "aout": {
      "NPK": "N15+K25",
      "micro": null,
      "biostim": null,
      "phyto": "Cératite début",
      "irrigation_L_sem": 180
    },
    "sept": {
      "NPK": "N10+K20",
      "micro": null,
      "biostim": "Humiques",
      "phyto": "Cératite",
      "irrigation_L_sem": 140
    },
    "oct": {
      "NPK": "N10+K15",
      "micro": null,
      "biostim": null,
      "phyto": "Cératite",
      "irrigation_L_sem": 100
    },
    "nov": {
      "NPK": "N15",
      "micro": null,
      "biostim": "Humiques granulé",
      "phyto": "Cuivre",
      "irrigation_L_sem": 70
    },
    "dec": {
      "NPK": null,
      "micro": null,
      "biostim": "Aminés",
      "phyto": null,
      "irrigation_L_sem": 50
    }
  },
  "protocole_phenologique": {
    "phases_par_maturite": {
      "juvenile": [
        "repos",
        "debourrement",
        "croissance",
        "floraison",
        "post_recolte"
      ],
      "entree_production": null,
      "pleine_production": null,
      "senescence": null
    },
    "phases": {
      "_note": "Machine à états sur l'historique. Chaque phase a conditions entrée et sortie structurées. GDD calculé depuis referentiel.gdd.",
      "calculs_preliminaires": {
        "GDD_jour": "max(0, (min(Tmax, Tplafond) + max(Tmin, Tbase)) / 2 - Tbase)",
        "NIRvP_norm": "(NIRvP - NIRvP_min_hist) / (NIRvP_max_hist - NIRvP_min_hist)",
        "dNDVI_dt": "(NDVI(t) - NDVI(t-1)) / jours_entre_acquisitions",
        "dNIRv_dt": "(NIRv(t) - NIRv(t-1)) / jours_entre_acquisitions",
        "Perte_NDVI": "(NDVI_pic_cycle - NDVI_actuel) / NDVI_pic_cycle",
        "Perte_NIRv": "(NIRv_pic_cycle - NIRv_actuel) / NIRv_pic_cycle",
        "Ratio_decouplage": "Perte_NIRv / max(Perte_NDVI, 0.01)"
      },
      "DORMANCE": {
        "nom": "Dormance hivernale",
        "skip_when": {
          "var": "Tmoy_Q25",
          "gte": 15
        },
        "entry": {
          "when": {
            "and": [
              {
                "var": "Tmoy",
                "lt_var": "Tmoy_Q25"
              },
              {
                "var": "NIRv_norm",
                "lte": 0.15
              }
            ]
          }
        },
        "exit": [
          {
            "target": "DEBOURREMENT",
            "when": {
              "and": [
                {
                  "var": "chill_satisfied",
                  "eq": true
                },
                {
                  "var": "warm_streak",
                  "gte": 10
                }
              ]
            },
            "on_enter": {
              "reset": [
                "GDD_cumul"
              ]
            },
            "confidence": "MODEREE"
          }
        ]
      },
      "DEBOURREMENT": {
        "nom": "Débourrement",
        "entry": {},
        "exit": [
          {
            "target": "FLORAISON",
            "when": {
              "and": [
                {
                  "var": "GDD_cumul",
                  "gte": 350
                },
                {
                  "var": "Tmoy",
                  "gte": 18
                }
              ]
            },
            "confidence": "MODEREE"
          }
        ]
      },
      "FLORAISON": {
        "nom": "Floraison",
        "entry": {},
        "exit": [
          {
            "target": "NOUAISON",
            "when": {
              "or": [
                {
                  "var": "GDD_cumul",
                  "gt": 700
                },
                {
                  "var": "hot_streak",
                  "gte": 5
                }
              ]
            },
            "confidence": "MODEREE"
          }
        ]
      },
      "NOUAISON": {
        "nom": "Nouaison / Clarification",
        "entry": {},
        "exit": [
          {
            "target": "STRESS_ESTIVAL",
            "when": {
              "var": "hot_dry_streak",
              "gte": 3
            },
            "confidence": "ELEVEE"
          }
        ]
      },
      "STRESS_ESTIVAL": {
        "nom": "Stress estival + Maturation",
        "entry": {},
        "exit": [
          {
            "target": "REPRISE_AUTOMNALE",
            "when": {
              "and": [
                {
                  "var": "precip_30j",
                  "gt": 20
                },
                {
                  "var": "Tmoy",
                  "lt": 25
                },
                {
                  "var": "d_nirv_dt",
                  "gt": 0
                }
              ]
            },
            "confidence": "MODEREE"
          },
          {
            "target": "DORMANCE",
            "when": {
              "var": "cold_streak",
              "gte": 10
            },
            "confidence": "ELEVEE"
          }
        ]
      },
      "REPRISE_AUTOMNALE": {
        "nom": "Reprise automnale",
        "entry": {},
        "exit": [
          {
            "target": "DORMANCE",
            "when": {
              "var": "cold_streak",
              "gte": 10
            },
            "on_enter": {
              "reset": [
                "GDD_cumul"
              ]
            },
            "confidence": "ELEVEE"
          }
        ]
      }
    }
  },
  "stades_bbch": [
    {
      "code": "00",
      "nom": "Repos hivernal",
      "mois": [
        "dec",
        "jan"
      ],
      "gdd_cumul": [
        0,
        50
      ],
      "coef_nirvp": 0.3,
      "phase_kc": "repos"
    },
    {
      "code": "01",
      "nom": "Gonflement bourgeons",
      "mois": [
        "feb"
      ],
      "gdd_cumul": [
        50,
        150
      ],
      "coef_nirvp": 0.3,
      "phase_kc": "debourrement"
    },
    {
      "code": "09",
      "nom": "Pointes vertes",
      "mois": [
        "feb",
        "mar"
      ],
      "gdd_cumul": [
        150,
        300
      ],
      "coef_nirvp": 0.4,
      "phase_kc": "debourrement"
    },
    {
      "code": "15",
      "nom": "Pousse printanière",
      "mois": [
        "mar",
        "apr"
      ],
      "gdd_cumul": [
        300,
        500
      ],
      "coef_nirvp": 0.5,
      "phase_kc": "croissance"
    },
    {
      "code": "51",
      "nom": "Boutons floraux",
      "mois": [
        "apr"
      ],
      "gdd_cumul": [
        500,
        700
      ],
      "coef_nirvp": 0.6,
      "phase_kc": "floraison"
    },
    {
      "code": "60",
      "nom": "Début floraison",
      "mois": [
        "apr",
        "may"
      ],
      "gdd_cumul": [
        700,
        900
      ],
      "coef_nirvp": 0.7,
      "phase_kc": "floraison"
    },
    {
      "code": "65",
      "nom": "Pleine floraison",
      "mois": [
        "may"
      ],
      "gdd_cumul": [
        900,
        1100
      ],
      "coef_nirvp": 0.8,
      "phase_kc": "floraison"
    },
    {
      "code": "69",
      "nom": "Nouaison",
      "mois": [
        "may",
        "jun"
      ],
      "gdd_cumul": [
        1100,
        1400
      ],
      "coef_nirvp": 0.9,
      "phase_kc": "nouaison"
    },
    {
      "code": "71",
      "nom": "Chute physiologique",
      "mois": [
        "jun",
        "jul"
      ],
      "gdd_cumul": [
        1400,
        1800
      ],
      "coef_nirvp": 0.9,
      "phase_kc": "grossissement"
    },
    {
      "code": "75",
      "nom": "Grossissement fruit",
      "mois": [
        "jul",
        "aug"
      ],
      "gdd_cumul": [
        1800,
        2500
      ],
      "coef_nirvp": 1.0,
      "phase_kc": "grossissement"
    },
    {
      "code": "79",
      "nom": "Fruit taille finale",
      "mois": [
        "sep",
        "oct"
      ],
      "gdd_cumul": [
        2500,
        3200
      ],
      "coef_nirvp": 1.0,
      "phase_kc": "grossissement"
    },
    {
      "code": "85",
      "nom": "Début coloration",
      "mois": [
        "oct",
        "nov"
      ],
      "gdd_cumul": [
        3200,
        3800
      ],
      "coef_nirvp": 0.9,
      "phase_kc": "maturation"
    },
    {
      "code": "89",
      "nom": "Maturité récolte",
      "mois": [
        "nov",
        "dec"
      ],
      "gdd_cumul": [
        3800,
        4200
      ],
      "coef_nirvp": 0.7,
      "phase_kc": "maturation"
    },
    {
      "code": "92",
      "nom": "Post-récolte",
      "mois": [
        "dec"
      ],
      "gdd_cumul": [
        4200,
        4500
      ],
      "coef_nirvp": 0.4,
      "phase_kc": "post_recolte"
    }
  ],
  "signaux": {
    "streaks": {
      "warm_streak": {
        "var": "Tmoy",
        "gt_var": "Tmoy_Q25"
      },
      "cold_streak": {
        "var": "Tmoy",
        "lt_var": "Tmoy_Q25"
      },
      "hot_streak": {
        "var": "Tmoy",
        "gt": 30
      },
      "hot_dry_streak": {
        "and": [
          {
            "var": "Tmax",
            "gt": 30
          },
          {
            "var": "precip_30j",
            "lt": 5
          }
        ]
      }
    }
  }
}
$crop_ai_ref_agrumes$::jsonb
)
ON CONFLICT (crop_type) DO UPDATE SET
  version = EXCLUDED.version,
  reference_data = EXCLUDED.reference_data,
  updated_at = NOW();

INSERT INTO public.crop_ai_references (crop_type, version, reference_data)
VALUES (
  'amandier',
  '1.0',
  $crop_ai_ref_amandier${
  "metadata": {
    "version": "1.0",
    "date": "2026-04-26",
    "culture": "amandier",
    "nom_scientifique": "Prunus dulcis",
    "code": "AMN",
    "pays": "Maroc",
    "zone_reference": "Fès-Meknès, Maroc",
    "altitude_m": "400-600",
    "systeme_irrigation": "goutte-à-goutte",
    "source_satellite": "Sentinel-2",
    "resolution_m": 10,
    "revisite_jours": 5,
    "api_meteo": "Open-Meteo (Penman-Monteith)",
    "usage": "LLM_direct_read — no parser needed",
    "conventions": {
      "mois": "Lowercase English 3-letter: jan feb mar apr may jun jul aug sep oct nov dec",
      "ranges": "Always [min, max] arrays — never single number when a range exists",
      "doses": "Always {value: number, unit: string} — never freetext",
      "conditions": "Always list of {field, operator, value} objects",
      "nulls": "null = not applicable. Use 0 only for a real zero value.",
      "phases_maturite": "phases_maturite_ans maps phase id -> [min_age, max_age) in years."
    },
    "client_reference": "Itto Group — Fès-Meknès",
    "auteur": "AgromindIA — AGROGINA",
    "statut": "pilote",
    "note": "Référentiel v1.0 à affiner avec données terrain Itto Group sur 2-3 cycles. Premier référentiel amandier validé marché marocain.",
    "cultures_connexes": ["OLI (Olivier)", "AVO (Avocat)", "AGR (Agrumes)", "PAL (Palmier dattier)"]
  },

  "phenological_stages": [
    {
      "key": "dormancy",
      "name_fr": "Dormance",
      "name_en": "Dormancy",
      "name_ar": "السكون",
      "months": [11, 12, 1],
      "thresholds": [
        { "key": "chill_hours", "label_fr": "Heures de froid", "label_en": "Chill hours", "compare": "below", "value": 7.2, "unit": "h", "icon": "snowflake" },
        { "key": "frost_risk", "label_fr": "Risque de gel", "label_en": "Frost risk", "compare": "below", "value": 0, "unit": "h", "icon": "snowflake" }
      ]
    },
    {
      "key": "flowering",
      "name_fr": "Floraison",
      "name_en": "Flowering",
      "name_ar": "الإزهار",
      "months": [2, 3],
      "thresholds": [
        { "key": "frost_risk_critical", "label_fr": "Risque gel critique", "label_en": "Critical frost risk", "compare": "below", "value": -2, "unit": "°C", "icon": "snowflake" },
        { "key": "rain_pollination", "label_fr": "Pluie pollinisation", "label_en": "Pollination rain", "compare": "above", "value": 15, "unit": "mm", "icon": "cloud-rain" }
      ]
    },
    {
      "key": "fruit_development",
      "name_fr": "Grossissement / Durcissement",
      "name_en": "Fruit development",
      "name_ar": "نمو الثمار",
      "months": [4, 5, 6, 7],
      "thresholds": [
        { "key": "growing_hours", "label_fr": "Heures de croissance", "label_en": "Growing hours", "compare": "above", "value": 10, "unit": "h", "icon": "sun" },
        { "key": "extreme_heat", "label_fr": "Chaleur extrême", "label_en": "Extreme heat", "compare": "above", "value": 40, "unit": "°C", "icon": "flame" }
      ]
    },
    {
      "key": "harvest",
      "name_fr": "Maturation / Récolte",
      "name_en": "Maturation / Harvest",
      "name_ar": "النضج والحصاد",
      "months": [8, 9],
      "thresholds": [
        { "key": "aflatoxin_temp", "label_fr": "Température risque aflatoxines", "label_en": "Aflatoxin risk temp", "compare": "above", "value": 35, "unit": "°C", "icon": "flame" },
        { "key": "aflatoxin_humidity", "label_fr": "HR risque aflatoxines", "label_en": "Aflatoxin risk humidity", "compare": "above", "value": 70, "unit": "%", "icon": "droplet" }
      ]
    }
  ],

  "phases_maturite_ans": {
    "juvenile": [0, 4],
    "entree_production": [4, 7],
    "pleine_production": [7, 25],
    "maturite_avancee": [25, 35],
    "senescence": [35, 50]
  },

  "seuils_meteo": {
    "gel": {
      "threshold_c": -2,
      "detection_months": [2, 3],
      "severity": "critical",
      "alerte_code": "AMN-02"
    },
    "canicule": {
      "tmax_c": 40,
      "consecutive_days": 2,
      "detection_months": [7, 8],
      "severity": "high",
      "alerte_code": "AMN-10"
    },
    "stress_thermique": {
      "tmax_c": 35,
      "humidity_max_pct": 70,
      "detection_months": [8, 9],
      "severity": "critical",
      "alerte_code": "AMN-09",
      "note": "Risque Aspergillus / aflatoxines post-récolte"
    },
    "secheresse": {
      "rain_mm_max_per_day": 5,
      "dry_season_days": 60,
      "severity": "medium"
    },
    "pluie_floraison": {
      "rain_mm_min": 15,
      "tmin_c_max": 5,
      "detection_bbch": "60-69",
      "severity": "medium",
      "alerte_code": "AMN-11"
    }
  },

  "capacites_calibrage": {
    "supported": true,
    "phenology_mode": "state_machine",
    "subtypes": {
      "intensif": {
        "required_indices": ["NDVI", "NIRv", "NDMI", "NDRE", "EVI", "GCI", "EBI"]
      },
      "super_intensif": {
        "required_indices": ["NDVI", "NIRv", "NDMI", "NDRE", "EVI", "GCI", "EBI"]
      }
    },
    "min_observed_images": 10,
    "min_history_days": 120,
    "min_history_months_for_period_percentiles": 24,
    "required_indices": ["NDVI", "NIRv", "NDMI", "NDRE", "EVI", "GCI", "EBI"]
  },

  "varietes": {
    "mediterraneennes": {
      "principales": ["Ferragnès", "Ferraduel"],
      "pollinisation": "croisée obligatoire",
      "floraison": "Mars",
      "recolte": "Septembre"
    },
    "californiennes": {
      "principales": ["Non Pareil", "Carmel", "Price"],
      "pollinisation": "partielle auto-fertile",
      "floraison": "Mi-Février",
      "recolte": "Août"
    }
  },

  "phenologie": [
    {
      "mois": 1,
      "nom": "Janvier",
      "stade": "Dormance profonde",
      "code_bbch": "BBCH 00",
      "variete_med": "Dormance",
      "variete_calif": "Dormance",
      "actions": ["Taille de formation", "Apport organique", "Analyse sol"],
      "risques": ["Gel"],
      "priorite": "faible"
    },
    {
      "mois": 2,
      "nom": "Février",
      "stade": "Gonflement bourgeons / Floraison Calif.",
      "code_bbch": "BBCH 51-65",
      "variete_med": "Gonflement bourgeons",
      "variete_calif": "Floraison pleine",
      "actions": ["Traitement préventif tavelure", "Huile blanche", "Vérification ruches"],
      "risques": ["Gel tardif", "Pluie floraison"],
      "priorite": "critique"
    },
    {
      "mois": 3,
      "nom": "Mars",
      "stade": "Floraison Médit. / Nouaison Calif.",
      "code_bbch": "BBCH 65-71",
      "variete_med": "Floraison pleine",
      "variete_calif": "Nouaison",
      "actions": ["NO traitement insecticide", "Folaire Bore 0.15%", "Folaire Zinc 0.3%", "Activation irrigation"],
      "risques": ["Gel critique", "Moniliose", "Carence Bore"],
      "priorite": "critique"
    },
    {
      "mois": 4,
      "nom": "Avril",
      "stade": "Nouaison / Début grossissement",
      "code_bbch": "BBCH 71-72",
      "variete_med": "Nouaison",
      "variete_calif": "Début grossissement",
      "actions": ["Reprise irrigation pleine", "Fertigation N+K", "Folaire Bore si non fait"],
      "risques": ["Chute physiologique", "Carence azotée"],
      "priorite": "important"
    },
    {
      "mois": 5,
      "nom": "Mai",
      "stade": "Grossissement actif",
      "code_bbch": "BBCH 72-75",
      "variete_med": "Grossissement actif",
      "variete_calif": "Grossissement actif",
      "actions": ["Irrigation maximale", "Fertigation hebdomadaire N+K", "Folaire Mg+Ca"],
      "risques": ["Stress hydrique", "Acariens"],
      "priorite": "critique"
    },
    {
      "mois": 6,
      "nom": "Juin",
      "stade": "Grossissement max / Début durcissement",
      "code_bbch": "BBCH 75-79",
      "variete_med": "Grossissement max",
      "variete_calif": "Durcissement noyau",
      "actions": ["Irrigation au pic Kc=1.0", "Maintien K élevé", "Réduction progressive N"],
      "risques": ["Stress hydrique sévère", "Stress thermique", "Acariens"],
      "priorite": "critique"
    },
    {
      "mois": 7,
      "nom": "Juillet",
      "stade": "Durcissement noyau / Pré-maturation",
      "code_bbch": "BBCH 79-85",
      "variete_med": "Durcissement noyau",
      "variete_calif": "Pré-maturation",
      "actions": ["Réduction irrigation progressive", "Arrêt N", "Maintien K", "Folaire Ca"],
      "risques": ["Stress thermique >40°C", "Aspergillus début"],
      "priorite": "critique"
    },
    {
      "mois": 8,
      "nom": "Août",
      "stade": "Maturation / Récolte Calif.",
      "code_bbch": "BBCH 85-89",
      "variete_med": "Maturation",
      "variete_calif": "Récolte",
      "actions": ["Arrêt irrigation 3-4 semaines avant récolte", "Récolte mécanique Calif.", "Séchage rapide <8% H2O"],
      "risques": ["Aflatoxines (Aspergillus flavus)", "Chaleur excessive"],
      "priorite": "critique"
    },
    {
      "mois": 9,
      "nom": "Septembre",
      "stade": "Récolte Médit. / Début repos",
      "code_bbch": "BBCH 89-91",
      "variete_med": "Récolte",
      "variete_calif": "Repos végétatif",
      "actions": ["Récolte mécanique Médit.", "Séchage contrôlé", "Bilan saison par secteur"],
      "risques": ["Xanthomonas (premières pluies)", "Aspergillus stockage"],
      "priorite": "important"
    },
    {
      "mois": 10,
      "nom": "Octobre",
      "stade": "Repos végétatif",
      "code_bbch": "BBCH 91-93",
      "variete_med": "Repos",
      "variete_calif": "Repos",
      "actions": ["Apport organique (compost)", "Phosphore sol", "Traitement cuivre préventif"],
      "risques": ["Xanthomonas (pluies automne)", "Bactériose"],
      "priorite": "faible"
    },
    {
      "mois": 11,
      "nom": "Novembre",
      "stade": "Repos / Préparation dormance",
      "code_bbch": "BBCH 93-97",
      "variete_med": "Pré-dormance",
      "variete_calif": "Pré-dormance",
      "actions": ["Rognage", "Enfouissement engrais de fond", "Préparation plan taille"],
      "risques": ["Xanthomonas"],
      "priorite": "faible"
    },
    {
      "mois": 12,
      "nom": "Décembre",
      "stade": "Dormance profonde",
      "code_bbch": "BBCH 00",
      "variete_med": "Dormance",
      "variete_calif": "Dormance",
      "actions": ["Taille hiver", "Apport calcique si pH <6.5", "Planification intrants N+1"],
      "risques": ["Gel"],
      "priorite": "faible"
    }
  ],

  "indices_satellitaires": {
    "NDVI": {
      "nom_complet": "Normalized Difference Vegetation Index",
      "usage": "Biomasse végétale active, vigueur générale",
      "seuils": {
        "stress_severe": { "max": 0.30, "action": "Alerte AMN-03, diagnostic immédiat" },
        "stress_modere": { "min": 0.30, "max": 0.45, "action": "Surveillance renforcée" },
        "normal": { "min": 0.45, "max": 0.70, "action": "Monitoring standard" },
        "vigueur_elevee": { "min": 0.70, "action": "Optimal" }
      },
      "cible_saison": { "min": 0.55, "max": 0.68, "periode": "Mai-Juillet" },
      "alerte_delta": { "variation": -0.10, "periode_jours": 10, "code": "AMN-03" }
    },
    "EVI": {
      "nom_complet": "Enhanced Vegetation Index",
      "usage": "Vigueur canopée dense, comparaison inter-secteurs",
      "seuils": {
        "stress_severe": { "max": 0.20, "action": "Alerte AMN-03" },
        "attention": { "min": 0.20, "max": 0.35, "action": "Surveillance" },
        "normal": { "min": 0.35, "max": 0.55, "action": "OK" },
        "excellent": { "min": 0.55, "action": "Optimal" }
      },
      "note": "Préférer EVI pour comparaison inter-secteurs (correction atmosphérique)"
    },
    "GCI": {
      "nom_complet": "Green Chlorophyll Index",
      "usage": "Teneur chlorophylle, statut azoté, détection chlorose",
      "seuils": {
        "carence_severe": { "max": 2.0, "action": "Alerte AMN-04, folaire N urgent" },
        "deficit_modere": { "min": 2.0, "max": 3.5, "action": "Ajustement fertigation" },
        "normal": { "min": 3.5, "max": 5.5, "action": "OK" },
        "optimum": { "min": 5.5, "action": "Excellent" }
      },
      "cible_pilote": { "min": 4.0, "periode": "Mai-Juin" },
      "alerte_code": "AMN-04"
    },
    "NDRE": {
      "nom_complet": "Normalized Difference Red Edge",
      "usage": "Carence N/Fe, chlorose ferrique (sols calcaires Fès-Meknès)",
      "seuils": {
        "carence": { "max": 0.15, "action": "Alerte AMN-04 + AMN-06, fer chélaté" },
        "attention": { "min": 0.15, "max": 0.25, "action": "Surveillance" },
        "normal": { "min": 0.25, "max": 0.40, "action": "OK" },
        "vigoureux": { "min": 0.40, "action": "Optimal" }
      },
      "note": "Combinaison GCI+NDRE pour différencier carence N vs chlorose ferrique"
    },
    "NDMI": {
      "nom_complet": "Normalized Difference Moisture Index",
      "usage": "Contenu en eau couvert végétal, stress hydrique",
      "seuils": {
        "stress_severe": { "max": -0.10, "action": "Alerte AMN-01, irrigation urgente" },
        "attention": { "min": -0.10, "max": 0.10, "action": "Augmenter dose irrigation" },
        "correct": { "min": 0.10, "max": 0.30, "action": "OK" },
        "bonne_hydratation": { "min": 0.30, "action": "Optimal" }
      },
      "priorite_periode": "Juin-Août",
      "alerte_delta": { "variation": -0.05, "periode_jours": 5, "periode_mois": [6, 7, 8], "code": "AMN-01" }
    },
    "NIRv": {
      "nom_complet": "Near-Infrared Reflectance of Vegetation",
      "usage": "Productivité primaire brute, estimation rendement",
      "seuils": {
        "tres_faible": { "max": 0.05 },
        "moyen": { "min": 0.05, "max": 0.12 },
        "bon": { "min": 0.12, "max": 0.22 },
        "excellent": { "min": 0.22 }
      },
      "usage_recolte": "Valeur NIRv juillet → estimation t/ha amande décortiquée",
      "alerte_code": "AMN-12"
    },
    "EBI": {
      "nom_complet": "Enhanced Bloom Index",
      "usage": "Détection pic de floraison amandier (fleurs blanches sur canopée). INDICE PHÉNOLOGIQUE PRINCIPAL amandier — pas d'équivalent NIRvP olivier.",
      "formule": "EBI = (R + G + B) / ((G/B) × (R - B + epsilon))",
      "seuils": {
        "pre_floraison": { "max": 50, "action": "Floraison non détectée — surveiller" },
        "debut_floraison": { "min": 50, "max": 150, "action": "Début floraison, vérifier ruches" },
        "pleine_floraison": { "min": 150, "max": 300, "action": "Pic floraison — fenêtre pollinisation critique" },
        "fin_floraison": { "min": 300, "action": "Saturation — chute pétales imminente" }
      },
      "priorite_periode": "Février-Mars (mediterraneennes), Mi-Février (californiennes)",
      "alerte_codes": ["AMN-02", "AMN-05", "AMN-11"],
      "usage_phenologique": "Pic EBI horodate la floraison réelle par secteur — déclenche alertes gel (AMN-02), bore (AMN-05), pollinisation (AMN-11). Croiser avec NDVI pour confirmer densité fleurs.",
      "note": "EBI exploite la signature blanche éphémère des fleurs d'amandier (R≈G≈B élevés, B max). Spécifique cultures à floraison blanche dense (amandier, cerisier, prunier)."
    }
  },

  "irrigation": {
    "formule": "ETc (mm/j) = Kc × ETP0 (Penman-Monteith Open-Meteo)",
    "efficience_goutte_a_goutte": 0.92,
    "besoin_annuel_mm": { "min": 700, "max": 900 },
    "coefficients_kc": [
      { "mois": 1, "nom": "Janvier", "stade": "Dormance", "kc_med": 0.30, "kc_calif": 0.30, "etp_ref_mm_j": 1.5, "besoin_mensuel_mm": 14, "priorite": "faible" },
      { "mois": 2, "nom": "Février", "stade": "Floraison Calif.", "kc_med": 0.40, "kc_calif": 0.55, "etp_ref_mm_j": 2.0, "besoin_mensuel_mm_min": 22, "besoin_mensuel_mm_max": 31, "priorite": "modere" },
      { "mois": 3, "nom": "Mars", "stade": "Floraison Médit. / Nouaison", "kc_med": 0.55, "kc_calif": 0.65, "etp_ref_mm_j": 3.0, "besoin_mensuel_mm_min": 51, "besoin_mensuel_mm_max": 60, "priorite": "modere" },
      { "mois": 4, "nom": "Avril", "stade": "Nouaison / Début grossissement", "kc_med": 0.70, "kc_calif": 0.75, "etp_ref_mm_j": 4.5, "besoin_mensuel_mm_min": 95, "besoin_mensuel_mm_max": 101, "priorite": "important" },
      { "mois": 5, "nom": "Mai", "stade": "Grossissement actif", "kc_med": 0.90, "kc_calif": 0.90, "etp_ref_mm_j": 6.0, "besoin_mensuel_mm": 167, "priorite": "critique" },
      { "mois": 6, "nom": "Juin", "stade": "Grossissement max / Durcissement", "kc_med": 1.00, "kc_calif": 1.00, "etp_ref_mm_j": 7.5, "besoin_mensuel_mm": 225, "priorite": "critique" },
      { "mois": 7, "nom": "Juillet", "stade": "Durcissement / Pré-maturation", "kc_med": 0.90, "kc_calif": 0.85, "etp_ref_mm_j": 7.8, "besoin_mensuel_mm_min": 205, "besoin_mensuel_mm_max": 217, "priorite": "critique" },
      { "mois": 8, "nom": "Août", "stade": "Maturation / Récolte Calif.", "kc_med": 0.75, "kc_calif": 0.55, "etp_ref_mm_j": 7.2, "besoin_mensuel_mm_min": 123, "besoin_mensuel_mm_max": 167, "priorite": "important" },
      { "mois": 9, "nom": "Septembre", "stade": "Récolte Médit. / Repos", "kc_med": 0.55, "kc_calif": 0.40, "etp_ref_mm_j": 5.5, "besoin_mensuel_mm_min": 66, "besoin_mensuel_mm_max": 91, "priorite": "faible" },
      { "mois": 10, "nom": "Octobre", "stade": "Repos végétatif", "kc_med": 0.40, "kc_calif": 0.40, "etp_ref_mm_j": 3.5, "besoin_mensuel_mm": 43, "priorite": "faible" },
      { "mois": 11, "nom": "Novembre", "stade": "Repos / Pré-dormance", "kc_med": 0.35, "kc_calif": 0.35, "etp_ref_mm_j": 2.0, "besoin_mensuel_mm": 21, "priorite": "tres_faible" },
      { "mois": 12, "nom": "Décembre", "stade": "Dormance profonde", "kc_med": 0.30, "kc_calif": 0.30, "etp_ref_mm_j": 1.5, "besoin_mensuel_mm": 14, "priorite": "tres_faible" }
    ],
    "fenetre_critique": {
      "periode": "Juin-Juillet",
      "besoin_mm_2mois": 440,
      "note": "50% du besoin annuel sur 2 mois. Sur 120 ha : ~528 000 m3/mois en pointe."
    }
  },

  "nutrition": {
    "equilibre_reference": { "N": 1, "P2O5": 0.3, "K2O": 1.2 },
    "apports_annuels_u_ha": {
      "N": { "min": 180, "max": 200 },
      "P2O5": 60,
      "K2O": 240
    },
    "programme_mensuel": [
      {
        "periode": "Janvier-Février",
        "stade": "Dormance / Pré-floraison",
        "N_u_ha": 60,
        "P2O5_u_ha": 30,
        "K2O_u_ha": 40,
        "oligoelements": ["Fe chélaté EDTA 2-4 kg/ha", "Zn sulfate 3-5 kg/ha", "Mn"],
        "mode": "Enfouissement sol",
        "note": "60% du N total en pré-floraison pour stimuler la floraison"
      },
      {
        "periode": "Mars-Avril",
        "stade": "Floraison / Nouaison",
        "N_u_ha": 20,
        "P2O5_u_ha": 10,
        "K2O_u_ha": 30,
        "oligoelements": ["Bore 1.5-2 kg/ha B pur (folaire 0.15%)", "Zinc sulfate 0.3% folaire"],
        "mode": "Fertigation + Folaire",
        "note": "Bore CRITIQUE pour la nouaison. Ne pas traiter insecticide pendant floraison (abeilles)"
      },
      {
        "periode": "Mai-Juin",
        "stade": "Grossissement actif",
        "N_u_ha": 60,
        "P2O5_u_ha": 10,
        "K2O_u_ha": 80,
        "oligoelements": ["Mg folaire", "Ca folaire", "Zn"],
        "mode": "Fertigation hebdomadaire",
        "note": "Phase calibre. Ratio N:K = 1:1.3. K critique pour qualité amande"
      },
      {
        "periode": "Juillet",
        "stade": "Durcissement noyau",
        "N_u_ha": 20,
        "P2O5_u_ha": 0,
        "K2O_u_ha": 50,
        "oligoelements": ["Ca folaire"],
        "mode": "Fertigation réduite",
        "note": "Réduction N progressive. Risque excès végétation si N trop élevé"
      },
      {
        "periode": "Août-Septembre",
        "stade": "Maturation / Récolte",
        "N_u_ha": 0,
        "P2O5_u_ha": 0,
        "K2O_u_ha": 20,
        "oligoelements": [],
        "mode": "Arrêt fertigation",
        "note": "Arrêt 3-4 semaines avant récolte pour favoriser séchage naturel coque"
      },
      {
        "periode": "Octobre-Novembre",
        "stade": "Repos végétatif",
        "N_u_ha": 20,
        "P2O5_u_ha": 10,
        "K2O_u_ha": 20,
        "oligoelements": ["Compost organique (valorisation déchets internes)"],
        "mode": "Enfouissement sol + organique",
        "note": "Reconstitution réserves. Utiliser compost interne Itto Group"
      }
    ],
    "oligoelements_prioritaires_fes_meknes": {
      "Bore": { "dose": "1.5-2 kg/ha B pur", "periode": "Mars (avant BBCH 65)", "mode": "Folaire 0.15%", "risque": "Carence fréquente sols calcaires, chute nouaison" },
      "Zinc": { "dose": "3-5 kg ZnSO4/ha", "periode": "Mars-Avril", "mode": "Sol ou folaire 0.3%", "risque": "Carence commune région Meknès" },
      "Fer": { "dose": "2-4 kg Fe-EDTA/ha", "periode": "Janvier-Février", "mode": "Sol chélaté", "risque": "Chlorose ferrique sols alcalins pH>7.5" },
      "Manganèse": { "mode": "Surveillance via NDRE", "risque": "Antagonisme Mn/Fe sur sols calcaires" }
    }
  },

  "alertes": [
    {
      "code": "AMN-01",
      "niveau": "CRITIQUE",
      "titre": "Stress hydrique sévère — période grossissement",
      "declenchement": { "indice": "NDMI", "operateur": "<", "valeur": -0.10, "condition_supplementaire": "ETP > 7 mm/j", "mois": [5, 6, 7] },
      "action": "Augmentation immédiate dose irrigation, vérification débit goutte-à-goutte"
    },
    {
      "code": "AMN-02",
      "niveau": "CRITIQUE",
      "titre": "Risque gel sur floraison",
      "declenchement": { "meteo": "T_min", "operateur": "<", "valeur": -2, "bbch": "55-69", "mois": [2, 3] },
      "action": "Alerte urgente, activation protection gel si disponible"
    },
    {
      "code": "AMN-03",
      "niveau": "URGENT",
      "titre": "Baisse NDVI anormale — stress végétatif",
      "declenchement": { "indice": "NDVI", "delta": -0.10, "periode_jours": 10, "exclusion_mois": [8, 9] },
      "action": "Diagnostic terrain, vérification irrigation et état sanitaire"
    },
    {
      "code": "AMN-04",
      "niveau": "URGENT",
      "titre": "Carence azotée détectée",
      "declenchement": { "conditions": [{ "indice": "GCI", "operateur": "<", "valeur": 2.5 }, { "indice": "NDRE", "operateur": "<", "valeur": 0.18 }], "operateur_logique": "OR", "mois": [4, 5, 6] },
      "action": "Ajustement fertigation azotée, folaire urée 3% si urgent"
    },
    {
      "code": "AMN-05",
      "niveau": "URGENT",
      "titre": "Risque carence bore — chute nouaison",
      "declenchement": { "condition": "Non-application Bore avant BBCH 65", "indice_confirmatoire": "GCI en baisse", "mois": [2, 3] },
      "action": "Folaire Bore 0.15% immédiat avant fermeture fleurs"
    },
    {
      "code": "AMN-06",
      "niveau": "INFO",
      "titre": "Chlorose ferrique suspectée",
      "declenchement": { "indice": "NDRE", "operateur": "<", "valeur": 0.20, "condition_sol": "pH estimé > 7.5" },
      "action": "Apport Fe-EDTA chélaté, vérification pH eau irrigation"
    },
    {
      "code": "AMN-07",
      "niveau": "URGENT",
      "titre": "Hétérogénéité inter-secteurs anormale",
      "declenchement": { "indice": "NDVI", "ecart_entre_secteurs": 0.15, "condition": "mêmes conditions météo" },
      "action": "Audit secteur défaillant, vérification irrigation localisée et état sanitaire"
    },
    {
      "code": "AMN-08",
      "niveau": "INFO",
      "titre": "Fenêtre optimale récolte",
      "declenchement": { "conditions": [{ "indice": "EVI", "tendance": "déclin" }, { "indice": "NDMI", "operateur": ">", "valeur": 0.10 }, { "meteo": "T_moy", "operateur": ">", "valeur": 30 }], "mois": [8, 9] },
      "action": "Planification récolte mécanique, préparation station cassage"
    },
    {
      "code": "AMN-09",
      "niveau": "CRITIQUE",
      "titre": "Risque Aspergillus / aflatoxines post-récolte",
      "declenchement": { "conditions": [{ "meteo": "T_max", "operateur": ">", "valeur": 35 }, { "meteo": "HR", "operateur": ">", "valeur": 70 }], "condition_pheno": "Post-déhiscence", "mois": [8, 9] },
      "action": "Récolte urgente, séchage mécanique immédiat, stockage <8% H2O"
    },
    {
      "code": "AMN-10",
      "niveau": "URGENT",
      "titre": "Stress thermique estival critique",
      "declenchement": { "conditions": [{ "meteo": "T_max", "operateur": ">", "valeur": 40 }, { "indice": "NDMI", "operateur": "<", "valeur": 0.05 }], "mois": [7, 8] },
      "action": "Irrigation de refroidissement, surveillance NDMI quotidienne"
    },
    {
      "code": "AMN-11",
      "niveau": "INFO",
      "titre": "Conditions défavorables pollinisation",
      "declenchement": { "conditions": [{ "meteo": "pluie_mm", "operateur": ">", "valeur": 15 }, { "meteo": "T_min", "operateur": "<", "valeur": 5 }], "operateur_logique": "OR", "bbch": "60-69" },
      "action": "Surveillance nouaison, prévoir folaire Bore si conditions prolongées"
    },
    {
      "code": "AMN-12",
      "niveau": "INFO",
      "titre": "Estimation rendement — prévision récolte",
      "declenchement": { "indice": "NIRv", "periode": "Juillet", "calcul": "NIRv_moyen_secteur → estimation t/ha amande décortiquée" },
      "action": "Rapport prévisionnel rendement par secteur, planification logistique station ONSSA"
    }
  ],

  "ravageurs_maladies": [
    {
      "organisme": "Monilinia laxa",
      "nom_commun": "Moniliose",
      "type": "champignon",
      "periode_risque_mois": [2, 3, 4],
      "signal_satellite": "Baisse NDVI localisée + humidité élevée",
      "seuil_intervention": "T° 15-22°C + HR >85% pendant floraison",
      "solution_integree": ["Cuivre (si nécessaire)", "Aération canopée par taille", "Éviter blessures"]
    },
    {
      "organisme": "Xanthomonas arboricola pv. juglandis",
      "nom_commun": "Bactériose amandier",
      "type": "bacterie",
      "periode_risque_mois": [10, 11],
      "signal_satellite": "Spots NDVI <0.35 après pluies automne",
      "seuil_intervention": "Pluies >20mm + T° 20-28°C post-récolte",
      "solution_integree": ["Cuivre préventif", "Couverture plaies de taille", "Taille en période sèche"]
    },
    {
      "organisme": "Anarsia lineatella",
      "nom_commun": "Zeuzère / Carpocapse amandes",
      "type": "lepidoptere",
      "periode_risque_mois": [4, 5, 6, 7, 8],
      "signal_satellite": "Dégâts précoces détectables sur NIRv",
      "seuil_intervention": "5 adultes/piège/semaine",
      "solution_integree": ["Confusion sexuelle", "Bacillus thuringiensis (Bt)", "Insectes auxiliaires"]
    },
    {
      "organisme": "Aspergillus flavus",
      "nom_commun": "Aflatoxines",
      "type": "mycotoxine",
      "periode_risque_mois": [8, 9],
      "signal_satellite": "AMN-09 (T° + HR post-déhiscence)",
      "seuil_intervention": "T° >35°C + HR >70% amandes au sol",
      "solution_integree": ["Récolte rapide", "Séchage mécanique", "Stockage <8% H2O", "Contrôle ONSSA"]
    },
    {
      "organisme": "Eutetranychus orientalis",
      "nom_commun": "Acarien rouge oriental",
      "type": "acarien",
      "periode_risque_mois": [5, 6, 7, 8],
      "signal_satellite": "EVI baisse + NDRE chute localisée",
      "seuil_intervention": "10 acariens/feuille active",
      "solution_integree": ["Acaricides biologiques", "Phytoseiidae (acariens prédateurs)", "Surveillance hebdo"]
    }
  ],

  "plan_annuel": {
    "algorithme": "GENERATION_PLAN_ANNUEL_AMN",
    "parametres_entree": ["surface_ha", "variete", "type_irrigation", "date_plantation", "historique_gci_evi"],
    "fenetres_critiques": [
      {
        "id": 1,
        "nom": "Floraison",
        "periode_mois": [2, 3],
        "indices_cles": ["EBI", "NDVI", "T_min"],
        "alertes_actives": ["AMN-02", "AMN-05", "AMN-11"],
        "kpi": "T_min > -2°C pendant BBCH 65 ; pic EBI horodaté par secteur"
      },
      {
        "id": 2,
        "nom": "Stress hydrique estival",
        "periode_mois": [6, 7],
        "indices_cles": ["NDMI", "ETP"],
        "alertes_actives": ["AMN-01", "AMN-10", "AMN-07"],
        "kpi": "NDMI > 0.10 en continu"
      },
      {
        "id": 3,
        "nom": "Récolte",
        "periode_mois": [8, 9],
        "indices_cles": ["NIRv", "NDMI"],
        "alertes_actives": ["AMN-08", "AMN-09", "AMN-12"],
        "kpi": "NIRv > 0.15 au pic + séchage <8% H2O"
      },
      {
        "id": 4,
        "nom": "Repos végétatif",
        "periode_mois": [10, 11],
        "indices_cles": ["EVI", "pluviometrie"],
        "alertes_actives": ["AMN-06"],
        "kpi": "EVI stable > 0.25 post-récolte"
      }
    ]
  }
}
$crop_ai_ref_amandier$::jsonb
)
ON CONFLICT (crop_type) DO UPDATE SET
  version = EXCLUDED.version,
  reference_data = EXCLUDED.reference_data,
  updated_at = NOW();

INSERT INTO public.crop_ai_references (crop_type, version, reference_data)
VALUES (
  'avocatier',
  '1.0',
  $crop_ai_ref_avocatier${
  "metadata": {
    "version": "1.0",
    "date": "2026-02",
    "culture": "avocatier",
    "nom_scientifique": "Persea americana Mill.",
    "pays": "Maroc"
  },
  "phenological_stages": [
    {
      "key": "winter",
      "name_fr": "Hiver",
      "name_en": "Winter",
      "name_ar": "الشتاء",
      "months": [12, 1, 2],
      "thresholds": [
        { "key": "frost_risk", "label_fr": "Risque de gel", "label_en": "Frost risk", "compare": "below", "value": 0, "unit": "h", "icon": "snowflake" },
        { "key": "cold_stress", "label_fr": "Stress froid", "label_en": "Cold stress", "compare": "below", "value": 5, "unit": "h", "icon": "snowflake" }
      ]
    },
    {
      "key": "flowering",
      "name_fr": "Floraison",
      "name_en": "Flowering",
      "name_ar": "الإزهار",
      "months": [3, 4, 5],
      "thresholds": [
        { "key": "optimal_flowering", "label_fr": "Conditions optimales", "label_en": "Optimal conditions", "compare": "between", "value": 18, "upper": 26, "unit": "h", "icon": "leaf" },
        { "key": "heat_stress", "label_fr": "Stress thermique", "label_en": "Heat stress", "compare": "above", "value": 33, "unit": "h", "icon": "flame" }
      ]
    },
    {
      "key": "fruit_growth",
      "name_fr": "Grossissement des fruits",
      "name_en": "Fruit growth",
      "name_ar": "نمو الثمار",
      "months": [6, 7, 8, 9, 10],
      "thresholds": [
        { "key": "growing_hours", "label_fr": "Heures de croissance", "label_en": "Growing hours", "compare": "above", "value": 12, "unit": "h", "icon": "sun" },
        { "key": "extreme_heat", "label_fr": "Chaleur extrême", "label_en": "Extreme heat", "compare": "above", "value": 36, "unit": "h", "icon": "flame" }
      ]
    }
  ],
  "phases_maturite_ans": {
    "juvenile": [
      0,
      5
    ],
    "entree_production": [
      5,
      10
    ],
    "pleine_production": [
      10,
      40
    ],
    "maturite_avancee": [
      40,
      60
    ],
    "senescence": [
      60,
      200
    ]
  },
  "gdd": {
    "tbase_c": 10.0,
    "plafond_c": 33.0,
    "reference": "Calibration engine — avocado growing degree days (caps)"
  },
  "seuils_meteo": {
    "gel": {
      "threshold_c": 2.0,
      "detection_months": [
        1,
        2,
        3,
        4
      ],
      "severity": "high"
    },
    "canicule": {
      "tmax_c": 38.0,
      "consecutive_days": 3,
      "severity": "high"
    },
    "vent_chaud": {
      "temperature_c": 35.0,
      "wind_kmh": 25.0,
      "humidity_max_pct": 25.0,
      "severity": "medium"
    },
    "secheresse": {
      "rain_mm_max_per_day": 5.0,
      "dry_season_days": 60,
      "transition_days": 30,
      "rainy_season_days": 20,
      "severity": "medium"
    }
  },
  "capacites_calibrage": {
    "supported": true,
    "phenology_mode": "state_machine",
    "subtypes": {
      "traditionnel": {
        "required_indices": [
          "NDVI",
          "NIRv",
          "NDMI",
          "NDRE",
          "EVI",
          "MSAVI",
          "MSI",
          "GCI"
        ]
      },
      "intensif": {
        "required_indices": [
          "NDVI",
          "NIRv",
          "NDMI",
          "NDRE",
          "EVI",
          "MSAVI",
          "MSI",
          "GCI"
        ]
      },
      "super_intensif": {
        "required_indices": [
          "NDVI",
          "NIRv",
          "NDMI",
          "NDRE",
          "EVI",
          "MSAVI",
          "MSI",
          "GCI"
        ]
      }
    },
    "min_observed_images": 10,
    "min_history_days": 120,
    "min_history_months_for_period_percentiles": 24,
    "required_indices": [
      "NDVI",
      "NIRv",
      "NDMI",
      "NDRE",
      "EVI",
      "MSAVI",
      "MSI",
      "GCI"
    ]
  },
  "varietes": [
    {
      "code": "HASS",
      "nom": "Hass",
      "race": "guatemalteque",
      "type_floral": "A",
      "peau": "rugueuse_noire",
      "poids_g": [
        170,
        300
      ],
      "huile_pct": [
        18,
        25
      ],
      "maturite_mois": [
        "Fev",
        "mar",
        "Avr",
        "Mai",
        "Juin",
        "Juil",
        "Aout",
        "Sept"
      ],
      "alternance": "moderee",
      "vigueur": "moyenne",
      "port": "etale",
      "froid_min_C": -3,
      "salinite": "sensible",
      "rendement_kg_arbre": {
        "juvenile": [
          5,
          15
        ],
        "entree_production": [
          30,
          60
        ],
        "pleine_production": [
          80,
          150
        ],
        "maturite_avancee": [
          120,
          200
        ],
        "senescence": [
          100,
          180
        ]
      }
    },
    {
      "code": "FUERTE",
      "nom": "Fuerte",
      "race": "hybride_GM",
      "type_floral": "B",
      "peau": "lisse_verte",
      "poids_g": [
        200,
        400
      ],
      "huile_pct": [
        15,
        20
      ],
      "maturite_mois": [
        "nov",
        "dec",
        "jan",
        "Fev",
        "mar"
      ],
      "alternance": "forte",
      "vigueur": "forte",
      "port": "etale_large",
      "froid_min_C": -4,
      "salinite": "sensible",
      "rendement_kg_arbre": {
        "juvenile": [
          5,
          10
        ],
        "entree_production": [
          25,
          50
        ],
        "pleine_production": [
          60,
          120
        ],
        "maturite_avancee": [
          100,
          180
        ],
        "senescence": [
          80,
          150
        ]
      }
    },
    {
      "code": "BACON",
      "nom": "Bacon",
      "race": "mexicaine",
      "type_floral": "B",
      "peau": "lisse_verte",
      "poids_g": [
        200,
        350
      ],
      "huile_pct": [
        12,
        15
      ],
      "maturite_mois": [
        "nov",
        "dec",
        "jan"
      ],
      "alternance": "moderee",
      "vigueur": "forte",
      "port": "dresse",
      "froid_min_C": -5,
      "salinite": "moyenne",
      "rendement_kg_arbre": {
        "juvenile": [
          3,
          8
        ],
        "entree_production": [
          20,
          40
        ],
        "pleine_production": [
          50,
          100
        ],
        "maturite_avancee": [
          80,
          140
        ],
        "senescence": [
          70,
          120
        ]
      }
    },
    {
      "code": "ZUTANO",
      "nom": "Zutano",
      "race": "mexicaine",
      "type_floral": "B",
      "peau": "lisse_vert_clair",
      "poids_g": [
        200,
        400
      ],
      "huile_pct": [
        10,
        15
      ],
      "maturite_mois": [
        "oct",
        "nov",
        "dec"
      ],
      "alternance": "faible",
      "vigueur": "tres_forte",
      "port": "dresse",
      "froid_min_C": -6,
      "salinite": "moyenne",
      "pollinisateur": true
    },
    {
      "code": "PINKERTON",
      "nom": "Pinkerton",
      "race": "guatemalteque",
      "type_floral": "A",
      "peau": "rugueuse_verte",
      "poids_g": [
        250,
        450
      ],
      "huile_pct": [
        18,
        22
      ],
      "maturite_mois": [
        "jan",
        "Fev",
        "mar",
        "Avr"
      ],
      "alternance": "faible",
      "vigueur": "faible",
      "port": "compact",
      "froid_min_C": -2,
      "salinite": "sensible",
      "rendement_kg_arbre": {
        "juvenile": [
          8,
          20
        ],
        "entree_production": [
          40,
          80
        ],
        "pleine_production": [
          100,
          180
        ],
        "maturite_avancee": [
          150,
          250
        ],
        "senescence": [
          130,
          220
        ]
      }
    },
    {
      "code": "REED",
      "nom": "Reed",
      "race": "guatemalteque",
      "type_floral": "A",
      "peau": "epaisse_verte",
      "poids_g": [
        300,
        500
      ],
      "huile_pct": [
        18,
        22
      ],
      "maturite_mois": [
        "Juil",
        "Aout",
        "Sept",
        "oct"
      ],
      "alternance": "moderee",
      "vigueur": "moyenne",
      "port": "dresse",
      "froid_min_C": -2,
      "salinite": "sensible"
    },
    {
      "code": "ETTINGER",
      "nom": "Ettinger",
      "race": "hybride_GM",
      "type_floral": "B",
      "peau": "lisse_vert_brillant",
      "poids_g": [
        250,
        400
      ],
      "huile_pct": [
        15,
        18
      ],
      "maturite_mois": [
        "oct",
        "nov",
        "dec"
      ],
      "alternance": "moderee",
      "vigueur": "forte",
      "port": "etale",
      "froid_min_C": -4,
      "salinite": "moyenne",
      "pollinisateur": true
    },
    {
      "code": "LAMB_HASS",
      "nom": "Lamb Hass",
      "race": "guatemalteque",
      "type_floral": "A",
      "peau": "rugueuse_noire",
      "poids_g": [
        250,
        400
      ],
      "huile_pct": [
        18,
        22
      ],
      "maturite_mois": [
        "Avr",
        "Mai",
        "Juin",
        "Juil",
        "Aout"
      ],
      "alternance": "faible",
      "vigueur": "moyenne",
      "port": "compact",
      "froid_min_C": -3,
      "salinite": "sensible",
      "rendement_kg_arbre": {
        "juvenile": [
          8,
          18
        ],
        "entree_production": [
          40,
          75
        ],
        "pleine_production": [
          90,
          170
        ],
        "maturite_avancee": [
          140,
          230
        ],
        "senescence": [
          120,
          200
        ]
      }
    }
  ],
  "types_floraux": {
    "description": "Dichogamie protogyne synchrone",
    "type_A": {
      "jour_1_matin": "femelle_receptif",
      "jour_1_apres_midi": "ferme",
      "jour_2_matin": "ferme",
      "jour_2_apres_midi": "male_pollen",
      "varietes": [
        "Hass",
        "Pinkerton",
        "Reed",
        "Gwen",
        "Lamb Hass"
      ]
    },
    "type_B": {
      "jour_1_matin": "ferme",
      "jour_1_apres_midi": "femelle_receptif",
      "jour_2_matin": "male_pollen",
      "jour_2_apres_midi": "ferme",
      "varietes": [
        "Fuerte",
        "Bacon",
        "Zutano",
        "Ettinger",
        "Edranol"
      ]
    },
    "ratio_pollinisateur": "1 type B pour 8-10 type A",
    "ruches_ha": [
      4,
      6
    ]
  },
  "systemes": {
    "traditionnel": {
      "densite_arbres_ha": [
        100,
        150
      ],
      "ecartement_m": "10×8 à 12×10",
      "irrigation": "gravitaire_ou_gag",
      "entree_production_annee": [
        5,
        6
      ],
      "pleine_production_annee": [
        10,
        12
      ],
      "duree_vie_ans": [
        40,
        50
      ],
      "indice_cle": "NIRv",
      "rendement_pleine_prod_t_ha": [
        8,
        12
      ]
    },
    "intensif": {
      "densite_arbres_ha": [
        200,
        400
      ],
      "ecartement_m": "6×4 à 8×5",
      "irrigation": "goutte_a_goutte",
      "entree_production_annee": [
        3,
        4
      ],
      "pleine_production_annee": [
        6,
        8
      ],
      "duree_vie_ans": [
        25,
        35
      ],
      "indice_cle": "NIRv",
      "rendement_pleine_prod_t_ha": [
        12,
        20
      ]
    },
    "super_intensif": {
      "densite_arbres_ha": [
        800,
        1200
      ],
      "ecartement_m": "4×2 à 5×2.5",
      "irrigation": "gag_haute_frequence",
      "entree_production_annee": [
        2,
        3
      ],
      "pleine_production_annee": [
        4,
        5
      ],
      "duree_vie_ans": [
        15,
        20
      ],
      "indice_cle": "NIRv",
      "rendement_pleine_prod_t_ha": [
        18,
        30
      ]
    }
  },
  "seuils_satellite": {
    "traditionnel": {
      "NDVI": {
        "optimal": [
          0.55,
          0.75
        ],
        "vigilance": 0.5,
        "alerte": 0.45
      },
      "NIRv": {
        "optimal": [
          0.15,
          0.3
        ],
        "vigilance": 0.12,
        "alerte": 0.1
      },
      "NDMI": {
        "optimal": [
          0.2,
          0.4
        ],
        "vigilance": 0.15,
        "alerte": 0.12
      },
      "NDRE": {
        "optimal": [
          0.2,
          0.35
        ],
        "vigilance": 0.17,
        "alerte": 0.15
      }
    },
    "intensif": {
      "NDVI": {
        "optimal": [
          0.65,
          0.82
        ],
        "vigilance": 0.6,
        "alerte": 0.55
      },
      "NIRv": {
        "optimal": [
          0.2,
          0.38
        ],
        "vigilance": 0.17,
        "alerte": 0.15
      },
      "NDMI": {
        "optimal": [
          0.25,
          0.45
        ],
        "vigilance": 0.2,
        "alerte": 0.17
      },
      "NDRE": {
        "optimal": [
          0.25,
          0.4
        ],
        "vigilance": 0.22,
        "alerte": 0.2
      }
    },
    "super_intensif": {
      "NDVI": {
        "optimal": [
          0.7,
          0.88
        ],
        "vigilance": 0.65,
        "alerte": 0.6
      },
      "NIRv": {
        "optimal": [
          0.25,
          0.45
        ],
        "vigilance": 0.22,
        "alerte": 0.2
      },
      "NDMI": {
        "optimal": [
          0.3,
          0.5
        ],
        "vigilance": 0.25,
        "alerte": 0.22
      },
      "NDRE": {
        "optimal": [
          0.28,
          0.45
        ],
        "vigilance": 0.25,
        "alerte": 0.23
      }
    }
  },
  "stades_phenologiques": [
    {
      "nom": "Repos relatif",
      "mois": [
        "dec",
        "jan"
      ],
      "duree_sem": [
        6,
        8
      ],
      "coef_nirvp": 0.7
    },
    {
      "nom": "Flush végétatif 1",
      "mois": [
        "Fev",
        "mar"
      ],
      "duree_sem": [
        4,
        6
      ],
      "coef_nirvp": 1.0
    },
    {
      "nom": "Induction florale",
      "mois": [
        "jan",
        "Fev"
      ],
      "duree_sem": [
        4,
        6
      ],
      "coef_nirvp": 0.8
    },
    {
      "nom": "Boutons floraux",
      "mois": [
        "Fev",
        "mar"
      ],
      "duree_sem": [
        2,
        4
      ],
      "coef_nirvp": 0.85
    },
    {
      "nom": "Floraison",
      "mois": [
        "mar",
        "Avr",
        "Mai"
      ],
      "duree_sem": [
        4,
        8
      ],
      "coef_nirvp": 0.9
    },
    {
      "nom": "Nouaison",
      "mois": [
        "Avr",
        "Mai"
      ],
      "duree_sem": [
        4,
        6
      ],
      "coef_nirvp": 0.9
    },
    {
      "nom": "Chute physiologique",
      "mois": [
        "Mai",
        "Juin",
        "Juil"
      ],
      "duree_sem": [
        8,
        12
      ],
      "coef_nirvp": 0.85
    },
    {
      "nom": "Grossissement",
      "mois": [
        "Juin",
        "dec"
      ],
      "duree_mois": [
        5,
        8
      ],
      "coef_nirvp": 1.0
    },
    {
      "nom": "Flush végétatif 2",
      "mois": [
        "Juil",
        "Aout"
      ],
      "duree_sem": [
        4,
        6
      ],
      "coef_nirvp": 1.0
    },
    {
      "nom": "Maturation",
      "mois": "variable_variete",
      "coef_nirvp": 0.85
    }
  ],
  "exigences_climatiques": {
    "temperature_optimale_C": [
      20,
      25
    ],
    "temperature_croissance_C": [
      15,
      30
    ],
    "temperature_stress_chaleur_C": 35,
    "temperature_stress_froid_C": 10,
    "gel_feuilles_hass_C": [
      -2,
      -3
    ],
    "gel_mortel_hass_C": [
      -4,
      -6
    ],
    "gel_race_mexicaine_C": [
      -6,
      -8
    ],
    "gel_race_antillaise_C": [
      0,
      -2
    ],
    "humidite_relative_optimale_pct": [
      60,
      80
    ],
    "humidite_relative_min_pct": 40,
    "pluviometrie_optimale_mm": [
      1200,
      1800
    ]
  },
  "exigences_sol": {
    "pH_optimal": [
      5.5,
      6.5
    ],
    "pH_tolerance": [
      5.0,
      7.5
    ],
    "calcaire_actif_max_pct": 5,
    "CE_sol_optimal_dS_m": 1.5,
    "CE_sol_max_dS_m": 2.5,
    "texture": "sablo_limoneux",
    "drainage": "excellent_obligatoire",
    "profondeur_utile_min_cm": 60,
    "matiere_organique_min_pct": 2,
    "nappe_phreatique_min_cm": 100,
    "note": "TRÈS sensible asphyxie - Phytophthora si mal drainé"
  },
  "options_nutrition": {
    "A": {
      "nom": "Nutrition équilibrée",
      "condition": "analyse_sol < 2 ans ET analyse_eau",
      "description": "Programme complet sol + plante"
    },
    "B": {
      "nom": "Nutrition foliaire prioritaire",
      "condition": "PAS analyse_sol OU > 3 ans",
      "description": "Foliaire renforcé"
    },
    "C": {
      "nom": "Gestion salinité",
      "condition": "CE_eau > 1.5 dS/m OU CE_sol > 2 dS/m",
      "seuil_plus_bas_que_olivier": true,
      "description": "Lessivage + engrais faible index salin"
    }
  },
  "export_kg_tonne": {
    "N": [
      2.5,
      3.5
    ],
    "P2O5": [
      0.5,
      0.8
    ],
    "K2O": [
      4.0,
      5.5
    ],
    "CaO": [
      0.3,
      0.5
    ],
    "MgO": [
      0.4,
      0.6
    ],
    "S": [
      0.2,
      0.3
    ]
  },
  "entretien_kg_ha": {
    "jeune_1-3_ans": {
      "N": [
        30,
        60
      ],
      "P2O5": [
        15,
        30
      ],
      "K2O": [
        20,
        40
      ]
    },
    "entree_prod_4-6_ans": {
      "N": [
        80,
        120
      ],
      "P2O5": [
        30,
        50
      ],
      "K2O": [
        60,
        100
      ]
    },
    "intensif_pleine_prod": {
      "N": [
        150,
        250
      ],
      "P2O5": [
        50,
        80
      ],
      "K2O": [
        150,
        250
      ]
    },
    "super_intensif": {
      "N": [
        200,
        350
      ],
      "P2O5": [
        60,
        100
      ],
      "K2O": [
        200,
        350
      ]
    }
  },
  "fractionnement_pct": {
    "jan_fev": {
      "N": 15,
      "P2O5": 30,
      "K2O": 10,
      "objectif": "Préparer floraison"
    },
    "mar_avr": {
      "N": 20,
      "P2O5": 30,
      "K2O": 15,
      "objectif": "Floraison-nouaison"
    },
    "mai_juin": {
      "N": 20,
      "P2O5": 20,
      "K2O": 20,
      "objectif": "Post-chute"
    },
    "juil_aout": {
      "N": 20,
      "P2O5": 10,
      "K2O": 25,
      "objectif": "Grossissement, flush 2"
    },
    "sept_oct": {
      "N": 15,
      "P2O5": 10,
      "K2O": 20,
      "objectif": "Maturation"
    },
    "nov_dec": {
      "N": 10,
      "P2O5": 0,
      "K2O": 10,
      "objectif": "Reconstitution"
    }
  },
  "formes_engrais": {
    "N_recommande": [
      "nitrate_calcium",
      "nitrate_ammonium",
      "uree_si_pH<7"
    ],
    "N_eviter": [
      "uree_si_pH>7"
    ],
    "P_recommande": [
      "MAP",
      "acide_phosphorique"
    ],
    "P_eviter": [
      "DAP_haute_dose"
    ],
    "K_recommande": [
      "sulfate_potasse"
    ],
    "K_interdit": [
      "chlorure_potasse"
    ],
    "note_KCl": "STRICTEMENT INTERDIT - très sensible au chlore"
  },
  "seuils_foliaires": {
    "periode_prelevement": "Août-Septembre, feuilles 5-7 mois",
    "N": {
      "unite": "%",
      "carence": 1.6,
      "suffisant": [
        1.6,
        1.8
      ],
      "optimal": [
        1.8,
        2.2
      ],
      "exces": 2.5
    },
    "P": {
      "unite": "%",
      "carence": 0.08,
      "suffisant": [
        0.08,
        0.1
      ],
      "optimal": [
        0.1,
        0.25
      ],
      "exces": 0.3
    },
    "K": {
      "unite": "%",
      "carence": 0.75,
      "suffisant": [
        0.75,
        1.0
      ],
      "optimal": [
        1.0,
        2.0
      ],
      "exces": 3.0
    },
    "Ca": {
      "unite": "%",
      "carence": 1.0,
      "suffisant": [
        1.0,
        1.5
      ],
      "optimal": [
        1.5,
        3.0
      ],
      "exces": 4.0
    },
    "Mg": {
      "unite": "%",
      "carence": 0.25,
      "suffisant": [
        0.25,
        0.4
      ],
      "optimal": [
        0.4,
        0.8
      ],
      "exces": 1.0
    },
    "Fe": {
      "unite": "ppm",
      "carence": 50,
      "suffisant": [
        50,
        80
      ],
      "optimal": [
        80,
        200
      ],
      "exces": 300
    },
    "Zn": {
      "unite": "ppm",
      "carence": 30,
      "suffisant": [
        30,
        50
      ],
      "optimal": [
        50,
        100
      ],
      "exces": 200
    },
    "Mn": {
      "unite": "ppm",
      "carence": 25,
      "suffisant": [
        25,
        50
      ],
      "optimal": [
        50,
        200
      ],
      "exces": 500
    },
    "B": {
      "unite": "ppm",
      "carence": 30,
      "suffisant": [
        30,
        50
      ],
      "optimal": [
        50,
        100
      ],
      "exces": 150
    },
    "Cu": {
      "unite": "ppm",
      "carence": 5,
      "suffisant": [
        5,
        10
      ],
      "optimal": [
        10,
        25
      ],
      "exces": 40
    },
    "Cl": {
      "unite": "%",
      "toxique": 0.25
    },
    "Na": {
      "unite": "%",
      "toxique": 0.25
    }
  },
  "seuils_eau_salinite": {
    "CE_tolerance_dS_m": 1.0,
    "CE_problematique_dS_m": 1.5,
    "CE_deconseille_dS_m": 2.0,
    "Cl_tolerance_mg_L": 50,
    "Cl_toxique_mg_L": 100,
    "Na_tolerance_mg_L": 50,
    "Na_toxique_mg_L": 100,
    "B_tolerance_mg_L": 0.5,
    "B_toxique_mg_L": 1.0,
    "SAR_max": 5,
    "note": "2-3× plus sensible que olivier"
  },
  "kc": {
    "jeune_1-3_ans": {
      "jan_fev": 0.5,
      "mar_avr": 0.55,
      "mai_juin": 0.6,
      "juil_aout": 0.65,
      "sept_oct": 0.6,
      "nov_dec": 0.55
    },
    "adulte_plus_6_ans": {
      "jan_fev": 0.7,
      "mar_avr": 0.75,
      "mai_juin": 0.8,
      "juil_aout": 0.85,
      "sept_oct": 0.8,
      "nov_dec": 0.75
    }
  },
  "irrigation": {
    "sensibilite": "elevee_stress_et_exces",
    "note": "Ne tolère ni stress hydrique ni excès eau (Phytophthora)",
    "frequence": "frequente_petites_doses",
    "tensiometre_seuil_sol_leger_cbar": [
      25,
      30
    ],
    "tensiometre_seuil_sol_limoneux_cbar": [
      35,
      40
    ]
  },
  "phytosanitaire": {
    "maladies": [
      {
        "nom": "Phytophthora",
        "agent": "Phytophthora cinnamomi",
        "gravite": "maladie_n1_devastatrice",
        "conditions": "sol_mal_draine_exces_eau_T_20-30",
        "prevention": [
          "drainage_excellent",
          "porte_greffe_tolerant",
          "jamais_saturer_sol"
        ],
        "traitement": {
          "phosphonate_injection": {
            "dose": "20-30 mL/L",
            "frequence": "2-3x/an"
          },
          "phosphonate_foliaire": {
            "dose": "5 mL/L",
            "frequence": "4-6x/an"
          },
          "metalaxyl_sol": {
            "dose": "2-3 g/m²",
            "condition": "infection_active"
          }
        }
      },
      {
        "nom": "Anthracnose",
        "agent": "Colletotrichum gloeosporioides",
        "conditions": "HR_elevee_pluie_T_20-25",
        "traitement": {
          "cuivre": {
            "dose_kg_ha": 2,
            "DAR_jours": 14
          }
        }
      },
      {
        "nom": "Cercospora",
        "agent": "Cercospora purpurea",
        "traitement": {
          "cuivre": {
            "dose_kg_ha": [
              2,
              3
            ],
            "applications": [
              2,
              3
            ]
          }
        }
      }
    ],
    "ravageurs": [
      {
        "nom": "Thrips",
        "periode": "floraison",
        "traitement": "Spinosad 0.2 L/ha"
      },
      {
        "nom": "Acariens",
        "periode": "ete_sec",
        "traitement": "Abamectine 0.5 L/ha"
      },
      {
        "nom": "Cochenilles",
        "periode": "toute_annee",
        "traitement": "Huile blanche 15 L/ha"
      },
      {
        "nom": "Scolytes",
        "condition": "arbres_stresses",
        "traitement": "eliminer_branches"
      }
    ]
  },
  "calendrier_phyto_preventif": {
    "jan_fev": {
      "cible": "Phosphonate préventif",
      "produit": "Phosphonate K",
      "dose": "5 mL/L foliaire"
    },
    "mars": {
      "cible": "Anthracnose floraison",
      "produit": "Cuivre",
      "dose": "2 kg/ha",
      "condition": "si_HR_elevee"
    },
    "avr_mai": {
      "cible": "Thrips",
      "produit": "Spinosad",
      "dose": "0.2 L/ha",
      "condition": "si_presence"
    },
    "juin": {
      "cible": "Phosphonate",
      "produit": "Phosphonate K",
      "mode": "injection_tronc"
    },
    "aout_sept": {
      "cible": "Anthracnose pré-récolte",
      "produit": "Cuivre",
      "dose": "2 kg/ha",
      "DAR": "21j"
    },
    "nov": {
      "cible": "Phosphonate",
      "produit": "Phosphonate K",
      "dose": "5 mL/L foliaire"
    }
  },
  "maturite_recolte": {
    "critere_principal": "matiere_seche_ou_huile",
    "note": "Avocat ne mûrit PAS sur arbre - maturité physiologique",
    "seuils_hass": {
      "matiere_seche_min_pct": 21,
      "huile_min_pct": 8
    },
    "seuils_fuerte": {
      "matiere_seche_min_pct": 19,
      "huile_min_pct": 8
    },
    "methodes": [
      "sechage_etuve",
      "extraction_soxhlet",
      "flottaison",
      "jours_floraison"
    ],
    "conservation_hass": {
      "temperature_C": [
        5,
        7
      ],
      "duree_semaines": [
        2,
        4
      ]
    }
  },
  "alertes": [
    {
      "code": "AVO-01",
      "nom": "Stress hydrique",
      "seuil": "NDMI < P15 (2 passages) + T > 30",
      "priorite": "urgente"
    },
    {
      "code": "AVO-02",
      "nom": "Excès eau / Phytophthora",
      "seuil": "NDMI > P95 + pluie > 50mm/sem",
      "priorite": "urgente"
    },
    {
      "code": "AVO-03",
      "nom": "Risque gel",
      "seuil": "Tmin prévue < 2°C",
      "priorite": "urgente"
    },
    {
      "code": "AVO-04",
      "nom": "Gel avéré",
      "seuil": "Tmin mesurée < 0°C",
      "priorite": "urgente"
    },
    {
      "code": "AVO-05",
      "nom": "Canicule",
      "seuil": "Tmax > 38°C (3j) + HR < 30%",
      "priorite": "prioritaire"
    },
    {
      "code": "AVO-06",
      "nom": "Vent chaud sec",
      "seuil": "T > 35 + HR < 25% + vent > 25 km/h",
      "priorite": "prioritaire"
    },
    {
      "code": "AVO-07",
      "nom": "Conditions Phytophthora",
      "seuil": "Sol saturé > 48h + T 20-28",
      "priorite": "urgente"
    },
    {
      "code": "AVO-08",
      "nom": "Symptômes Phytophthora",
      "seuil": "NIRv ↘ progressif + feuilles pâles",
      "priorite": "urgente"
    },
    {
      "code": "AVO-09",
      "nom": "Risque anthracnose",
      "seuil": "HR > 85% + pluie + T 20-25 (floraison)",
      "priorite": "prioritaire"
    },
    {
      "code": "AVO-10",
      "nom": "Pression thrips",
      "seuil": "Floraison + T 20-28 + captures",
      "priorite": "prioritaire"
    },
    {
      "code": "AVO-11",
      "nom": "Carence Zn probable",
      "seuil": "NDRE < P10 + feuilles petites rondes",
      "priorite": "vigilance"
    },
    {
      "code": "AVO-12",
      "nom": "Carence Fe",
      "seuil": "NDRE < P10 + GCI ↘ + pH sol > 7.5",
      "priorite": "vigilance"
    },
    {
      "code": "AVO-13",
      "nom": "Toxicité Cl/Na",
      "seuil": "Brûlures foliaires + CE sol > 2.5",
      "priorite": "urgente"
    },
    {
      "code": "AVO-14",
      "nom": "Floraison faible",
      "seuil": "Floraison < 50% attendue",
      "priorite": "prioritaire"
    },
    {
      "code": "AVO-15",
      "nom": "Chute excessive",
      "seuil": "Charge < 30% post-nouaison",
      "priorite": "prioritaire"
    },
    {
      "code": "AVO-16",
      "nom": "Maturité récolte",
      "seuil": "MS ≥ 21% (Hass)",
      "priorite": "info"
    },
    {
      "code": "AVO-17",
      "nom": "Année OFF probable",
      "seuil": "N-1 très productif + flush faible",
      "priorite": "prioritaire"
    },
    {
      "code": "AVO-18",
      "nom": "Dépérissement",
      "seuil": "NIRv ↘ > 20% (4 passages)",
      "priorite": "urgente"
    },
    {
      "code": "AVO-19",
      "nom": "Arbre mort",
      "seuil": "NDVI < 0.30 persistant 3 mois",
      "priorite": "urgente"
    },
    {
      "code": "AVO-20",
      "nom": "Croissance excessive",
      "seuil": "NDVI ↗ > 15% + pas de fruits",
      "priorite": "vigilance"
    }
  ],
  "modele_predictif": {
    "difficulte": "plus_difficile_que_olivier",
    "raisons": [
      "Floraison difficile à détecter par satellite",
      "Chute physiologique très variable (80-99%)",
      "Fruit reste longtemps sur arbre"
    ],
    "precision_attendue": {
      "traditionnel": {
        "R2": [
          0.3,
          0.5
        ],
        "MAE_pct": [
          35,
          50
        ]
      },
      "intensif": {
        "R2": [
          0.4,
          0.6
        ],
        "MAE_pct": [
          25,
          40
        ]
      },
      "super_intensif": {
        "R2": [
          0.5,
          0.7
        ],
        "MAE_pct": [
          20,
          35
        ]
      }
    },
    "recommandation": "Comptage fruits sur échantillon reste méthode la plus fiable"
  },
  "biostimulants": {
    "calendrier": {
      "jan": {
        "algues": "3 L/ha",
        "objectif": "Préparer floraison"
      },
      "fev_mar": {
        "algues": "3 L/ha",
        "amines": "4 L/ha foliaire",
        "objectif": "Nouaison critique"
      },
      "avr_mai": {
        "humiques": "4 L/ha",
        "amines": "4 L/ha",
        "objectif": "Limiter chute"
      },
      "juin_juil": {
        "algues": "3 L/ha",
        "objectif": "Stress chaleur"
      },
      "aout_sept": {
        "humiques": "4 L/ha",
        "amines": "4 L/ha",
        "objectif": "Flush 2"
      },
      "nov_dec": {
        "humiques_granule": "20 kg/ha",
        "amines_fertig": "5 L/ha",
        "objectif": "Reconstitution"
      }
    },
    "focus_nouaison": "Période Mars-Mai critique - concentrer biostimulants"
  },
  "plan_annuel_type_intensif_hass_15T": {
    "jan": {
      "NPK": "N25+P15+K15",
      "micro": "Zn foliaire",
      "biostim": "Algues",
      "phyto": "Phosphonate",
      "irrigation_L_sem": 80
    },
    "fev": {
      "NPK": "N25+K15",
      "micro": null,
      "biostim": null,
      "phyto": null,
      "irrigation_L_sem": 100
    },
    "mar": {
      "NPK": "N30+P15+K20",
      "micro": "B floraison",
      "biostim": "Algues+Aminés",
      "phyto": "Cuivre si pluie",
      "irrigation_L_sem": 120
    },
    "avr": {
      "NPK": "N25+K20",
      "micro": "Zn foliaire",
      "biostim": "Aminés",
      "phyto": null,
      "irrigation_L_sem": 150
    },
    "mai": {
      "NPK": "N25+P10+K25",
      "micro": null,
      "biostim": null,
      "phyto": "Spinosad si thrips",
      "irrigation_L_sem": 170
    },
    "juin": {
      "NPK": "N25+K30",
      "micro": "Fe-EDDHA",
      "biostim": "Humiques",
      "phyto": "Phosphonate injection",
      "irrigation_L_sem": 200
    },
    "juil": {
      "NPK": "N20+K30",
      "micro": "Zn foliaire",
      "biostim": null,
      "phyto": null,
      "irrigation_L_sem": 200
    },
    "aout": {
      "NPK": "N20+P10+K25",
      "micro": null,
      "biostim": "Algues",
      "phyto": null,
      "irrigation_L_sem": 180
    },
    "sept": {
      "NPK": "N15+K20",
      "micro": "Zn+Mn",
      "biostim": "Aminés",
      "phyto": "Cuivre pré-récolte",
      "irrigation_L_sem": 150
    },
    "oct": {
      "NPK": "N15+K15",
      "micro": null,
      "biostim": null,
      "phyto": null,
      "irrigation_L_sem": 120
    },
    "nov": {
      "NPK": "N10+K10",
      "micro": null,
      "biostim": "Humiques",
      "phyto": "Phosphonate foliaire",
      "irrigation_L_sem": 80
    },
    "dec": {
      "NPK": "N10",
      "micro": null,
      "biostim": "Aminés",
      "phyto": null,
      "irrigation_L_sem": 60
    }
  },
  "protocole_phenologique": {
    "phases_par_maturite": {
      "juvenile": [
        "repos",
        "debourrement",
        "croissance",
        "floraison",
        "post_recolte"
      ],
      "entree_production": null,
      "pleine_production": null,
      "senescence": null
    },
    "phases": {
      "_note": "Machine à états sur l'historique. Chaque phase a conditions entrée et sortie structurées. GDD calculé depuis referentiel.gdd.",
      "calculs_preliminaires": {
        "GDD_jour": "max(0, (min(Tmax, Tplafond) + max(Tmin, Tbase)) / 2 - Tbase)",
        "NIRvP_norm": "(NIRvP - NIRvP_min_hist) / (NIRvP_max_hist - NIRvP_min_hist)",
        "dNDVI_dt": "(NDVI(t) - NDVI(t-1)) / jours_entre_acquisitions",
        "dNIRv_dt": "(NIRv(t) - NIRv(t-1)) / jours_entre_acquisitions",
        "Perte_NDVI": "(NDVI_pic_cycle - NDVI_actuel) / NDVI_pic_cycle",
        "Perte_NIRv": "(NIRv_pic_cycle - NIRv_actuel) / NIRv_pic_cycle",
        "Ratio_decouplage": "Perte_NIRv / max(Perte_NDVI, 0.01)"
      },
      "DORMANCE": {
        "nom": "Dormance hivernale",
        "skip_when": {
          "var": "Tmoy_Q25",
          "gte": 15
        },
        "entry": {
          "when": {
            "and": [
              {
                "var": "Tmoy",
                "lt_var": "Tmoy_Q25"
              },
              {
                "var": "NIRv_norm",
                "lte": 0.15
              }
            ]
          }
        },
        "exit": [
          {
            "target": "DEBOURREMENT",
            "when": {
              "and": [
                {
                  "var": "chill_satisfied",
                  "eq": true
                },
                {
                  "var": "warm_streak",
                  "gte": 10
                }
              ]
            },
            "on_enter": {
              "reset": [
                "GDD_cumul"
              ]
            },
            "confidence": "MODEREE"
          }
        ]
      },
      "DEBOURREMENT": {
        "nom": "Débourrement",
        "entry": {},
        "exit": [
          {
            "target": "FLORAISON",
            "when": {
              "and": [
                {
                  "var": "GDD_cumul",
                  "gte": 350
                },
                {
                  "var": "Tmoy",
                  "gte": 18
                }
              ]
            },
            "confidence": "MODEREE"
          }
        ]
      },
      "FLORAISON": {
        "nom": "Floraison",
        "entry": {},
        "exit": [
          {
            "target": "NOUAISON",
            "when": {
              "or": [
                {
                  "var": "GDD_cumul",
                  "gt": 700
                },
                {
                  "var": "hot_streak",
                  "gte": 5
                }
              ]
            },
            "confidence": "MODEREE"
          }
        ]
      },
      "NOUAISON": {
        "nom": "Nouaison / Clarification",
        "entry": {},
        "exit": [
          {
            "target": "STRESS_ESTIVAL",
            "when": {
              "var": "hot_dry_streak",
              "gte": 3
            },
            "confidence": "ELEVEE"
          }
        ]
      },
      "STRESS_ESTIVAL": {
        "nom": "Stress estival + Maturation",
        "entry": {},
        "exit": [
          {
            "target": "REPRISE_AUTOMNALE",
            "when": {
              "and": [
                {
                  "var": "precip_30j",
                  "gt": 20
                },
                {
                  "var": "Tmoy",
                  "lt": 25
                },
                {
                  "var": "d_nirv_dt",
                  "gt": 0
                }
              ]
            },
            "confidence": "MODEREE"
          },
          {
            "target": "DORMANCE",
            "when": {
              "var": "cold_streak",
              "gte": 10
            },
            "confidence": "ELEVEE"
          }
        ]
      },
      "REPRISE_AUTOMNALE": {
        "nom": "Reprise automnale",
        "entry": {},
        "exit": [
          {
            "target": "DORMANCE",
            "when": {
              "var": "cold_streak",
              "gte": 10
            },
            "on_enter": {
              "reset": [
                "GDD_cumul"
              ]
            },
            "confidence": "ELEVEE"
          }
        ]
      }
    }
  },
  "stades_bbch": [
    {
      "code": "00",
      "nom": "Repos végétatif",
      "mois": [
        "dec",
        "jan"
      ],
      "gdd_cumul": [
        0,
        100
      ],
      "coef_nirvp": 0.3,
      "phase_kc": "repos"
    },
    {
      "code": "01",
      "nom": "Gonflement bourgeons",
      "mois": [
        "jan",
        "feb"
      ],
      "gdd_cumul": [
        100,
        250
      ],
      "coef_nirvp": 0.3,
      "phase_kc": "debourrement"
    },
    {
      "code": "09",
      "nom": "Débourrement",
      "mois": [
        "feb",
        "mar"
      ],
      "gdd_cumul": [
        250,
        450
      ],
      "coef_nirvp": 0.4,
      "phase_kc": "debourrement"
    },
    {
      "code": "15",
      "nom": "Pousse végétative",
      "mois": [
        "mar"
      ],
      "gdd_cumul": [
        450,
        700
      ],
      "coef_nirvp": 0.5,
      "phase_kc": "croissance"
    },
    {
      "code": "51",
      "nom": "Inflorescences visibles",
      "mois": [
        "mar",
        "apr"
      ],
      "gdd_cumul": [
        700,
        1000
      ],
      "coef_nirvp": 0.6,
      "phase_kc": "floraison"
    },
    {
      "code": "60",
      "nom": "Début floraison",
      "mois": [
        "apr"
      ],
      "gdd_cumul": [
        1000,
        1300
      ],
      "coef_nirvp": 0.7,
      "phase_kc": "floraison"
    },
    {
      "code": "65",
      "nom": "Pleine floraison",
      "mois": [
        "apr",
        "may"
      ],
      "gdd_cumul": [
        1300,
        1600
      ],
      "coef_nirvp": 0.8,
      "phase_kc": "floraison"
    },
    {
      "code": "69",
      "nom": "Nouaison",
      "mois": [
        "may",
        "jun"
      ],
      "gdd_cumul": [
        1600,
        2000
      ],
      "coef_nirvp": 0.9,
      "phase_kc": "nouaison"
    },
    {
      "code": "75",
      "nom": "Grossissement fruit",
      "mois": [
        "jun",
        "aug"
      ],
      "gdd_cumul": [
        2000,
        3000
      ],
      "coef_nirvp": 1.0,
      "phase_kc": "grossissement"
    },
    {
      "code": "79",
      "nom": "Fruit taille finale",
      "mois": [
        "aug",
        "oct"
      ],
      "gdd_cumul": [
        3000,
        4000
      ],
      "coef_nirvp": 1.0,
      "phase_kc": "grossissement"
    },
    {
      "code": "85",
      "nom": "Maturation",
      "mois": [
        "oct",
        "nov"
      ],
      "gdd_cumul": [
        4000,
        4800
      ],
      "coef_nirvp": 0.9,
      "phase_kc": "maturation"
    },
    {
      "code": "89",
      "nom": "Maturité récolte",
      "mois": [
        "nov",
        "dec"
      ],
      "gdd_cumul": [
        4800,
        5500
      ],
      "coef_nirvp": 0.7,
      "phase_kc": "maturation"
    },
    {
      "code": "92",
      "nom": "Post-récolte",
      "mois": [
        "dec",
        "jan"
      ],
      "gdd_cumul": [
        5500,
        5800
      ],
      "coef_nirvp": 0.4,
      "phase_kc": "post_recolte"
    }
  ],
  "signaux": {
    "streaks": {
      "warm_streak": {
        "var": "Tmoy",
        "gt_var": "Tmoy_Q25"
      },
      "cold_streak": {
        "var": "Tmoy",
        "lt_var": "Tmoy_Q25"
      },
      "hot_streak": {
        "var": "Tmoy",
        "gt": 25
      },
      "hot_dry_streak": {
        "and": [
          {
            "var": "Tmax",
            "gt": 30
          },
          {
            "var": "precip_30j",
            "lt": 5
          }
        ]
      }
    }
  }
}
$crop_ai_ref_avocatier$::jsonb
)
ON CONFLICT (crop_type) DO UPDATE SET
  version = EXCLUDED.version,
  reference_data = EXCLUDED.reference_data,
  updated_at = NOW();

INSERT INTO public.crop_ai_references (crop_type, version, reference_data)
VALUES (
  'olivier',
  '5.0',
  $crop_ai_ref_olivier${
  "metadata": {
    "version": "5.0",
    "date": "2026-03",
    "culture": "olivier",
    "pays": "Maroc",
    "usage": "LLM_direct_read — no parser needed",
    "conventions": {
      "mois": "Lowercase English 3-letter: jan feb mar apr may jun jul aug sep oct nov dec",
      "ranges": "Always [min, max] arrays — never single number when a range exists",
      "doses": "Always {value: number, unit: string} — never freetext",
      "conditions": "Always list of {field, operator, value} objects",
      "nulls": "null = not applicable. Use 0 only for a real zero value.",
      "phases_maturite": "phases_maturite_ans maps phase id -> [min_age, max_age) in years. rendement_kg_arbre uses the same phase ids as keys (juvenile, entree_production, pleine_production, maturite_avancee, senescence) with [min_kg, max_kg] per tree."
    }
  },
  "phenological_stages": [
    {
      "key": "dormancy",
      "name_fr": "Dormance",
      "name_en": "Dormancy",
      "name_ar": "السكون",
      "months": [11, 12, 1, 2],
      "thresholds": [
        { "key": "chill_hours", "label_fr": "Heures de froid", "label_en": "Chill hours", "compare": "below", "value": 7.2, "unit": "h", "icon": "snowflake" },
        { "key": "frost_risk", "label_fr": "Risque de gel", "label_en": "Frost risk", "compare": "below", "value": 0, "unit": "h", "icon": "snowflake" }
      ]
    },
    {
      "key": "flowering",
      "name_fr": "Floraison",
      "name_en": "Flowering",
      "name_ar": "الإزهار",
      "months": [3, 4, 5],
      "thresholds": [
        { "key": "optimal_flowering", "label_fr": "Conditions optimales", "label_en": "Optimal conditions", "compare": "between", "value": 15, "upper": 25, "unit": "h", "icon": "leaf" },
        { "key": "heat_stress", "label_fr": "Stress thermique", "label_en": "Heat stress", "compare": "above", "value": 35, "unit": "h", "icon": "flame" }
      ]
    },
    {
      "key": "fruit_development",
      "name_fr": "Développement des fruits",
      "name_en": "Fruit development",
      "name_ar": "نمو الثمار",
      "months": [6, 7, 8, 9],
      "thresholds": [
        { "key": "growing_hours", "label_fr": "Heures de croissance", "label_en": "Growing hours", "compare": "above", "value": 10, "unit": "h", "icon": "sun" },
        { "key": "extreme_heat", "label_fr": "Chaleur extrême", "label_en": "Extreme heat", "compare": "above", "value": 40, "unit": "h", "icon": "flame" }
      ]
    }
  ],
  "phases_maturite_ans": {
    "juvenile": [
      0,
      5
    ],
    "entree_production": [
      5,
      10
    ],
    "pleine_production": [
      10,
      40
    ],
    "maturite_avancee": [
      40,
      60
    ],
    "senescence": [
      60,
      200
    ]
  },
  "seuils_meteo": {
    "gel": {
      "threshold_c": -2.0,
      "detection_months": [
        3,
        4,
        5
      ],
      "severity": "high"
    },
    "canicule": {
      "tmax_c": 38.0,
      "consecutive_days": 3,
      "severity": "high"
    },
    "vent_chaud": {
      "temperature_c": 38.0,
      "wind_kmh": 60.0,
      "humidity_max_pct": 25.0,
      "severity": "medium"
    },
    "secheresse": {
      "rain_mm_max_per_day": 5.0,
      "dry_season_days": 60,
      "transition_days": 30,
      "rainy_season_days": 20,
      "severity": "medium"
    }
  },
  "capacites_calibrage": {
    "supported": true,
    "phenology_mode": "state_machine",
    "subtypes": {
      "traditionnel": {
        "required_indices": [
          "NDVI",
          "NIRv",
          "NDMI",
          "NDRE",
          "EVI",
          "MSAVI",
          "MSI",
          "GCI"
        ]
      },
      "intensif": {
        "required_indices": [
          "NDVI",
          "NIRv",
          "NDMI",
          "NDRE",
          "EVI",
          "MSAVI",
          "MSI",
          "GCI"
        ]
      },
      "super_intensif": {
        "required_indices": [
          "NDVI",
          "NIRv",
          "NDMI",
          "NDRE",
          "EVI",
          "MSAVI",
          "MSI",
          "GCI"
        ]
      }
    },
    "min_observed_images": 10,
    "min_history_days": 120,
    "min_history_months_for_period_percentiles": 24,
    "required_indices": [
      "NDVI",
      "NIRv",
      "NDMI",
      "NDRE",
      "EVI",
      "MSAVI",
      "MSI",
      "GCI"
    ]
  },
  "varietes": [
    {
      "code": "PM",
      "nom": "Picholine Marocaine",
      "origine": "Maroc",
      "usage": "double_fin",
      "fruit_g": [
        3.5,
        5.0
      ],
      "huile_pct": [
        16,
        20
      ],
      "alternance_index": 0.35,
      "systemes_compatibles": [
        "traditionnel",
        "intensif"
      ],
      "sensibilites": {
        "oeil_paon": "sensible",
        "verticilliose": "sensible",
        "froid_min_c": -10,
        "salinite": "moderee",
        "secheresse": "bonne"
      },
      "heures_froid_requises": [
        100,
        200
      ],
      "duree_vie_economique_ans": null,
      "rendement_kg_arbre": {
        "juvenile": [
          2,
          5
        ],
        "entree_production": [
          10,
          25
        ],
        "pleine_production": [
          30,
          50
        ],
        "maturite_avancee": [
          40,
          70
        ],
        "senescence": [
          30,
          50
        ]
      }
    },
    {
      "code": "HAO",
      "nom": "Haouzia",
      "origine": "INRA Maroc",
      "usage": "double_fin",
      "fruit_g": [
        3.5,
        4.5
      ],
      "huile_pct": [
        22,
        24
      ],
      "alternance_index": 0.22,
      "systemes_compatibles": [
        "traditionnel",
        "intensif"
      ],
      "sensibilites": {
        "oeil_paon": "resistante",
        "verticilliose": "sensible",
        "froid_min_c": -8,
        "salinite": "bonne",
        "secheresse": "tres_bonne"
      },
      "heures_froid_requises": [
        100,
        150
      ],
      "duree_vie_economique_ans": null,
      "rendement_kg_arbre": {
        "juvenile": [
          3,
          8
        ],
        "entree_production": [
          15,
          35
        ],
        "pleine_production": [
          40,
          60
        ],
        "maturite_avancee": [
          50,
          80
        ],
        "senescence": [
          40,
          60
        ]
      }
    },
    {
      "code": "MEN",
      "nom": "Menara",
      "origine": "INRA Maroc",
      "usage": "double_fin",
      "fruit_g": [
        2.5,
        4.0
      ],
      "huile_pct": [
        23,
        24
      ],
      "alternance_index": 0.28,
      "systemes_compatibles": [
        "traditionnel",
        "intensif"
      ],
      "sensibilites": {
        "oeil_paon": "resistante",
        "verticilliose": "sensible",
        "froid_min_c": -8,
        "salinite": "bonne",
        "secheresse": "tres_bonne"
      },
      "heures_froid_requises": [
        100,
        150
      ],
      "duree_vie_economique_ans": null,
      "rendement_kg_arbre": {
        "juvenile": [
          5,
          12
        ],
        "entree_production": [
          25,
          45
        ],
        "pleine_production": [
          45,
          65
        ],
        "maturite_avancee": [
          50,
          70
        ],
        "senescence": [
          40,
          55
        ]
      }
    },
    {
      "code": "ARB",
      "nom": "Arbequina",
      "origine": "Espagne",
      "usage": "huile",
      "fruit_g": [
        1.2,
        1.8
      ],
      "huile_pct": [
        16,
        20
      ],
      "alternance_index": 0.35,
      "systemes_compatibles": [
        "super_intensif"
      ],
      "sensibilites": {
        "oeil_paon": "moyenne",
        "verticilliose": "moyenne",
        "froid_min_c": -5,
        "salinite": "moyenne",
        "secheresse": "moyenne"
      },
      "heures_froid_requises": [
        200,
        400
      ],
      "duree_vie_economique_ans": 15,
      "rendement_kg_arbre": {
        "juvenile": [
          3,
          6
        ],
        "entree_production": [
          6,
          10
        ],
        "pleine_production": [
          8,
          12
        ],
        "maturite_avancee": null,
        "senescence": null
      },
      "note_rendement": "Declin economique apres 15 ans — arrachage recommande"
    },
    {
      "code": "ARS",
      "nom": "Arbosana",
      "origine": "Espagne",
      "usage": "huile",
      "fruit_g": [
        1.5,
        2.5
      ],
      "huile_pct": [
        19,
        21
      ],
      "alternance_index": 0.18,
      "systemes_compatibles": [
        "super_intensif"
      ],
      "sensibilites": {
        "oeil_paon": "tres_resistante",
        "verticilliose": "bonne",
        "froid_min_c": -5,
        "salinite": "moyenne",
        "secheresse": "moyenne"
      },
      "heures_froid_requises": [
        200,
        350
      ],
      "duree_vie_economique_ans": 18,
      "rendement_kg_arbre": {
        "juvenile": [
          4,
          7
        ],
        "entree_production": [
          7,
          12
        ],
        "pleine_production": [
          10,
          15
        ],
        "maturite_avancee": null,
        "senescence": null
      },
      "note_rendement": "Declin economique apres 18 ans — arrachage recommande"
    },
    {
      "code": "KOR",
      "nom": "Koroneiki",
      "origine": "Grece",
      "usage": "huile",
      "fruit_g": [
        0.8,
        1.5
      ],
      "huile_pct": [
        20,
        25
      ],
      "alternance_index": 0.15,
      "systemes_compatibles": [
        "super_intensif"
      ],
      "sensibilites": {
        "oeil_paon": "moyenne",
        "verticilliose": "moyenne",
        "froid_min_c": -5,
        "salinite": "bonne",
        "secheresse": "bonne"
      },
      "heures_froid_requises": [
        150,
        300
      ],
      "duree_vie_economique_ans": 18,
      "rendement_kg_arbre": {
        "juvenile": [
          3,
          5
        ],
        "entree_production": [
          5,
          9
        ],
        "pleine_production": [
          7,
          11
        ],
        "maturite_avancee": null,
        "senescence": null
      },
      "note_rendement": "Declin economique apres 18 ans — arrachage recommande"
    },
    {
      "code": "PIC",
      "nom": "Picual",
      "origine": "Espagne",
      "usage": "huile",
      "fruit_g": [
        3.0,
        4.5
      ],
      "huile_pct": [
        22,
        27
      ],
      "alternance_index": 0.3,
      "systemes_compatibles": [
        "intensif"
      ],
      "sensibilites": {
        "oeil_paon": "sensible",
        "verticilliose": "tres_sensible",
        "froid_min_c": -10,
        "salinite": "moyenne",
        "secheresse": "bonne"
      },
      "heures_froid_requises": [
        400,
        600
      ],
      "duree_vie_economique_ans": null,
      "rendement_kg_arbre": {
        "juvenile": [
          5,
          12
        ],
        "entree_production": [
          25,
          45
        ],
        "pleine_production": [
          40,
          60
        ],
        "maturite_avancee": [
          45,
          65
        ],
        "senescence": [
          35,
          50
        ]
      }
    }
  ],
  "systemes": {
    "traditionnel": {
      "nom": "Traditionnel (Pluvial)",
      "densite_arbres_ha": [
        80,
        200
      ],
      "surface_arbre_m2": [
        50,
        125
      ],
      "ecartement": {
        "min": {
          "rang_m": 8.0,
          "arbre_m": 8.0
        },
        "max": {
          "rang_m": 12.0,
          "arbre_m": 12.0
        }
      },
      "irrigation": "aucune",
      "recolte": "manuelle_gaulage",
      "entree_production_annee": [
        5,
        7
      ],
      "pleine_production_annee": [
        12,
        20
      ],
      "duree_vie_economique_ans": [
        80,
        100
      ],
      "rendement_pleine_prod_t_ha": [
        1,
        4
      ],
      "sol_visible_pct": [
        60,
        80
      ],
      "indice_cle": "MSAVI2",
      "indice_satellite_cle": "MSAVI"
    },
    "intensif": {
      "nom": "Intensif (Irrigue)",
      "densite_arbres_ha": [
        200,
        600
      ],
      "surface_arbre_m2": [
        17,
        50
      ],
      "ecartement": {
        "min": {
          "rang_m": 6.0,
          "arbre_m": 5.0
        },
        "max": {
          "rang_m": 7.0,
          "arbre_m": 7.0
        }
      },
      "irrigation": "goutte_a_goutte",
      "recolte": "vibreur_tronc",
      "entree_production_annee": [
        4,
        5
      ],
      "pleine_production_annee": [
        7,
        10
      ],
      "duree_vie_economique_ans": [
        50,
        80
      ],
      "rendement_pleine_prod_t_ha": [
        6,
        12
      ],
      "sol_visible_pct": [
        40,
        60
      ],
      "indice_cle": "NIRv",
      "indice_satellite_cle": "NIRv"
    },
    "super_intensif": {
      "nom": "Super-intensif (Haie)",
      "densite_arbres_ha": [
        1200,
        2000
      ],
      "surface_arbre_m2": [
        2,
        5
      ],
      "ecartement": {
        "min": {
          "rang_m": 3.75,
          "arbre_m": 1.35
        },
        "max": {
          "rang_m": 4.0,
          "arbre_m": 1.5
        }
      },
      "irrigation": "goutte_a_goutte_obligatoire",
      "recolte": "enjambeur_mecanique",
      "entree_production_annee": [
        2,
        3
      ],
      "pleine_production_annee": [
        4,
        6
      ],
      "duree_vie_economique_ans": [
        15,
        20
      ],
      "rendement_pleine_prod_t_ha": [
        10,
        20
      ],
      "sol_visible_pct": [
        20,
        40
      ],
      "indice_cle": "NDVI",
      "indice_satellite_cle": "NDVI"
    }
  },
  "seuils_satellite": {
    "traditionnel": {
      "NDVI": {
        "optimal": [
          0.3,
          0.5
        ],
        "vigilance": 0.25,
        "alerte": 0.2
      },
      "NIRv": {
        "optimal": [
          0.05,
          0.15
        ],
        "vigilance": 0.04,
        "alerte": 0.03
      },
      "NDMI": {
        "optimal": [
          0.05,
          0.2
        ],
        "vigilance": 0.04,
        "alerte": 0.03
      },
      "NDRE": {
        "optimal": [
          0.1,
          0.25
        ],
        "vigilance": 0.08,
        "alerte": 0.07
      },
      "MSI": {
        "optimal": [
          0.8,
          1.5
        ],
        "vigilance": 1.8,
        "alerte": 2.0
      }
    },
    "intensif": {
      "NDVI": {
        "optimal": [
          0.4,
          0.6
        ],
        "vigilance": 0.35,
        "alerte": 0.3
      },
      "NIRv": {
        "optimal": [
          0.08,
          0.22
        ],
        "vigilance": 0.07,
        "alerte": 0.06
      },
      "NDMI": {
        "optimal": [
          0.1,
          0.3
        ],
        "vigilance": 0.08,
        "alerte": 0.06
      },
      "NDRE": {
        "optimal": [
          0.15,
          0.3
        ],
        "vigilance": 0.12,
        "alerte": 0.1
      },
      "MSI": {
        "optimal": [
          0.6,
          1.2
        ],
        "vigilance": 1.4,
        "alerte": 1.6
      }
    },
    "super_intensif": {
      "NDVI": {
        "optimal": [
          0.55,
          0.75
        ],
        "vigilance": 0.5,
        "alerte": 0.45
      },
      "NIRv": {
        "optimal": [
          0.15,
          0.35
        ],
        "vigilance": 0.12,
        "alerte": 0.1
      },
      "NDMI": {
        "optimal": [
          0.2,
          0.4
        ],
        "vigilance": 0.15,
        "alerte": 0.12
      },
      "NDRE": {
        "optimal": [
          0.2,
          0.38
        ],
        "vigilance": 0.17,
        "alerte": 0.15
      },
      "MSI": {
        "optimal": [
          0.4,
          0.9
        ],
        "vigilance": 1.1,
        "alerte": 1.3
      }
    }
  },
  "stades_bbch": [
    {
      "code": "00",
      "nom": "Dormance",
      "mois": [
        "dec",
        "jan"
      ],
      "gdd_cumul": [
        0,
        30
      ],
      "coef_nirvp": 0.3,
      "phase_kc": "repos"
    },
    {
      "code": "01",
      "nom": "Debut gonflement",
      "mois": [
        "feb"
      ],
      "gdd_cumul": [
        30,
        80
      ],
      "coef_nirvp": 0.3,
      "phase_kc": "debourrement"
    },
    {
      "code": "09",
      "nom": "Feuilles emergentes",
      "mois": [
        "feb",
        "mar"
      ],
      "gdd_cumul": [
        80,
        200
      ],
      "coef_nirvp": 0.4,
      "phase_kc": "debourrement"
    },
    {
      "code": "15",
      "nom": "5 paires feuilles",
      "mois": [
        "mar",
        "apr"
      ],
      "gdd_cumul": [
        200,
        400
      ],
      "coef_nirvp": 0.6,
      "phase_kc": "croissance"
    },
    {
      "code": "37",
      "nom": "Allongement avance",
      "mois": [
        "apr"
      ],
      "gdd_cumul": [
        400,
        500
      ],
      "coef_nirvp": 0.6,
      "phase_kc": "croissance"
    },
    {
      "code": "51",
      "nom": "Boutons floraux",
      "mois": [
        "apr",
        "may"
      ],
      "gdd_cumul": [
        500,
        600
      ],
      "coef_nirvp": 0.8,
      "phase_kc": "floraison"
    },
    {
      "code": "55",
      "nom": "Boutons separes",
      "mois": [
        "may"
      ],
      "gdd_cumul": [
        600,
        700
      ],
      "coef_nirvp": 0.9,
      "phase_kc": "floraison"
    },
    {
      "code": "60",
      "nom": "Debut floraison",
      "mois": [
        "may"
      ],
      "gdd_cumul": [
        800,
        900
      ],
      "coef_nirvp": 1.0,
      "phase_kc": "floraison"
    },
    {
      "code": "65",
      "nom": "Pleine floraison",
      "mois": [
        "may"
      ],
      "gdd_cumul": [
        900,
        1000
      ],
      "coef_nirvp": 1.0,
      "phase_kc": "floraison"
    },
    {
      "code": "69",
      "nom": "Nouaison",
      "mois": [
        "jun"
      ],
      "gdd_cumul": [
        1100,
        1200
      ],
      "coef_nirvp": 1.0,
      "phase_kc": "nouaison"
    },
    {
      "code": "75",
      "nom": "Fruit 50pct taille",
      "mois": [
        "jul"
      ],
      "gdd_cumul": [
        1400,
        1800
      ],
      "coef_nirvp": 1.0,
      "phase_kc": "grossissement"
    },
    {
      "code": "79",
      "nom": "Fruit taille finale",
      "mois": [
        "aug",
        "sep"
      ],
      "gdd_cumul": [
        1800,
        2200
      ],
      "coef_nirvp": 0.9,
      "phase_kc": "grossissement"
    },
    {
      "code": "85",
      "nom": "Veraison avancee",
      "mois": [
        "oct"
      ],
      "gdd_cumul": [
        2400,
        2600
      ],
      "coef_nirvp": 0.8,
      "phase_kc": "maturation"
    },
    {
      "code": "89",
      "nom": "Maturite recolte",
      "mois": [
        "oct",
        "nov"
      ],
      "gdd_cumul": [
        2600,
        2800
      ],
      "coef_nirvp": 0.7,
      "phase_kc": "maturation"
    },
    {
      "code": "92",
      "nom": "Post-recolte",
      "mois": [
        "nov",
        "dec"
      ],
      "gdd_cumul": [
        2800,
        3000
      ],
      "coef_nirvp": 0.4,
      "phase_kc": "post_recolte"
    }
  ],
  "kc": {
    "traditionnel": {
      "repos": 0.4,
      "debourrement": 0.45,
      "croissance": 0.5,
      "floraison": 0.55,
      "nouaison": 0.6,
      "grossissement": 0.65,
      "maturation": 0.55,
      "post_recolte": 0.45
    },
    "intensif": {
      "repos": 0.5,
      "debourrement": 0.55,
      "croissance": 0.6,
      "floraison": 0.65,
      "nouaison": 0.75,
      "grossissement": 0.8,
      "maturation": 0.65,
      "post_recolte": 0.55
    },
    "super_intensif": {
      "repos": 0.55,
      "debourrement": 0.6,
      "croissance": 0.65,
      "floraison": 0.7,
      "nouaison": 0.8,
      "grossissement": 0.9,
      "maturation": 0.7,
      "post_recolte": 0.6
    }
  },
  "options_nutrition": {
    "A": {
      "nom": "Nutrition equilibree",
      "conditions_requises": [
        {
          "champ": "analyse_sol_age_ans",
          "operateur": "<=",
          "valeur": 2
        },
        {
          "champ": "analyse_eau_disponible",
          "operateur": "==",
          "valeur": true
        }
      ],
      "fertigation_pct": 100,
      "foliaire": "si_carence_detectee",
      "biostimulants_pct": {
        "humiques": 100,
        "fulviques": 100,
        "amines": 100,
        "algues": 100
      },
      "description": "Programme complet sol + plante"
    },
    "B": {
      "nom": "Nutrition foliaire prioritaire",
      "conditions_requises": [
        {
          "champ": "analyse_sol_disponible",
          "operateur": "==",
          "valeur": false
        },
        {
          "OU": {
            "champ": "analyse_sol_age_ans",
            "operateur": ">",
            "valeur": 3
          }
        }
      ],
      "fertigation_pct": 70,
      "foliaire": "programme_renforce",
      "biostimulants_pct": {
        "humiques": 60,
        "fulviques": 60,
        "amines": 150,
        "algues": 100
      },
      "description": "Focus foliaire, fertigation reduite"
    },
    "C": {
      "nom": "Gestion salinite",
      "conditions_requises": [
        {
          "champ": "CE_eau_dS_m",
          "operateur": ">",
          "valeur": 2.5
        },
        {
          "OU": {
            "champ": "CE_sol_dS_m",
            "operateur": ">",
            "valeur": 3.0
          }
        }
      ],
      "fertigation": "engrais_faible_index_salin",
      "foliaire": "standard",
      "biostimulants_pct": {
        "humiques": 100,
        "fulviques": 100,
        "amines": 120,
        "algues": 150
      },
      "lessivage": true,
      "acidification_si": {
        "champ": "pH",
        "operateur": ">",
        "valeur": 7.5,
        "ET": {
          "champ": "HCO3_mg_L",
          "operateur": ">",
          "valeur": 500
        }
      },
      "gypse_si": {
        "champ": "SAR",
        "operateur": ">",
        "valeur": 6
      },
      "description": "Programme adapte eau/sol salin"
    }
  },
  "export_npk_kg_par_tonne_fruit": {
    "N": {
      "valeur": 3.5,
      "unite": "kg/t_fruit"
    },
    "P2O5": {
      "valeur": 1.2,
      "unite": "kg/t_fruit"
    },
    "K2O": {
      "valeur": 6.0,
      "unite": "kg/t_fruit"
    },
    "CaO": {
      "valeur": 1.5,
      "unite": "kg/t_fruit"
    },
    "MgO": {
      "valeur": 2.5,
      "unite": "kg/t_fruit"
    },
    "S": {
      "valeur": 0.4,
      "unite": "kg/t_fruit"
    }
  },
  "entretien_kg_ha": {
    "traditionnel": {
      "N": [
        15,
        25
      ],
      "K2O": [
        15,
        25
      ],
      "P2O5": [
        10,
        15
      ]
    },
    "intensif": {
      "N": [
        35,
        50
      ],
      "K2O": [
        35,
        50
      ],
      "P2O5": [
        15,
        25
      ]
    },
    "super_intensif": {
      "N": [
        50,
        70
      ],
      "K2O": [
        50,
        70
      ],
      "P2O5": [
        20,
        30
      ]
    }
  },
  "fractionnement_pct": [
    {
      "mois": [
        "feb",
        "mar"
      ],
      "stade_bbch": [
        "01",
        "15"
      ],
      "N_pct": 25,
      "P2O5_pct": 100,
      "K2O_pct": 15
    },
    {
      "mois": [
        "apr"
      ],
      "stade_bbch": [
        "31",
        "51"
      ],
      "N_pct": 25,
      "P2O5_pct": 0,
      "K2O_pct": 15
    },
    {
      "mois": [
        "may"
      ],
      "stade_bbch": [
        "55",
        "65"
      ],
      "N_pct": 15,
      "P2O5_pct": 0,
      "K2O_pct": 20
    },
    {
      "mois": [
        "jun"
      ],
      "stade_bbch": [
        "67",
        "71"
      ],
      "N_pct": 15,
      "P2O5_pct": 0,
      "K2O_pct": 25
    },
    {
      "mois": [
        "jul",
        "aug"
      ],
      "stade_bbch": [
        "75",
        "79"
      ],
      "N_pct": 10,
      "P2O5_pct": 0,
      "K2O_pct": 20
    },
    {
      "mois": [
        "sep"
      ],
      "stade_bbch": [
        "81",
        "85"
      ],
      "N_pct": 5,
      "P2O5_pct": 0,
      "K2O_pct": 5
    },
    {
      "mois": [
        "oct",
        "nov"
      ],
      "stade_bbch": [
        "89",
        "92"
      ],
      "N_pct": 5,
      "P2O5_pct": 0,
      "K2O_pct": 0
    }
  ],
  "ajustement_alternance": {
    "annee_ON": {
      "N": 1.15,
      "P": 1.0,
      "K": 1.2,
      "Mg": 1.0
    },
    "annee_OFF_sain": {
      "N": 0.75,
      "P": 1.2,
      "K": 0.8,
      "Mg": 1.25
    },
    "epuisement": {
      "N": 0.85,
      "P": 1.3,
      "K": 0.7,
      "Mg": 1.4
    }
  },
  "ajustement_cible": {
    "huile_qualite": {
      "N": 1.0,
      "K": 1.0,
      "IM_cible": [
        2.0,
        3.5
      ]
    },
    "olive_table": {
      "N": 1.1,
      "K": 1.2,
      "IM_cible": [
        1.0,
        2.0
      ]
    },
    "mixte": {
      "N": 1.0,
      "K": 1.1,
      "IM_cible": [
        2.5,
        3.5
      ]
    }
  },
  "seuils_foliaires": {
    "N": {
      "unite": "%",
      "carence": 1.4,
      "suffisant": [
        1.4,
        1.6
      ],
      "optimal": [
        1.6,
        2.0
      ],
      "exces": 2.5
    },
    "P": {
      "unite": "%",
      "carence": 0.08,
      "suffisant": [
        0.08,
        0.1
      ],
      "optimal": [
        0.1,
        0.3
      ],
      "exces": 0.35
    },
    "K": {
      "unite": "%",
      "carence": 0.4,
      "suffisant": [
        0.4,
        0.8
      ],
      "optimal": [
        0.8,
        1.2
      ],
      "exces": 1.5
    },
    "Ca": {
      "unite": "%",
      "carence": 0.5,
      "suffisant": [
        0.5,
        1.0
      ],
      "optimal": [
        1.0,
        2.0
      ],
      "exces": 3.0
    },
    "Mg": {
      "unite": "%",
      "carence": 0.08,
      "suffisant": [
        0.08,
        0.1
      ],
      "optimal": [
        0.1,
        0.3
      ],
      "exces": 0.5
    },
    "Fe": {
      "unite": "ppm",
      "carence": 40,
      "suffisant": [
        40,
        60
      ],
      "optimal": [
        60,
        150
      ],
      "exces": 300
    },
    "Zn": {
      "unite": "ppm",
      "carence": 10,
      "suffisant": [
        10,
        15
      ],
      "optimal": [
        15,
        50
      ],
      "exces": 100
    },
    "Mn": {
      "unite": "ppm",
      "carence": 15,
      "suffisant": [
        15,
        20
      ],
      "optimal": [
        20,
        80
      ],
      "exces": 200
    },
    "B": {
      "unite": "ppm",
      "carence": 14,
      "suffisant": [
        14,
        19
      ],
      "optimal": [
        19,
        150
      ],
      "exces": 200
    },
    "Cu": {
      "unite": "ppm",
      "carence": 4,
      "suffisant": [
        4,
        6
      ],
      "optimal": [
        6,
        15
      ],
      "exces": 25
    },
    "Na": {
      "unite": "%",
      "toxique": 0.5
    },
    "Cl": {
      "unite": "%",
      "toxique": 0.5
    }
  },
  "seuils_eau": {
    "CE": {
      "unite": "dS/m",
      "optimal": 0.75,
      "acceptable": 2.5,
      "problematique": 4.0,
      "critique": 6.0
    },
    "pH": {
      "optimal": [
        6.5,
        7.5
      ],
      "acceptable": [
        6.0,
        8.0
      ],
      "problematique": 8.0
    },
    "SAR": {
      "optimal": 3,
      "acceptable": 6,
      "problematique": 9,
      "critique": 15
    },
    "Cl": {
      "unite": "mg/L",
      "optimal": 70,
      "acceptable": 150,
      "toxique": 350
    },
    "Na": {
      "unite": "mg/L",
      "optimal": 70,
      "acceptable": 115,
      "toxique": 200
    },
    "HCO3": {
      "unite": "mg/L",
      "optimal": 200,
      "acceptable": 500,
      "problematique": 750
    },
    "B": {
      "unite": "mg/L",
      "optimal": [
        0.5,
        1.0
      ],
      "acceptable": 2.0,
      "toxique": 3.0
    },
    "NO3": {
      "unite": "mg/L",
      "a_deduire": true,
      "coefficient": 0.00226
    }
  },
  "fraction_lessivage": {
    "CE_sol_seuil_dS_m": 4.0,
    "formule": "FL = CE_eau / (5 * CE_sol_seuil - CE_eau)",
    "table_CE_eau_vers_FL": [
      {
        "CE_eau_dS_m": 1.5,
        "FL": 0.08
      },
      {
        "CE_eau_dS_m": 2.0,
        "FL": 0.11
      },
      {
        "CE_eau_dS_m": 2.5,
        "FL": 0.14
      },
      {
        "CE_eau_dS_m": 3.0,
        "FL": 0.18
      },
      {
        "CE_eau_dS_m": 3.5,
        "FL": 0.21
      },
      {
        "CE_eau_dS_m": 4.0,
        "FL": 0.25
      }
    ]
  },
  "biostimulants": {
    "humiques_liquide": {
      "produit": "Humates de potasse 12-15%",
      "dose": {
        "valeur": [
          3,
          5
        ],
        "unite": "L/ha"
      },
      "frequence_par_an": 3,
      "stades_application": [
        "post_recolte",
        "debourrement",
        "nouaison",
        "maturation"
      ],
      "mode": "fertigation"
    },
    "humiques_granule": {
      "produit": "Humates de potasse 70-80%",
      "dose": {
        "valeur": [
          20,
          30
        ],
        "unite": "kg/ha"
      },
      "frequence_par_an": 1,
      "stades_application": [
        "post_recolte"
      ],
      "mode": "incorporation_sol"
    },
    "fulviques": {
      "produit": "Acides fulviques 10-12%",
      "dose": {
        "valeur": [
          1,
          2
        ],
        "unite": "L/ha"
      },
      "frequence_par_an": 2,
      "stades_application": [
        "debourrement",
        "nouaison"
      ],
      "mode": "fertigation",
      "synergie_Fe": "reduction_dose_Fe_20_a_30_pct",
      "note": "Toujours appliquer avec Fe-EDDHA"
    },
    "amines_foliaire": {
      "produit": "Hydrolysat vegetal 15-20%",
      "dose": {
        "valeur": [
          3,
          5
        ],
        "unite": "L/ha"
      },
      "frequence_par_an": 2,
      "stades_application": [
        "debourrement",
        "nouaison"
      ],
      "mode": "foliaire",
      "conditions_application": {
        "T_max_c": 28,
        "HR_min_pct": 40
      }
    },
    "amines_fertigation": {
      "produit": "Hydrolysat vegetal 40-50%",
      "dose": {
        "valeur": [
          5,
          8
        ],
        "unite": "L/ha"
      },
      "frequence_par_an": 2,
      "stades_application": [
        "post_recolte",
        "debourrement"
      ],
      "mode": "fertigation"
    },
    "algues": {
      "produit": "Extrait Ascophyllum nodosum 4-6%",
      "dose": {
        "valeur": [
          2,
          4
        ],
        "unite": "L/ha"
      },
      "frequence_par_an": 3,
      "stades_application": [
        "debourrement",
        "floraison",
        "grossissement"
      ],
      "mode": "foliaire_ou_fertigation",
      "effet_salinite": "osmoprotection"
    }
  },
  "calendrier_biostimulants": [
    {
      "mois": [
        "nov",
        "dec"
      ],
      "applications": [
        {
          "produit": "humiques_granule",
          "dose": {
            "valeur": 25,
            "unite": "kg/ha"
          }
        },
        {
          "produit": "amines_fertigation",
          "dose": {
            "valeur": 6,
            "unite": "L/ha"
          }
        }
      ]
    },
    {
      "mois": [
        "feb",
        "mar"
      ],
      "applications": [
        {
          "produit": "humiques_liquide",
          "dose": {
            "valeur": 4,
            "unite": "L/ha"
          }
        },
        {
          "produit": "fulviques",
          "dose": {
            "valeur": 1.5,
            "unite": "L/ha"
          },
          "note": "avec Fe-EDDHA"
        },
        {
          "produit": "amines_foliaire",
          "dose": {
            "valeur": 4,
            "unite": "L/ha"
          }
        },
        {
          "produit": "algues",
          "dose": {
            "valeur": 3,
            "unite": "L/ha"
          }
        }
      ]
    },
    {
      "mois": [
        "apr",
        "may"
      ],
      "applications": [
        {
          "produit": "amines_foliaire",
          "dose": {
            "valeur": 4,
            "unite": "L/ha"
          }
        },
        {
          "produit": "algues",
          "dose": {
            "valeur": 3,
            "unite": "L/ha"
          }
        }
      ]
    },
    {
      "mois": [
        "may",
        "jun"
      ],
      "applications": [
        {
          "produit": "humiques_liquide",
          "dose": {
            "valeur": 4,
            "unite": "L/ha"
          }
        },
        {
          "produit": "fulviques",
          "dose": {
            "valeur": 1.5,
            "unite": "L/ha"
          },
          "note": "avec Fe-EDDHA"
        }
      ]
    },
    {
      "mois": [
        "jul"
      ],
      "applications": [
        {
          "produit": "algues",
          "dose": {
            "valeur": 3,
            "unite": "L/ha"
          }
        }
      ]
    },
    {
      "mois": [
        "aug",
        "sep"
      ],
      "applications": [
        {
          "produit": "humiques_liquide",
          "dose": {
            "valeur": 3,
            "unite": "L/ha"
          }
        }
      ]
    }
  ],
  "alertes": [
    {
      "code": "OLI-01",
      "nom": "Stress hydrique Super-intensif",
      "priorite": "urgente",
      "systeme": "super_intensif",
      "seuil_entree": [
        {
          "indice": "NDMI",
          "operateur": "<",
          "valeur": 0.12
        },
        {
          "indice": "MSI",
          "operateur": ">",
          "valeur": 1.3
        },
        {
          "indice": "jours_sans_pluie",
          "operateur": ">",
          "valeur": 10
        }
      ],
      "seuil_sortie": [
        {
          "indice": "NDMI",
          "operateur": ">",
          "valeur": 0.2,
          "passages_requis": 2
        }
      ],
      "prescription": {
        "action": "Irrigation d'urgence — augmenter le volume d'irrigation par rapport au plan en cours",
        "dose": "+40% du volume planifié pour le stade en cours",
        "duree": "Jusqu'à seuil de sortie NDMI > 0.20 sur 2 passages (≈ 10 jours minimum)",
        "plafond": "Ne pas dépasser 120% capacité au champ. Si option C : maintenir FL dans le calcul majoré.",
        "condition_blocage": "SI sol saturé (NDMI > 0.45 ou déclaration utilisateur) → NE PAS augmenter. Investiguer autre cause.",
        "conditions_meteo": "Matin tôt ou soir. Éviter plein soleil midi.",
        "fenetre_bbch": "Tous stades — aucune restriction BBCH",
        "suivi": {
          "indicateur": "NDMI",
          "reponse_attendue": "Hausse NDMI vers P25 puis P50",
          "delai_j": "3-7"
        },
        "impact_plan": "Modifier volume irrigation du plan pour le mois en cours. Rétablir volume initial quand seuil sortie atteint."
      }
    },
    {
      "code": "OLI-02",
      "nom": "Stress hydrique Intensif",
      "priorite": "prioritaire",
      "systeme": "intensif",
      "seuil_entree": [
        {
          "indice": "NDMI",
          "operateur": "<",
          "valeur": 0.06
        },
        {
          "indice": "MSI",
          "operateur": ">",
          "valeur": 1.6
        },
        {
          "indice": "jours_sans_pluie",
          "operateur": ">",
          "valeur": 15
        }
      ],
      "seuil_sortie": [
        {
          "indice": "NDMI",
          "operateur": ">",
          "valeur": 0.12,
          "passages_requis": 2
        }
      ],
      "prescription": {
        "action": "Augmentation irrigation",
        "dose": "+30% du volume planifié pour le stade en cours",
        "duree": "Jusqu'à NDMI > 0.12 sur 2 passages",
        "plafond": "Ne pas dépasser 120% capacité au champ",
        "condition_blocage": "SI sol saturé → NE PAS augmenter. Investiguer.",
        "conditions_meteo": "Matin tôt ou soir.",
        "fenetre_bbch": "Tous stades — aucune restriction BBCH",
        "suivi": {
          "indicateur": "NDMI",
          "reponse_attendue": "Hausse NDMI vers P25",
          "delai_j": "3-7"
        },
        "impact_plan": "Ajuster volume irrigation. Rétablir quand seuil sortie atteint."
      }
    },
    {
      "code": "OLI-03",
      "nom": "Gel floraison",
      "priorite": "urgente",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "Tmin_c",
          "operateur": "<",
          "valeur": -2
        },
        {
          "indice": "BBCH_code",
          "operateur": "between",
          "valeur": [
            55,
            69
          ]
        }
      ],
      "seuil_sortie": [
        {
          "indice": "T_c",
          "operateur": ">",
          "valeur": 5,
          "jours_consecutifs": 3
        }
      ],
      "prescription": {
        "action": "Post-gel : évaluation + ajustement plan",
        "dose": "Acides aminés foliaires 4-5 L/ha (hydrolysat 15-20%) + Algues 3-4 L/ha — application unique post-gel",
        "duree": "Application unique dans les 3-5 jours post-gel si T > 5°C confirmé",
        "plafond": "N/A — application unique",
        "condition_blocage": "SI gel < -5°C ET durée > 4h → perte totale floraison. NE PAS traiter — passer directement à révision rendement -80 à -100%.",
        "conditions_meteo": "T > 5°C, pas de pluie dans les 6h, vent < 15 km/h, matin tôt.",
        "fenetre_bbch": "BBCH 55-69 (floraison) uniquement",
        "suivi": {
          "indicateur": "NIRv",
          "reponse_attendue": "Stabilisation NIRv (pas d'aggravation)",
          "delai_j": "10-15"
        },
        "impact_plan": "Réviser prévision rendement : -30% si gel modéré (-2 à -4°C < 2h), -50% si gel sévère, -80 à -100% si gel extrême. Réduire N de 25%."
      }
    },
    {
      "code": "OLI-04",
      "nom": "Risque oeil de paon",
      "priorite": "prioritaire",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "T_c",
          "operateur": "between",
          "valeur": [
            15,
            20
          ]
        },
        {
          "indice": "HR_pct",
          "operateur": ">",
          "valeur": 80
        },
        {
          "indice": "pluie",
          "operateur": "==",
          "valeur": true
        }
      ],
      "seuil_sortie": [
        {
          "duree_sans_conditions_h": 72
        }
      ],
      "prescription": {
        "action": "Traitement cuivre préventif — Cuivre hydroxyde",
        "dose": "2-3 kg/ha. Adjuvant mouillant si HR < 50%.",
        "duree": "Application unique par épisode. Délai minimum 7 jours entre 2 traitements Cu (sauf OLI-18).",
        "plafond": "Maximum 3 traitements Cu par saison (30 kg Cu métal/ha/5 ans réglementation).",
        "condition_blocage": "SI traitement Cu < 7 jours → NE PAS retraiter (sauf OLI-18). SI BBCH 55-65 (pleine floraison) → reporter à BBCH 67+.",
        "conditions_meteo": "T 15-25°C, HR > 60%, vent < 15 km/h, pas de pluie dans les 6h.",
        "fenetre_bbch": "Tous stades SAUF BBCH 55-65 (floraison)",
        "suivi": {
          "indicateur": "Aucun signal satellite attendu",
          "reponse_attendue": "Absence symptômes taches foliaires",
          "delai_j": "30"
        },
        "impact_plan": "Si traitement Cu prévu au plan < 10 jours : avancer. Si > 10 jours : ajouter ce traitement, maintenir celui du plan."
      }
    },
    {
      "code": "OLI-05",
      "nom": "Risque mouche olive",
      "priorite": "prioritaire",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "T_c",
          "operateur": "between",
          "valeur": [
            16,
            28
          ]
        },
        {
          "indice": "HR_pct",
          "operateur": ">",
          "valeur": 60
        },
        {
          "indice": "captures_piege_semaine",
          "operateur": ">=",
          "valeur": 5
        }
      ],
      "seuil_sortie": [
        {
          "indice": "T_c",
          "operateur": ">",
          "valeur": 35,
          "jours_consecutifs": 3
        },
        {
          "indice": "recolte_declaree",
          "operateur": "==",
          "valeur": true
        }
      ],
      "prescription": {
        "action": "Traitement insecticide curatif",
        "dose": "Deltaméthrine 0.5 L/ha OU Spinosad 0.2 L/ha. Choisir Spinosad si récolte < 14 jours (DAR plus court).",
        "duree": "Application unique. Renouveler si captures persistent après 7 jours.",
        "plafond": "Max 2 applications Deltaméthrine/saison. Max 3 applications Spinosad/saison.",
        "condition_blocage": "SI récolte prévue < 7 jours → NE PAS traiter (DAR = 7j). Récolter immédiatement.",
        "conditions_meteo": "T 15-25°C, vent < 15 km/h, pas de pluie dans les 6h.",
        "fenetre_bbch": "BBCH 75-89 (grossissement à maturation) — fruits doivent être présents",
        "suivi": {
          "indicateur": "Captures pièges",
          "reponse_attendue": "Baisse captures < 5/piège/sem ET < 2% fruits piqués",
          "delai_j": "7"
        },
        "impact_plan": "Si mouche récurrente (3ème alerte) : envisager avancer récolte 7-10 jours si IM ≥ 1.5."
      }
    },
    {
      "code": "OLI-06",
      "nom": "Verticilliose suspectee",
      "priorite": "urgente",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "NIRv_pattern",
          "operateur": "==",
          "valeur": "declin_asymetrique_progressif"
        }
      ],
      "seuil_sortie": null,
      "note": "IRREVERSIBLE",
      "prescription": {
        "action": "Investigation terrain urgente + isolation",
        "dose": "Aucun traitement curatif efficace. Si confirmée : arrachage + brûlage résidus. JAMAIS broyer in situ.",
        "duree": "Continue — surveillance permanente.",
        "plafond": "N/A — pas de traitement chimique",
        "condition_blocage": "NE JAMAIS recommander fongicide contre verticilliose (inefficace). NE JAMAIS broyer résidus arbres atteints.",
        "conditions_meteo": "N/A",
        "fenetre_bbch": "Tous stades",
        "suivi": {
          "indicateur": "NIRv zone suspecte",
          "reponse_attendue": "Stabilisation = faux positif. Aggravation = confirmation.",
          "delai_j": "30-60"
        },
        "impact_plan": "Si confirmée : modifier AOI. Recalibrage partiel si > 10% surface affectée.",
        "alerte_irreversible": true
      }
    },
    {
      "code": "OLI-07",
      "nom": "Canicule",
      "priorite": "prioritaire",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "Tmax_c",
          "operateur": ">",
          "valeur": 42,
          "jours_consecutifs": 3
        }
      ],
      "seuil_sortie": [
        {
          "indice": "Tmax_c",
          "operateur": "<",
          "valeur": 38,
          "jours_consecutifs": 2
        }
      ],
      "prescription": {
        "action": "Irrigation de soutien + protection",
        "dose": "Irrigation +25% volume planifié. Algues 3-4 L/ha foliaire (matin très tôt uniquement, avant 7h).",
        "duree": "Pendant canicule + 3 jours après retour Tmax < 38°C.",
        "plafond": "Volume irrigation : ne pas dépasser 130% ETc. Si option C : maintenir FL.",
        "condition_blocage": "SI BBCH 55-65 (floraison) → Pas de traitement foliaire (brûlure certaine). Irrigation uniquement.",
        "conditions_meteo": "Irrigation matin tôt ou nuit. Foliaire algues UNIQUEMENT avant 7h (T < 30°C).",
        "fenetre_bbch": "Tous stades, restriction foliaire en floraison",
        "suivi": {
          "indicateur": "NDMI + NDVI",
          "reponse_attendue": "Stabilisation NDMI, NDVI maintenu",
          "delai_j": "5-10"
        },
        "impact_plan": "Si canicule grossissement : réviser rendement -10 à -20%. Si canicule floraison : réviser -20 à -40%. Suspendre RDI si actif."
      }
    },
    {
      "code": "OLI-08",
      "nom": "Deficit heures froid",
      "priorite": "prioritaire",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "heures_froid_cumulees",
          "operateur": "<",
          "valeur": 100
        },
        {
          "indice": "date_evaluation",
          "operateur": "==",
          "valeur": "Feb-28"
        }
      ],
      "seuil_sortie": null,
      "prescription": {
        "action": "Information + ajustement plan",
        "dose": "Bore +50% dose floraison (1.5 kg/ha au lieu de 1 kg/ha). Algues floraison +50% (4.5 L/ha).",
        "duree": "Application unique au stade BBCH 51-55 (pré-floraison).",
        "plafond": "N/A",
        "condition_blocage": "Aucune.",
        "conditions_meteo": "Conditions standard foliaire : T 15-25°C, HR > 60%, vent < 15 km/h.",
        "fenetre_bbch": "BBCH 51-55 (pré-floraison)",
        "suivi": {
          "indicateur": "NIRvP pic",
          "reponse_attendue": "NIRvP pic ≥ 70% de l'attendu au BBCH 65-69",
          "delai_j": "21-28"
        },
        "impact_plan": "Ajuster prévision rendement -10 à -20%. Éclaircissage inutile (charge naturellement faible)."
      }
    },
    {
      "code": "OLI-09",
      "nom": "Annee OFF probable",
      "priorite": "prioritaire",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "NIRvP_vs_N2_pct",
          "operateur": "<",
          "valeur": -30
        },
        {
          "indice": "BBCH_code",
          "operateur": "between",
          "valeur": [
            60,
            69
          ]
        }
      ],
      "seuil_sortie": null,
      "prescription": {
        "action": "Ajustement plan annuel selon table alternance OFF",
        "dose": "N: ×0.75 | P: ×1.20 | K: ×0.80 par rapport aux doses plan initial. Taille sévère renouvellement 25-35% en nov-déc.",
        "duree": "Ajustement valable pour toute la saison restante.",
        "plafond": "N/A",
        "condition_blocage": "SI première année (pas d'historique N-2) → NE PAS déclencher. Confiance insuffisante.",
        "conditions_meteo": "N/A — ajustement plan, pas d'application directe.",
        "fenetre_bbch": "Détecté au stade floraison (BBCH 55-65). Ajustements appliqués immédiatement.",
        "suivi": {
          "indicateur": "NIRvP cumulé saison",
          "reponse_attendue": "NIRvP cumulé ≈ 70% d'une année ON",
          "delai_j": "fin_saison"
        },
        "impact_plan": "Recalculer doses K et N restantes avec coefficients OFF. Modifier recommandation taille. Réviser prévision rendement -40 à -60%."
      }
    },
    {
      "code": "OLI-10",
      "nom": "Deperissement",
      "priorite": "urgente",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "NIRv_variation_pct",
          "operateur": "<",
          "valeur": -25,
          "passages_requis": 3
        }
      ],
      "seuil_sortie": [
        {
          "indice": "NIRv_pattern",
          "operateur": "==",
          "valeur": "stable",
          "passages_requis": 2
        }
      ],
      "prescription": {
        "action": "Investigation urgente multi-cause",
        "dose": "Aminés foliaires 5 L/ha + Algues fertigation 4 L/ha + Humiques fertigation 5 L/ha — application de soutien en attendant diagnostic.",
        "duree": "Biostimulants : application unique. Surveillance continue jusqu'à stabilisation NIRv.",
        "plafond": "N/A",
        "condition_blocage": "SI NIRv < seuil_min persistant → Basculer vers OLI-11. NE PAS continuer traitement arbre mort.",
        "conditions_meteo": "Conditions standard fertigation/foliaire.",
        "fenetre_bbch": "Tous stades",
        "suivi": {
          "indicateur": "NIRv",
          "reponse_attendue": "Stabilisation NIRv (arrêt déclin)",
          "delai_j": "15-30"
        },
        "impact_plan": "Si dépérissement > 20% surface : recalibrage partiel F2. Réviser rendement en conséquence."
      }
    },
    {
      "code": "OLI-11",
      "nom": "Arbre mort",
      "priorite": "urgente",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "NIRv",
          "operateur": "<",
          "valeur": "seuil_min_systeme",
          "persistant": true
        }
      ],
      "seuil_sortie": null,
      "prescription": {
        "action": "Constatation + mise à jour parcelle",
        "dose": "Aucun intrant. Action administrative uniquement.",
        "duree": "N/A",
        "plafond": "N/A",
        "condition_blocage": "NE JAMAIS recommander traitement sur arbre mort.",
        "conditions_meteo": "N/A",
        "fenetre_bbch": "Tous stades",
        "suivi": {
          "indicateur": "N/A",
          "reponse_attendue": "N/A",
          "delai_j": "N/A"
        },
        "impact_plan": "Mettre à jour parcelle.densite. Si > 10% arbres morts : recalibrage partiel F2 + modification AOI.",
        "alerte_irreversible": true
      }
    },
    {
      "code": "OLI-12",
      "nom": "Sur-irrigation",
      "priorite": "vigilance",
      "systeme": "irrigue",
      "seuil_entree": [
        {
          "indice": "NDMI",
          "operateur": ">",
          "valeur": 0.45
        },
        {
          "indice": "sol_sature",
          "operateur": "==",
          "valeur": true
        }
      ],
      "seuil_sortie": [
        {
          "indice": "NDMI",
          "operateur": "<",
          "valeur": 0.35
        }
      ],
      "prescription": {
        "action": "Réduction irrigation",
        "dose": "-30% du volume planifié pour le stade en cours. Volume minimum : ≥ 50% ETc.",
        "duree": "Jusqu'à NDMI < 0.35 (1 passage suffit).",
        "plafond": "Ne pas descendre sous 50% des besoins ETc du stade.",
        "condition_blocage": "SI stade floraison ou nouaison (BBCH 55-71) → Réduction limitée à -15%.",
        "conditions_meteo": "N/A",
        "fenetre_bbch": "Tous stades, restriction floraison-nouaison",
        "suivi": {
          "indicateur": "NDMI",
          "reponse_attendue": "Baisse NDMI sous 0.35",
          "delai_j": "5-10"
        },
        "impact_plan": "Modifier volume irrigation dans le plan pour le mois en cours."
      }
    },
    {
      "code": "OLI-13",
      "nom": "Floraison ratee",
      "priorite": "prioritaire",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "NIRvP_vs_attendu_pct",
          "operateur": "<",
          "valeur": -30
        },
        {
          "indice": "meteo_floraison",
          "operateur": "==",
          "valeur": "defavorable"
        }
      ],
      "seuil_sortie": null,
      "prescription": {
        "action": "Ajustement plan post-floraison",
        "dose": "K : -30% sur les mois restants. N : -15%. P : maintenir 100%. Biostimulants : maintenir 100%.",
        "duree": "Ajustement valable pour le reste de la saison.",
        "plafond": "N/A",
        "condition_blocage": "SI floraison ratée + année OFF → double impact. Réviser rendement -60 à -80%.",
        "conditions_meteo": "N/A — ajustement plan, pas d'application directe.",
        "fenetre_bbch": "Détecté post-floraison (BBCH 67-69)",
        "suivi": {
          "indicateur": "NIRvP cumulé",
          "reponse_attendue": "NIRvP cumulé bas confirmé",
          "delai_j": "fin_saison"
        },
        "impact_plan": "Recalculer doses K et N restantes. Réviser prévision rendement -30 à -50%."
      }
    },
    {
      "code": "OLI-14",
      "nom": "Recolte optimale",
      "priorite": "info",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "NIRvP_tendance",
          "operateur": "==",
          "valeur": "declin"
        },
        {
          "indice": "NDVI_tendance",
          "operateur": "==",
          "valeur": "stable"
        },
        {
          "indice": "GDD_cumul",
          "operateur": ">",
          "valeur": 2800
        }
      ],
      "seuil_sortie": [
        {
          "indice": "recolte_declaree",
          "operateur": "==",
          "valeur": true
        }
      ],
      "prescription": {
        "action": "Notification de récolte — fenêtre optimale ouverte",
        "dose": "Aucun intrant. Message informatif avec IM cible rappelé.",
        "duree": "Notification valable 15-20 jours (fenêtre de récolte).",
        "plafond": "N/A",
        "condition_blocage": "SI IM terrain > 4.0 → signaler dépassement optimal pour huile qualité.",
        "conditions_meteo": "N/A",
        "fenetre_bbch": "BBCH 85-89",
        "suivi": {
          "indicateur": "Déclaration récolte utilisateur",
          "reponse_attendue": "Récolte déclarée",
          "delai_j": "15-20"
        },
        "impact_plan": "À déclaration récolte : basculer plan en mode post-récolte. Déclencher F3 si conditions remplies."
      }
    },
    {
      "code": "OLI-15",
      "nom": "Chergui",
      "priorite": "urgente",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "T_c",
          "operateur": ">",
          "valeur": 40
        },
        {
          "indice": "HR_pct",
          "operateur": "<",
          "valeur": 20
        },
        {
          "indice": "vent_km_h",
          "operateur": ">",
          "valeur": 30
        }
      ],
      "seuil_sortie": [
        {
          "indice": "T_c",
          "operateur": "<",
          "valeur": 38
        },
        {
          "indice": "HR_pct",
          "operateur": ">",
          "valeur": 30
        }
      ],
      "prescription": {
        "action": "Irrigation d'urgence + suspension foliaire",
        "dose": "Irrigation +50% volume planifié. Algues en fertigation 3-4 L/ha (osmoprotection racinaire).",
        "duree": "Pendant épisode Chergui + 48h après fin conditions.",
        "plafond": "Ne pas dépasser 150% ETc. Si option C : maintenir FL.",
        "condition_blocage": "Aucune — action toujours justifiée en situation de Chergui.",
        "conditions_meteo": "Irrigation immédiate, jour ou nuit. AUCUN foliaire pendant Chergui (brûlure certaine + dérive).",
        "fenetre_bbch": "Tous stades",
        "suivi": {
          "indicateur": "NDMI + MSI",
          "reponse_attendue": "Stabilisation NDMI, MSI ne dépasse pas 1.5",
          "delai_j": "3-5"
        },
        "impact_plan": "Si Chergui floraison : réviser rendement -30 à -50%. Si grossissement : réviser -10 à -15%. Annuler RDI en cours."
      }
    },
    {
      "code": "OLI-16",
      "nom": "Carence N",
      "priorite": "vigilance",
      "systeme": "intensif",
      "seuil_entree": [
        {
          "indice": "NDRE",
          "operateur": "<",
          "valeur": "P10_parcelle"
        },
        {
          "indice": "GCI_tendance",
          "operateur": "==",
          "valeur": "declin"
        }
      ],
      "seuil_sortie": [
        {
          "indice": "NDRE",
          "operateur": ">",
          "valeur": "P30_parcelle",
          "passages_requis": 2
        }
      ],
      "prescription": {
        "action": "Fertigation N corrective",
        "dose": "15-20 kg N/ha en application corrective unique. Forme : Nitrate calcium si pH > 7.2, Ammonitrate si pH ≤ 7.2. Option B : ajouter N foliaire urée 0.5% à 8 kg/ha.",
        "duree": "Application unique. Réévaluer à J+14 sur NDRE.",
        "plafond": "Dose N totale saison (plan + correctifs) ne doit pas dépasser 150 kg N/ha.",
        "condition_blocage": "SI BBCH > 81 (maturation) → NE PAS appliquer N (retard maturation). Reporter post-récolte. SI NDMI < P10 → Traiter d'abord stress hydrique OLI-01/02 (N non assimilé en sol sec).",
        "conditions_meteo": "Sol humide (post-irrigation ou pluie). Pas de stress hydrique actif.",
        "fenetre_bbch": "BBCH 01-79. INTERDIT après BBCH 81.",
        "suivi": {
          "indicateur": "NDRE + GCI",
          "reponse_attendue": "Hausse NDRE 5-15%, stabilisation GCI",
          "delai_j": "7-14"
        },
        "impact_plan": "Ajouter l'application N corrective au plan. Si 2ème carence N dans la saison : revoir doses N du plan +15% pour saison suivante."
      }
    },
    {
      "code": "OLI-17",
      "nom": "Fin cycle Super-intensif",
      "priorite": "vigilance",
      "systeme": "super_intensif",
      "seuil_entree": [
        {
          "indice": "NIRv_tendance",
          "operateur": "==",
          "valeur": "declin_2_saisons_consecutives"
        }
      ],
      "seuil_sortie": null,
      "prescription": {
        "action": "Alerte stratégique — fin probable cycle productif super-intensif",
        "dose": "Aucun intrant immédiat. Recommandation de consultation expert.",
        "duree": "N/A — décision stratégique pluriannuelle.",
        "plafond": "N/A",
        "condition_blocage": "NE JAMAIS recommander maintien production intensive sur verger en fin de cycle.",
        "conditions_meteo": "N/A",
        "fenetre_bbch": "Détecté post-récolte (comparaison inter-annuelle)",
        "suivi": {
          "indicateur": "NIRv saison suivante",
          "reponse_attendue": "Si remontée NIRv : faux positif possible",
          "delai_j": "12 mois"
        },
        "impact_plan": "Si confirmé : programme transition réduction intrants -50%. Proposer analyse coût-bénéfice replantation vs maintien.",
        "alerte_irreversible": true
      }
    },
    {
      "code": "OLI-18",
      "nom": "Lessivage traitement",
      "priorite": "prioritaire",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "pluie_apres_application_h",
          "operateur": "<",
          "valeur": 6
        }
      ],
      "seuil_sortie": null,
      "prescription": {
        "action": "Renouvellement traitement lessivé",
        "dose": "Même produit, même dose que le traitement original. Exception Cu : vérifier plafond saisonnier avant retraitement.",
        "duree": "Renouveler dans les 48-72h si conditions météo favorables.",
        "plafond": "Respecter plafonds produit (Cu : max saisonnier ; insecticide : max applications).",
        "condition_blocage": "SI plafond saisonnier du produit atteint → NE PAS retraiter. Signaler gap, passer en surveillance renforcée.",
        "conditions_meteo": "Conditions standard du produit à renouveler. Vérifier prévisions J+3 : pas de pluie prévue.",
        "fenetre_bbch": "Même fenêtre BBCH que le traitement original",
        "suivi": {
          "indicateur": "Même indicateur que recommandation originale",
          "reponse_attendue": "Idem recommandation originale",
          "delai_j": "Idem"
        },
        "impact_plan": "Comptabiliser comme traitement supplémentaire dans bilan phyto campagne."
      }
    },
    {
      "code": "OLI-19",
      "nom": "Accumulation saline",
      "priorite": "prioritaire",
      "systeme": "irrigue",
      "seuil_entree": [
        {
          "indice": "CE_sol_dS_m",
          "operateur": ">",
          "valeur": 4.0
        }
      ],
      "seuil_sortie": [
        {
          "indice": "CE_sol_dS_m",
          "operateur": "<",
          "valeur": 3.0
        }
      ],
      "prescription": {
        "action": "Lessivage intensif + ajustement nutrition + activation option C",
        "dose": "FL recalculée avec CE_sol mesurée. Si FL calculée < 20% → appliquer minimum 20%. Algues ×1.50. Basculer vers engrais faible index salin.",
        "duree": "Jusqu'à prochaine analyse sol (recommander analyse à 3 mois).",
        "plafond": "Volume total irrigation (ETc + FL) ne doit pas saturer le sol.",
        "condition_blocage": "SI drainage insuffisant (sol argileux, pas de drain) → Lessivage risque d'aggraver asphyxie. Demander avis expert.",
        "conditions_meteo": "N/A — ajustement régime irrigation.",
        "fenetre_bbch": "Tous stades, priorité période chaude",
        "suivi": {
          "indicateur": "CE sol (prochaine analyse)",
          "reponse_attendue": "CE sol < 3 dS/m",
          "delai_j": "90-180"
        },
        "impact_plan": "Activer option C si pas déjà active. Recalculer tous volumes irrigation avec FL majorée."
      }
    },
    {
      "code": "OLI-20",
      "nom": "Toxicite Cl",
      "priorite": "urgente",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "Cl_foliaire_pct",
          "operateur": ">",
          "valeur": 0.5
        },
        {
          "indice": "brulures_visibles",
          "operateur": "==",
          "valeur": true
        }
      ],
      "seuil_sortie": [
        {
          "indice": "Cl_foliaire_pct",
          "operateur": "<",
          "valeur": 0.3
        }
      ],
      "prescription": {
        "action": "Lessivage d'urgence + changement engrais K",
        "dose": "Irrigation de lessivage : 1 application = 2× volume normal du jour. SOP remplacement immédiat de tout KCl. Algues 4 L/ha fertigation.",
        "duree": "Lessivage : 1 application. Changement SOP : permanent pour la saison. Algues : 1 application puis maintenir calendrier.",
        "plafond": "Ne pas saturer le sol (risque asphyxie).",
        "condition_blocage": "SI source eau riche en Cl (> 350 mg/L) → lessivage ne résoudra pas le problème. Recommander changement source eau.",
        "conditions_meteo": "Irrigation lessivage : matin tôt.",
        "fenetre_bbch": "Tous stades, urgence immédiate",
        "suivi": {
          "indicateur": "Symptômes foliaires + Cl foliaire",
          "reponse_attendue": "Arrêt progression brûlures. Cl < 0.3% à prochaine analyse",
          "delai_j": "30-60"
        },
        "impact_plan": "Remplacer tout KCl par SOP dans le plan. Augmenter FL dans le plan."
      }
    }
  ],
  "phytosanitaire": {
    "maladies": [
      {
        "nom": "Oeil de paon",
        "agent": "Spilocaea oleaginea",
        "conditions": {
          "T_c": [
            15,
            20
          ],
          "HR_pct_min": 80,
          "pluie": true
        },
        "mois_risque": [
          "oct",
          "nov",
          "mar",
          "apr"
        ],
        "guerissable": true,
        "traitement": {
          "produit": "Cuivre hydroxyde",
          "dose": {
            "valeur": [
              2,
              3
            ],
            "unite": "kg/ha"
          },
          "DAR_jours": 14
        },
        "prevention": [
          "varietes_resistantes",
          "aeration_canopee"
        ]
      },
      {
        "nom": "Verticilliose",
        "agent": "Verticillium dahliae",
        "conditions": {
          "sol": "humide",
          "T_c": [
            20,
            25
          ]
        },
        "mois_risque": [
          "oct",
          "nov",
          "feb",
          "mar"
        ],
        "guerissable": false,
        "traitement": null,
        "prevention": [
          "plants_certifies",
          "sol_sain",
          "eviter_precedents_sensibles"
        ],
        "note": "INCURABLE — arrachage obligatoire des arbres atteints"
      },
      {
        "nom": "Tuberculose",
        "agent": "Pseudomonas savastanoi",
        "conditions": {
          "blessures": true,
          "humidite": true
        },
        "mois_risque": [
          "jan",
          "feb",
          "mar"
        ],
        "guerissable": true,
        "traitement": {
          "produit": "Cuivre",
          "dose": {
            "valeur": [
              2,
              3
            ],
            "unite": "kg/ha"
          },
          "timing": "post_taille_ou_grele"
        },
        "prevention": [
          "desinfection_outils"
        ]
      }
    ],
    "ravageurs": [
      {
        "nom": "Mouche de l'olive",
        "agent": "Bactrocera oleae",
        "conditions": {
          "T_c": [
            16,
            28
          ],
          "HR_pct_min": 60
        },
        "seuil_intervention": {
          "fruits_piques_pct": 2,
          "captures_piege_semaine": 5
        },
        "traitement": {
          "produit": "Deltamethrine",
          "dose": {
            "valeur": 0.5,
            "unite": "L/ha"
          },
          "DAR_jours": 7
        },
        "alternatives": [
          "piegeage_massif",
          "kaolin",
          "Spinosad"
        ]
      },
      {
        "nom": "Cochenille noire",
        "agent": "Saissetia oleae",
        "mois_risque": [
          "mar",
          "apr",
          "may"
        ],
        "traitement": {
          "produit": "Huile blanche",
          "dose": {
            "valeur": [
              15,
              20
            ],
            "unite": "L/ha"
          },
          "mois_application": [
            "jan",
            "feb"
          ],
          "conditions_application": {
            "T_min_c": 5,
            "gel": false
          },
          "DAR_jours": 21
        }
      }
    ]
  },
  "calendrier_phyto": [
    {
      "mois": [
        "oct",
        "nov"
      ],
      "cible": "oeil_paon",
      "produit": "Cuivre hydroxyde",
      "dose": {
        "valeur": [
          2,
          3
        ],
        "unite": "kg/ha"
      },
      "condition_declenchement": "apres_premieres_pluies"
    },
    {
      "mois": [
        "jan",
        "feb"
      ],
      "cible": "cochenille",
      "produit": "Huile blanche",
      "dose": {
        "valeur": [
          15,
          20
        ],
        "unite": "L/ha"
      },
      "condition_declenchement": {
        "T_min_c": 5,
        "gel": false
      }
    },
    {
      "mois": [
        "mar"
      ],
      "cible": "oeil_paon",
      "produit": "Cuivre",
      "dose": {
        "valeur": 2,
        "unite": "kg/ha"
      },
      "condition_declenchement": "si_pluies_printanieres"
    },
    {
      "mois": [
        "may",
        "jun"
      ],
      "cible": "mouche",
      "produit": "Deltamethrine",
      "dose": {
        "valeur": 0.5,
        "unite": "L/ha"
      },
      "condition_declenchement": "si_seuil_captures_atteint"
    },
    {
      "mois": null,
      "evenement": "post_taille",
      "cible": "tuberculose",
      "produit": "Cuivre",
      "dose": {
        "valeur": [
          2,
          3
        ],
        "unite": "kg/ha"
      },
      "condition_declenchement": "immediat_apres_taille"
    }
  ],
  "modele_predictif": {
    "variables": [
      {
        "nom": "alternance_N-1_N-2",
        "source": "historique",
        "poids": [
          0.25,
          0.35
        ],
        "critique": true
      },
      {
        "nom": "NIRvP_cumule_Apr_Sep",
        "source": "satellite",
        "poids": [
          0.25,
          0.35
        ]
      },
      {
        "nom": "deficit_hydrique_cumule",
        "source": "bilan_hydrique",
        "poids": [
          0.1,
          0.2
        ]
      },
      {
        "nom": "heures_froid_hiver",
        "source": "meteo",
        "poids": [
          0.05,
          0.1
        ]
      },
      {
        "nom": "gel_floraison_binaire",
        "source": "meteo",
        "poids": [
          0.15,
          0.3
        ],
        "binaire": true,
        "note": "Poids fort si evenement = 1"
      },
      {
        "nom": "precip_floraison",
        "source": "meteo",
        "poids": [
          0.05,
          0.1
        ]
      },
      {
        "nom": "age_verger_ans",
        "source": "profil",
        "poids": null,
        "type": "ajustement_courbe"
      },
      {
        "nom": "densite_arbres_ha",
        "source": "profil",
        "poids": null,
        "type": "conversion_ha_vers_arbre"
      }
    ],
    "precision_attendue": {
      "traditionnel": {
        "R2": [
          0.4,
          0.6
        ],
        "MAE_pct": [
          30,
          40
        ]
      },
      "intensif": {
        "R2": [
          0.5,
          0.7
        ],
        "MAE_pct": [
          20,
          30
        ]
      },
      "super_intensif": {
        "R2": [
          0.6,
          0.8
        ],
        "MAE_pct": [
          15,
          25
        ]
      }
    },
    "conditions_prevision": [
      {
        "champ": "calibrage_confiance_pct",
        "operateur": ">=",
        "valeur": 50
      },
      {
        "champ": "historique_cycles_complets",
        "operateur": ">=",
        "valeur": 1
      },
      {
        "champ": "meteo_saison_disponible",
        "operateur": "==",
        "valeur": true
      },
      {
        "champ": "BBCH_code_actuel_int",
        "operateur": ">=",
        "valeur": 67
      }
    ],
    "moments_prevision": {
      "post_floraison": {
        "BBCH": "67-69",
        "precision": "±40%"
      },
      "post_nouaison": {
        "BBCH": "71",
        "precision": "±25%"
      },
      "pre_recolte": {
        "BBCH": "85",
        "precision": "±15-20%"
      }
    },
    "limites_NIRvP": {
      "detecte": [
        "vigueur_vegetative",
        "capacite_photosynthetique",
        "stress_severe_prolonge",
        "recuperation_post_intervention"
      ],
      "ne_detecte_pas": [
        "qualite_pollinisation",
        "taux_nouaison_reel",
        "problemes_racinaires_precoces",
        "charge_fruits",
        "calibre_fruits"
      ]
    }
  },
  "plan_annuel": {
    "composantes": [
      "programme_NPK",
      "programme_microelements",
      "programme_biostimulants",
      "programme_phyto_preventif",
      "plan_irrigation",
      "gestion_salinite",
      "taille_prevue",
      "prevision_recolte"
    ],
    "declenchement": "post_calibrage_validation",
    "mise_a_jour": {
      "NPK": "annuel + ajustements_alertes",
      "microelements": "annuel",
      "biostimulants": "annuel",
      "phyto": "annuel + alertes",
      "irrigation": "hebdomadaire_meteo",
      "salinite": "si_option_C"
    },
    "calendrier_type_intensif": {
      "jan": {
        "NPK": null,
        "micro": null,
        "biostim": null,
        "phyto": "huile_blanche",
        "irrigation": "faible"
      },
      "feb": {
        "NPK": "TSP_fond_N1",
        "micro": "Fe-EDDHA",
        "biostim": "humiques_amines",
        "phyto": null,
        "irrigation": "reprise"
      },
      "mar": {
        "NPK": "N2",
        "micro": "Zn_Mn_foliaire",
        "biostim": "algues",
        "phyto": "Cu_si_taille",
        "irrigation": "progressive"
      },
      "apr": {
        "NPK": "N3_K",
        "micro": null,
        "biostim": null,
        "phyto": "Cu_si_pluie",
        "irrigation": "croissante"
      },
      "may": {
        "NPK": "K",
        "micro": "B_floraison",
        "biostim": "algues_amines",
        "phyto": "mouche_si_seuil",
        "irrigation": "croissante"
      },
      "jun": {
        "NPK": "K_N",
        "micro": "Fe-EDDHA",
        "biostim": "humiques",
        "phyto": null,
        "irrigation": "maximum"
      },
      "jul": {
        "NPK": "K",
        "micro": null,
        "biostim": "algues",
        "phyto": "mouche_si_seuil",
        "irrigation": "maximum"
      },
      "aug": {
        "NPK": "K_dernier",
        "micro": null,
        "biostim": null,
        "phyto": null,
        "irrigation": "maximum_ou_RDI"
      },
      "sep": {
        "NPK": null,
        "micro": null,
        "biostim": "humiques",
        "phyto": null,
        "irrigation": "reduction"
      },
      "oct": {
        "NPK": null,
        "micro": null,
        "biostim": null,
        "phyto": "Cu_oeil_paon",
        "irrigation": "reduction"
      },
      "nov": {
        "NPK": "N_reconstitution",
        "micro": null,
        "biostim": "humiques_granule",
        "phyto": "Cu_oeil_paon",
        "irrigation": "faible"
      },
      "dec": {
        "NPK": null,
        "micro": null,
        "biostim": "amines_post_recolte",
        "phyto": null,
        "irrigation": "tres_faible"
      }
    }
  },
  "couts_indicatifs_DH": {
    "nitrate_calcium_kg": [
      2.5,
      3.5
    ],
    "MAP_kg": [
      9,
      12
    ],
    "sulfate_potasse_kg": [
      8,
      11
    ],
    "sulfate_magnesium_kg": [
      3,
      5
    ],
    "Fe_EDDHA_kg": [
      45,
      65
    ],
    "acides_humiques_L": [
      35,
      55
    ],
    "extraits_algues_L": [
      60,
      90
    ],
    "acides_amines_L": [
      40,
      70
    ],
    "cuivre_hydroxyde_kg": [
      18,
      25
    ],
    "deltamethrine_L": [
      80,
      120
    ],
    "huile_blanche_L": [
      8,
      12
    ]
  },
  "gdd": {
    "tbase_c": 10,
    "plafond_c": 30,
    "reference": "Moriondo et al. 2001",
    "formule": "GDD_jour = max(0, (min(Tmax, 30) + max(Tmin, 10)) / 2 - 10)",
    "activation_forcing": {
      "condition_thermique": "Tmoy > 10",
      "condition_satellite": "hausse_NIRv_ou_NIRvP >= 20pct_vs_passage_precedent",
      "note": "Double condition obligatoire. Le GDD ne démarre pas à date fixe mais au point d'activation satellite + thermique confirmé."
    },
    "cumul_reset": "Remis à 0 quand dormance (Phase 0) se termine",
    "seuils_chill_units_par_variete": {
      "PM": [
        100,
        200
      ],
      "HAO": [
        100,
        150
      ],
      "MEN": [
        100,
        150
      ],
      "ARB": [
        200,
        400
      ],
      "ARS": [
        200,
        350
      ],
      "KOR": [
        150,
        300
      ],
      "PIC": [
        400,
        600
      ]
    },
    "calcul_chill_unit": "SI 0 < T_horaire < 7.2 : CU += 1 | Estimation si horaire indisponible : CU = heures_nuit × (7.2 - Tmin) / 7.2 si Tmin < 7.2"
  },
  "kc_par_periode": [
    {
      "stade": "repos",
      "mois": [
        "dec",
        "jan",
        "feb"
      ],
      "traditionnel": 0.4,
      "intensif": 0.5,
      "super_intensif": 0.55
    },
    {
      "stade": "debourrement",
      "mois": [
        "mar"
      ],
      "traditionnel": 0.45,
      "intensif": 0.55,
      "super_intensif": 0.6
    },
    {
      "stade": "croissance",
      "mois": [
        "apr"
      ],
      "traditionnel": 0.5,
      "intensif": 0.6,
      "super_intensif": 0.65
    },
    {
      "stade": "floraison",
      "mois": [
        "may"
      ],
      "traditionnel": 0.55,
      "intensif": 0.65,
      "super_intensif": 0.7
    },
    {
      "stade": "nouaison",
      "mois": [
        "jun"
      ],
      "traditionnel": 0.6,
      "intensif": 0.75,
      "super_intensif": 0.8
    },
    {
      "stade": "grossissement",
      "mois": [
        "jul",
        "aug"
      ],
      "traditionnel": 0.65,
      "intensif": 0.8,
      "super_intensif": 0.9
    },
    {
      "stade": "maturation",
      "mois": [
        "sep",
        "oct"
      ],
      "traditionnel": 0.55,
      "intensif": 0.65,
      "super_intensif": 0.7
    },
    {
      "stade": "post_recolte",
      "mois": [
        "nov"
      ],
      "traditionnel": 0.45,
      "intensif": 0.55,
      "super_intensif": 0.6
    }
  ],
  "formes_engrais": {
    "N": {
      "si_pH_sol_sup_7_2": [
        "Nitrate de calcium 15.5-0-0",
        "Ammonitrate 33.5%"
      ],
      "si_pH_sol_inf_7_2": [
        "Uree 46%",
        "Ammonitrate 33.5%"
      ],
      "si_option_C": [
        "Nitrate de calcium 15.5-0-0"
      ],
      "interdit_si_pH_sup_7_2": [
        "Uree 46%"
      ],
      "note": "Sur sol calcaire (pH > 7.2), urée = 50-60% pertes volatilisation. Formes nitrique ou ammoniacale stabilisée uniquement."
    },
    "P": {
      "application_fond": [
        "TSP 46%",
        "MAP 12-61-0"
      ],
      "fertigation": [
        "Acide phosphorique 75%"
      ],
      "si_option_C": {
        "condition": "pH_eau > 7.5 ET HCO3 > 500 mg/L",
        "produit": "Acide phosphorique (double effet: P + acidification)"
      }
    },
    "K": {
      "standard": [
        "Sulfate de potasse SOP 0-0-50"
      ],
      "besoin_NK_simultane": [
        "Nitrate de potasse NOP 13-0-46"
      ],
      "si_option_C": [
        "SOP uniquement"
      ],
      "interdit_si_option_C": "KCl — apporte Cl toxique",
      "note": "KCl interdit pour olivier (chlorures toxiques > 0.5%)"
    },
    "incompatibilite_cuve": "Ne JAMAIS mélanger Ca(NO3)2 avec phosphates ou sulfates dans la même cuve. Injecter séparément avec rinçage."
  },
  "microelements": {
    "Fe": {
      "condition_inclusion": "TOUJOURS si pH > 7.2 OU calcaire_actif > 5%",
      "chelate_selection": [
        {
          "si": "calcaire_actif < 5%",
          "forme": "Fe-EDTA ou Fe-DTPA"
        },
        {
          "si": "calcaire_actif 5-10%",
          "forme": "Fe-EDDHA 6%"
        },
        {
          "si": "calcaire_actif > 10%",
          "forme": "Fe-EDDHA 6% dose majorée ou fractionner en 3"
        }
      ],
      "dose_option_A": {
        "valeur": 10,
        "unite": "kg/ha/an",
        "mode": "fertigation"
      },
      "dose_option_B": {
        "valeur": 1.5,
        "unite": "kg/ha",
        "mode": "foliaire"
      },
      "stades": [
        "mar",
        "jun"
      ]
    },
    "Zn": {
      "condition_inclusion": "TOUJOURS sur sol calcaire",
      "forme": "Sulfate de zinc",
      "dose_option_A": {
        "valeur": 500,
        "unite": "g/ha",
        "mode": "foliaire"
      },
      "dose_option_B": {
        "valeur": 750,
        "unite": "g/ha",
        "mode": "foliaire"
      },
      "stades": [
        "mar"
      ]
    },
    "Mn": {
      "condition_inclusion": "TOUJOURS sur sol calcaire",
      "forme": "Sulfate de manganèse",
      "dose_option_A": {
        "valeur": 400,
        "unite": "g/ha",
        "mode": "foliaire"
      },
      "dose_option_B": {
        "valeur": 600,
        "unite": "g/ha",
        "mode": "foliaire"
      },
      "stades": [
        "mar"
      ]
    },
    "B": {
      "condition_inclusion": "TOUJOURS — obligatoire floraison",
      "forme": "Acide borique",
      "dose_option_A": {
        "valeur": 1,
        "unite": "kg/ha",
        "mode": "foliaire"
      },
      "dose_option_B": {
        "valeur": 1.5,
        "unite": "kg/ha",
        "mode": "foliaire"
      },
      "stades": [
        "may"
      ],
      "si_deficit_heures_froid": "+50% dose floraison"
    },
    "Mg": {
      "condition_inclusion": "SI Mg_sol < 150 ppm OU analyse sol absente",
      "forme": "Sulfate de magnésium",
      "dose_option_A": {
        "valeur": 5,
        "unite": "kg/ha",
        "mode": "foliaire"
      },
      "dose_option_B": {
        "valeur": 7,
        "unite": "kg/ha",
        "mode": "foliaire"
      },
      "stades": [
        "apr",
        "jun"
      ]
    },
    "note": "Fe, B, Zn, Mn et biostimulants de base sont des composantes OBLIGATOIRES sur sol calcaire — pas des options."
  },
  "rdi": {
    "conditions_activation": [
      "systeme IN ['intensif', 'super_intensif']",
      "historique_satellite >= 24 mois",
      "option_C == false"
    ],
    "periodes": [
      {
        "stade": "floraison_nouaison",
        "bbch": "55-71",
        "rdi_autorise": false,
        "reduction_max_pct": 0,
        "note": "JAMAIS de RDI floraison/nouaison — stade très sensible"
      },
      {
        "stade": "grossissement_II",
        "mois": "aug",
        "rdi_autorise": true,
        "reduction_max_pct": 30
      },
      {
        "stade": "maturation",
        "mois": "sep",
        "rdi_autorise": true,
        "reduction_max_pct": 40
      },
      {
        "stade": "pre_recolte",
        "mois": "Oct-Nov",
        "rdi_autorise": true,
        "reduction_max_pct": 50
      }
    ]
  },
  "co_occurrence": {
    "_description": "Actions combinées quand deux alertes se déclenchent simultanément. Déterministe — l'IA applique cette matrice, elle ne décide pas.",
    "regles": [
      {
        "alertes": [
          "OLI-01",
          "OLI-16"
        ],
        "lien": "Stress hydrique bloque absorption N même si N disponible.",
        "action": "Traiter d'abord OLI-01 (irrigation). Attendre 7-10j. Réévaluer OLI-16."
      },
      {
        "alertes": [
          "OLI-02",
          "OLI-16"
        ],
        "lien": "Idem OLI-01 + OLI-16.",
        "action": "Traiter d'abord OLI-02 (irrigation). Attendre 7-10j. Réévaluer OLI-16."
      },
      {
        "alertes": [
          "OLI-01",
          "OLI-07"
        ],
        "lien": "Canicule CAUSE le stress hydrique (ETP explose).",
        "action": "Action combinée : +50% irrigation (prendre le max des deux). Algues fertigation."
      },
      {
        "alertes": [
          "OLI-02",
          "OLI-07"
        ],
        "lien": "Canicule CAUSE stress hydrique.",
        "action": "Action combinée : +50% irrigation. Algues fertigation."
      },
      {
        "alertes": [
          "OLI-01",
          "OLI-15"
        ],
        "lien": "Chergui CAUSE stress hydrique aigu.",
        "action": "Action combinée : +50% irrigation (Chergui prime). Suspendre tout foliaire."
      },
      {
        "alertes": [
          "OLI-04",
          "OLI-07"
        ],
        "lien": "CONTRADICTOIRE — canicule tue le champignon œil de paon.",
        "action": "Annuler OLI-04. Maintenir OLI-07 seul."
      },
      {
        "alertes": [
          "OLI-04",
          "OLI-18"
        ],
        "lien": "Traitement Cu lessivé → œil de paon non traité.",
        "action": "Renouveler Cu immédiatement (OLI-18 prime, même si délai < 7j)."
      },
      {
        "alertes": [
          "OLI-03",
          "OLI-13"
        ],
        "lien": "Gel pendant floraison CAUSE floraison ratée.",
        "action": "Appliquer OLI-03 (aminés récupération). OLI-13 s'applique ensuite (ajustement plan)."
      },
      {
        "alertes": [
          "OLI-09",
          "OLI-13"
        ],
        "lien": "Année OFF + floraison ratée = double impact.",
        "action": "Cumuler les deux ajustements. Rendement : -60 à -80%."
      },
      {
        "alertes": [
          "OLI-10",
          "OLI-06"
        ],
        "lien": "Dépérissement peut ÊTRE la verticilliose.",
        "action": "Appliquer OLI-06 (investigation). Si non confirmée, maintenir OLI-10."
      },
      {
        "alertes": [
          "OLI-16",
          "OLI-12"
        ],
        "lien": "Sur-irrigation peut lessiver N → carence N induite.",
        "action": "Traiter d'abord OLI-12 (réduire irrigation). Attendre 10j. Réévaluer OLI-16."
      },
      {
        "alertes": [
          "OLI-19",
          "OLI-20"
        ],
        "lien": "Accumulation saline + toxicité Cl = même problème, stade avancé.",
        "action": "Appliquer OLI-20 (urgence Cl). OLI-19 se résout en parallèle."
      }
    ],
    "regle_defaut": "En cas de co-occurrence non listée : appliquer priorité standard 🔴 > 🟠 > 🟡 > 🟢. Traiter alertes séquentiellement, pas simultanément."
  },
  "protocole_phenologique": {
    "filtrage": {
      "_description": "Le filtrage se déroule en deux temps. L'IA ne refait pas le travail déjà fait.",
      "fait_au_telechargement": {
        "_quand": "Automatiquement à la création de la parcelle, avant tout calibrage",
        "_qui": "Système de téléchargement satellite (pas l'IA calibrage)",
        "masque_nuageux": "SCL pixel ∈ {4 (végétation), 5 (sol nu)} — dates avec 0 pixel valide exclues",
        "seuil_pixels_minimum": "Dates avec < 5 pixels purs sur AOI exclues",
        "buffer_negatif_m": 10,
        "calcul_indices": "NDVI, EVI, NIRv, NIRvP, GCI, NDRE calculés et stockés en base de données",
        "agregation": "MÉDIANE des pixels purs par date valide — valeur unique par indice par date stockée en DB",
        "NIRvP_formule": "NIRv × PAR_jour (PAR = SSR × 0.48 / 1e6, source ERA5, unité MJ/m²)",
        "resultat_en_db": "La DB contient la série temporelle propre : une ligne par date valide avec NDVI, NIRv, NDMI, NDRE, EVI, GCI, NIRvP"
      },
      "fait_au_calibrage": {
        "_quand": "Quand l'utilisateur lance le calibrage — l'IA lit la série depuis la DB",
        "_qui": "Moteur calibrage IA — opère sur les données déjà filtrées de la DB",
        "plausibilite_temporelle": {
          "condition_artefact": "|V(t) - V(t-1)| / V(t-1) > 0.30",
          "confirmation": "Si dans les 10 jours suivants V revient à ±10% de V(t-1) → artefact confirmé",
          "action": "Marquer la date comme suspecte et l'exclure de la série de calcul"
        },
        "filtre_annee_pluviometrique_extreme": {
          "execution": "Annuelle — appliqué en fin de cycle sur l'historique complet",
          "condition": "Précipitations annuelles > moyenne historique + 2σ",
          "action": "Marquer le cycle comme hors_norme — exclure du calibrage adaptatif, conserver pour documentation"
        },
        "lissage": {
          "execution": "Après accumulation de données suffisantes (série complète disponible)",
          "methode_principale": "Whittaker lambda 10-100",
          "methode_alternative": "Savitzky-Golay fenêtre 5-7 points polynôme ordre 2",
          "applique_sur": "Chaque série temporelle d'indice après exclusion des artefacts"
        }
      }
    },
    "phases_par_maturite": {
      "juvenile": [
        "DORMANCE",
        "DEBOURREMENT",
        "CROISSANCE",
        "FLORAISON",
        "POST_RECOLTE"
      ],
      "entree_production": null,
      "pleine_production": null,
      "maturite_avancee": null,
      "senescence": null
    },
    "calculs_preliminaires": {
      "GDD_jour": "max(0, (min(Tmax, Tplafond) + max(Tmin, Tbase)) / 2 - Tbase)",
      "NIRvP_norm": "(NIRvP - NIRvP_min_hist) / (NIRvP_max_hist - NIRvP_min_hist)",
      "Perte_NDVI": "(NDVI_pic_cycle - NDVI_actuel) / NDVI_pic_cycle",
      "Perte_NIRv": "(NIRv_pic_cycle - NIRv_actuel) / NIRv_pic_cycle",
      "Ratio_decouplage": "Perte_NIRv / max(Perte_NDVI, 0.01)"
    }
  },
  "signaux": {
    "streaks": {
      "warm_streak": {
        "var": "Tmoy",
        "gt_var": "Tmoy_Q25"
      },
      "cold_streak": {
        "var": "Tmoy",
        "lt_var": "Tmoy_Q25"
      },
      "hot_streak": {
        "var": "Tmoy",
        "gt": 25
      },
      "hot_dry_streak": {
        "and": [
          {
            "var": "Tmax",
            "gt": 30
          },
          {
            "var": "precip_30j",
            "lt": 5
          }
        ]
      }
    }
  },
  "phases_config": {
    "_note": "Phase transition config. GDD from stades_bbch is the primary trigger. Satellite conditions are optional confidence boosters.",
    "repos": {
      "nom": "Dormance hivernale",
      "state_key": "DORMANCE",
      "exit_conditions": [
        {
          "var": "chill_satisfied",
          "eq": true
        }
      ],
      "on_exit": {
        "reset": [
          "GDD_cumul"
        ]
      }
    },
    "debourrement": {
      "nom": "Débourrement",
      "state_key": "DEBOURREMENT",
      "exit_conditions": []
    },
    "croissance": {
      "nom": "Croissance végétative",
      "state_key": "CROISSANCE",
      "exit_conditions": []
    },
    "floraison": {
      "nom": "Floraison",
      "state_key": "FLORAISON",
      "exit_conditions": []
    },
    "nouaison": {
      "nom": "Nouaison",
      "state_key": "NOUAISON",
      "exit_conditions": []
    },
    "grossissement": {
      "nom": "Grossissement du fruit",
      "state_key": "GROSSISSEMENT",
      "exit_conditions": []
    },
    "maturation": {
      "nom": "Maturation / Véraison",
      "state_key": "MATURATION",
      "exit_conditions": []
    },
    "post_recolte": {
      "nom": "Post-récolte",
      "state_key": "POST_RECOLTE",
      "exit_conditions": [
        {
          "var": "cold_streak",
          "gte": 10
        }
      ],
      "on_exit": {
        "reset": [
          "GDD_cumul"
        ]
      }
    }
  }
}
$crop_ai_ref_olivier$::jsonb
)
ON CONFLICT (crop_type) DO UPDATE SET
  version = EXCLUDED.version,
  reference_data = EXCLUDED.reference_data,
  updated_at = NOW();

INSERT INTO public.crop_ai_references (crop_type, version, reference_data)
VALUES (
  'palmier_dattier',
  '1.0',
  $crop_ai_ref_palmier_dattier${
  "metadata": {
    "version": "1.0",
    "date": "2026-02",
    "culture": "palmier_dattier",
    "nom_scientifique": "Phoenix dactylifera L.",
    "famille": "Arecaceae",
    "pays": "Maroc"
  },
  "phenological_stages": [
    {
      "key": "winter_rest",
      "name_fr": "Repos hivernal",
      "name_en": "Winter rest",
      "name_ar": "الراحة الشتوية",
      "months": [12, 1, 2],
      "thresholds": [
        { "key": "frost_risk", "label_fr": "Risque de gel", "label_en": "Frost risk", "compare": "below", "value": 0, "unit": "h", "icon": "snowflake" }
      ]
    },
    {
      "key": "pollination",
      "name_fr": "Pollinisation",
      "name_en": "Pollination",
      "name_ar": "التلقيح",
      "months": [3, 4, 5],
      "thresholds": [
        { "key": "optimal_pollination", "label_fr": "Conditions optimales", "label_en": "Optimal conditions", "compare": "between", "value": 25, "upper": 35, "unit": "h", "icon": "leaf" },
        { "key": "cool_pollination", "label_fr": "Trop frais", "label_en": "Too cool", "compare": "below", "value": 18, "unit": "h", "icon": "snowflake" }
      ]
    },
    {
      "key": "fruit_development",
      "name_fr": "Développement des fruits",
      "name_en": "Fruit development",
      "name_ar": "نمو الثمار",
      "months": [6, 7, 8, 9, 10],
      "thresholds": [
        { "key": "growing_hours", "label_fr": "Heures de croissance", "label_en": "Growing hours", "compare": "above", "value": 18, "unit": "h", "icon": "sun" },
        { "key": "extreme_heat", "label_fr": "Chaleur extrême", "label_en": "Extreme heat", "compare": "above", "value": 45, "unit": "h", "icon": "flame" }
      ]
    }
  ],
  "phases_maturite_ans": {
    "juvenile": [
      0,
      5
    ],
    "entree_production": [
      5,
      10
    ],
    "pleine_production": [
      10,
      40
    ],
    "maturite_avancee": [
      40,
      60
    ],
    "senescence": [
      60,
      200
    ]
  },
  "gdd": {
    "tbase_c": 18.0,
    "plafond_c": 45.0,
    "reference": "Calibration engine — date palm growing degree days (caps)"
  },
  "seuils_meteo": {
    "gel": {
      "threshold_c": -5.0,
      "detection_months": [
        1,
        2,
        3
      ],
      "severity": "high"
    },
    "canicule": {
      "tmax_c": 45.0,
      "consecutive_days": 3,
      "severity": "high"
    },
    "vent_chaud": {
      "temperature_c": 42.0,
      "wind_kmh": 60.0,
      "humidity_max_pct": 25.0,
      "severity": "medium"
    },
    "secheresse": {
      "rain_mm_max_per_day": 5.0,
      "dry_season_days": 90,
      "transition_days": 45,
      "rainy_season_days": 45,
      "severity": "medium"
    }
  },
  "capacites_calibrage": {
    "supported": true,
    "phenology_mode": "state_machine",
    "subtypes": {
      "traditionnel": {
        "required_indices": [
          "NDVI",
          "NIRv",
          "NDMI",
          "NDRE",
          "EVI",
          "MSAVI",
          "MSI",
          "GCI"
        ]
      },
      "intensif": {
        "required_indices": [
          "NDVI",
          "NIRv",
          "NDMI",
          "NDRE",
          "EVI",
          "MSAVI",
          "MSI",
          "GCI"
        ]
      }
    },
    "min_observed_images": 10,
    "min_history_days": 120,
    "min_history_months_for_period_percentiles": 24,
    "required_indices": [
      "NDVI",
      "NIRv",
      "NDMI",
      "NDRE",
      "EVI",
      "MSAVI",
      "MSI",
      "GCI"
    ]
  },
  "caracteristiques_generales": {
    "type": "monocotyledone_arborescente",
    "origine": "Mesopotamie_Golfe_Persique",
    "duree_vie_ans": [
      100,
      150
    ],
    "production_economique_ans": [
      60,
      80
    ],
    "hauteur_adulte_m": [
      15,
      25
    ],
    "systeme_racinaire": "fascicule_profond_6m",
    "sexualite": "dioique",
    "pollinisation": "manuelle_en_culture"
  },
  "exigences_climatiques": {
    "temperature_optimale_C": [
      32,
      38
    ],
    "temperature_max_toleree_C": 50,
    "temperature_min_vegetative_C": 7,
    "gel_palmes_C": [
      -5,
      -7
    ],
    "gel_mortel_C": [
      -10,
      -12
    ],
    "GDD_floraison_recolte": 5000,
    "HR_optimale_pct": 40,
    "HR_critique_maturation_pct": 70
  },
  "tolerance_salinite": {
    "CE_eau_sans_perte_dS_m": 4,
    "CE_eau_perte_10pct_dS_m": 6,
    "CE_eau_perte_25pct_dS_m": 10,
    "CE_eau_perte_50pct_dS_m": 15,
    "note": "PLUS TOLERANT salinité de toutes cultures fruitières - 8x plus que avocatier"
  },
  "varietes": [
    {
      "code": "MEJHOUL",
      "nom": "Mejhoul",
      "type": "molle",
      "poids_g": [
        15,
        25
      ],
      "qualite": "premium_export",
      "bayoud": "sensible",
      "productivite_kg": [
        80,
        120
      ]
    },
    {
      "code": "BOUFEGGOUS",
      "nom": "Boufeggous",
      "type": "molle",
      "poids_g": [
        8,
        12
      ],
      "qualite": "excellente",
      "bayoud": "sensible",
      "productivite_kg": [
        60,
        100
      ]
    },
    {
      "code": "JIHEL",
      "nom": "Jihel",
      "type": "semi_molle",
      "poids_g": [
        6,
        10
      ],
      "qualite": "bonne",
      "bayoud": "tolerante",
      "productivite_kg": [
        70,
        100
      ]
    },
    {
      "code": "BOUSKRI",
      "nom": "Bouskri",
      "type": "semi_molle",
      "poids_g": [
        5,
        8
      ],
      "qualite": "bonne",
      "bayoud": "tolerante",
      "productivite_kg": [
        50,
        80
      ]
    },
    {
      "code": "BOUSLIKHENE",
      "nom": "Bouslikhène",
      "type": "seche",
      "poids_g": [
        4,
        7
      ],
      "qualite": "moyenne",
      "bayoud": "resistante",
      "productivite_kg": [
        60,
        90
      ]
    }
  ],
  "varietes_calibrage": [
    {
      "code": "MEJHOUL",
      "nom": "Mejhoul",
      "aliases": [
        "Medjool"
      ],
      "yield_unit": "kg/tree",
      "reference_range_kg_arbre": [
        80,
        120
      ]
    },
    {
      "code": "BOUFEGGOUS",
      "nom": "Boufeggous",
      "yield_unit": "kg/tree",
      "reference_range_kg_arbre": [
        60,
        100
      ]
    },
    {
      "code": "JIHEL",
      "nom": "Jihel",
      "yield_unit": "kg/tree",
      "reference_range_kg_arbre": [
        70,
        100
      ]
    },
    {
      "code": "BOUSKRI",
      "nom": "Bouskri",
      "yield_unit": "kg/tree",
      "reference_range_kg_arbre": [
        50,
        80
      ]
    },
    {
      "code": "BOUSLIKHENE",
      "nom": "Bouslikhène",
      "yield_unit": "kg/tree",
      "reference_range_kg_arbre": [
        60,
        90
      ]
    }
  ],
  "pollinisation": {
    "type": "manuelle_obligatoire",
    "ratio_males_pct": [
      1,
      2
    ],
    "fenetre_jours": [
      1,
      3
    ],
    "methode": "insertion_brins_ou_pulverisation",
    "passages": [
      2,
      3
    ],
    "conservation_pollen": {
      "frais": "1-2 jours",
      "refrigere_4C": "2-4 semaines",
      "congele": "6-12 mois"
    }
  },
  "systemes": {
    "traditionnel_oasien": {
      "densite": [
        80,
        120
      ],
      "indice_cle": "NDVI",
      "irrigation": "khettara_seguia",
      "rendement_t_ha": [
        3,
        6
      ]
    },
    "semi_intensif": {
      "densite": [
        120,
        150
      ],
      "indice_cle": "NDVI",
      "irrigation": "gravitaire_ameliore",
      "rendement_t_ha": [
        6,
        10
      ]
    },
    "intensif": {
      "densite": [
        150,
        200
      ],
      "indice_cle": "NDVI",
      "irrigation": "goutte_a_goutte",
      "rendement_t_ha": [
        10,
        15
      ]
    }
  },
  "seuils_satellite": {
    "traditionnel": {
      "NDVI_optimal": [
        0.35,
        0.55
      ],
      "NDVI_alerte": 0.25,
      "NDMI_optimal": [
        0.05,
        0.2
      ]
    },
    "traditionnel_oasien": {
      "NDVI": {
        "optimal": [
          0.35,
          0.55
        ],
        "vigilance": 0.3,
        "alerte": 0.25
      },
      "NDMI": {
        "optimal": [
          0.05,
          0.2
        ],
        "vigilance": 0.03,
        "alerte": 0.0
      }
    },
    "semi_intensif": {
      "NDVI": {
        "optimal": [
          0.4,
          0.6
        ],
        "vigilance": 0.35,
        "alerte": 0.3
      },
      "NDMI": {
        "optimal": [
          0.08,
          0.24
        ],
        "vigilance": 0.05,
        "alerte": 0.02
      }
    },
    "intensif": {
      "NDVI": {
        "optimal": [
          0.45,
          0.65
        ],
        "vigilance": 0.4,
        "alerte": 0.35
      },
      "NDMI": {
        "optimal": [
          0.1,
          0.28
        ],
        "vigilance": 0.06,
        "alerte": 0.03
      },
      "NDVI_optimal": [
        0.45,
        0.65
      ],
      "NDVI_alerte": 0.35,
      "NDMI_optimal": [
        0.1,
        0.28
      ]
    }
  },
  "nutrition": {
    "export_kg_100kg_dattes": {
      "N": [
        0.8,
        1.2
      ],
      "P2O5": [
        0.2,
        0.4
      ],
      "K2O": [
        1.5,
        2.5
      ]
    },
    "besoins_intensif_Mejhoul_kg_arbre": {
      "N": [
        1.5,
        2.5
      ],
      "P2O5": [
        0.5,
        0.8
      ],
      "K2O": [
        2.5,
        4.0
      ]
    },
    "fractionnement": {
      "jan_fev": {
        "N": 20,
        "P": 40,
        "K": 10
      },
      "mar_avr": {
        "N": 25,
        "P": 30,
        "K": 15
      },
      "mai_juin": {
        "N": 25,
        "P": 20,
        "K": 25
      },
      "juil_aout": {
        "N": 15,
        "P": 10,
        "K": 30
      },
      "sept_oct": {
        "N": 5,
        "P": 0,
        "K": 15
      },
      "nov_dec": {
        "N": 10,
        "P": 0,
        "K": 5
      }
    },
    "note_K": "Potassium CRITIQUE pour qualité dattes"
  },
  "seuils_foliaires": {
    "N_pct": {
      "carence": 1.8,
      "optimal": [
        2.2,
        2.8
      ]
    },
    "P_pct": {
      "carence": 0.1,
      "optimal": [
        0.14,
        0.2
      ]
    },
    "K_pct": {
      "carence": 0.8,
      "optimal": [
        1.2,
        1.8
      ]
    },
    "Mg_pct": {
      "carence": 0.15,
      "optimal": [
        0.25,
        0.5
      ]
    }
  },
  "irrigation": {
    "besoins_m3_arbre_an": {
      "traditionnel": [
        15,
        25
      ],
      "intensif": [
        12,
        20
      ]
    },
    "Kc": {
      "hiver": 0.75,
      "printemps": 0.8,
      "ete": 1.0,
      "automne": 0.85
    },
    "frequence_ete_gag": "3-4x/sem ou quotidien"
  },
  "phytosanitaire": {
    "bayoud": {
      "agent": "Fusarium oxysporum f. sp. albedinis",
      "gravite": "MORTELLE_INCURABLE",
      "traitement": "AUCUN",
      "prevention": [
        "plants_certifies",
        "varietes_tolerantes",
        "destruction_arbres_atteints"
      ]
    },
    "autres_maladies": [
      "Khamedj",
      "Graphiola",
      "Pourriture_coeur"
    ],
    "ravageurs": [
      "Cochenille_blanche",
      "Boufaroua",
      "Pyrale_dattes",
      "Charancon_rouge_MENACE"
    ]
  },
  "stades_maturite": {
    "Hababouk": "Fruit noué",
    "Kimri": "Vert croissance",
    "Khalal": "Jaune/rouge dur",
    "Rutab": "Ramollissement partiel",
    "Tamr": "Maturité complète"
  },
  "alertes": [
    {
      "code": "PAL-01",
      "nom": "Stress hydrique",
      "priorite": "urgente"
    },
    {
      "code": "PAL-05",
      "nom": "Pluie maturation",
      "priorite": "urgente"
    },
    {
      "code": "PAL-08",
      "nom": "Suspicion Bayoud",
      "priorite": "critique"
    },
    {
      "code": "PAL-09",
      "nom": "Bayoud confirmé",
      "priorite": "critique"
    },
    {
      "code": "PAL-13",
      "nom": "Pollinisation requise",
      "priorite": "urgente"
    },
    {
      "code": "PAL-16",
      "nom": "Maturité récolte",
      "priorite": "info"
    }
  ],
  "modele_predictif": {
    "precision_intensif": {
      "R2": [
        0.5,
        0.65
      ],
      "MAE_pct": [
        25,
        35
      ]
    },
    "limite_majeure": "Pluie maturation imprévisible - peut détruire 30-80% récolte"
  },
  "plan_annuel_Mejhoul": {
    "jan": {
      "NPK": "N0.3+P0.3+K0.3",
      "travaux": "Taille"
    },
    "fev": {
      "NPK": "N0.4+P0.2+K0.2",
      "phyto": "Cuivre spathes"
    },
    "mar": {
      "NPK": "N0.4+K0.4",
      "travaux": "POLLINISATION"
    },
    "avr": {
      "NPK": "N0.3+P0.1+K0.5",
      "travaux": "Attachage"
    },
    "mai": {
      "NPK": "N0.3+K0.6",
      "travaux": "Éclaircissage"
    },
    "juin": {
      "NPK": "K0.8",
      "phyto": "Soufre Boufaroua"
    },
    "juil": {
      "NPK": "K0.8",
      "travaux": "Protection régimes"
    },
    "aout": {
      "NPK": "K0.5",
      "travaux": "Surveillance"
    },
    "sept": {
      "NPK": "K0.3",
      "travaux": "Début récolte"
    },
    "oct": {
      "travaux": "Récolte principale"
    },
    "nov": {
      "NPK": "N0.2",
      "phyto": "Huile cochenilles"
    },
    "dec": {
      "amendement": "Fumier 40kg",
      "travaux": "Entretien"
    }
  },
  "protocole_phenologique": {
    "phases_par_maturite": {
      "juvenile": [
        "repos",
        "debourrement",
        "floraison",
        "post_recolte"
      ],
      "entree_production": null,
      "pleine_production": null,
      "senescence": null
    },
    "phases": {
      "_note": "Machine à états sur l'historique. Chaque phase a conditions entrée et sortie structurées. GDD calculé depuis referentiel.gdd.",
      "calculs_preliminaires": {
        "GDD_jour": "max(0, (min(Tmax, Tplafond) + max(Tmin, Tbase)) / 2 - Tbase)",
        "NIRvP_norm": "(NIRvP - NIRvP_min_hist) / (NIRvP_max_hist - NIRvP_min_hist)",
        "dNDVI_dt": "(NDVI(t) - NDVI(t-1)) / jours_entre_acquisitions",
        "dNIRv_dt": "(NIRv(t) - NIRv(t-1)) / jours_entre_acquisitions",
        "Perte_NDVI": "(NDVI_pic_cycle - NDVI_actuel) / NDVI_pic_cycle",
        "Perte_NIRv": "(NIRv_pic_cycle - NIRv_actuel) / NIRv_pic_cycle",
        "Ratio_decouplage": "Perte_NIRv / max(Perte_NDVI, 0.01)"
      },
      "DORMANCE": {
        "nom": "Dormance hivernale",
        "skip_when": {
          "var": "Tmoy_Q25",
          "gte": 15
        },
        "entry": {
          "when": {
            "and": [
              {
                "var": "Tmoy",
                "lt_var": "Tmoy_Q25"
              },
              {
                "var": "NIRv_norm",
                "lte": 0.15
              }
            ]
          }
        },
        "exit": [
          {
            "target": "DEBOURREMENT",
            "when": {
              "and": [
                {
                  "var": "chill_satisfied",
                  "eq": true
                },
                {
                  "var": "warm_streak",
                  "gte": 10
                }
              ]
            },
            "on_enter": {
              "reset": [
                "GDD_cumul"
              ]
            },
            "confidence": "MODEREE"
          }
        ]
      },
      "DEBOURREMENT": {
        "nom": "Débourrement",
        "entry": {},
        "exit": [
          {
            "target": "FLORAISON",
            "when": {
              "and": [
                {
                  "var": "GDD_cumul",
                  "gte": 350
                },
                {
                  "var": "Tmoy",
                  "gte": 18
                }
              ]
            },
            "confidence": "MODEREE"
          }
        ]
      },
      "FLORAISON": {
        "nom": "Floraison",
        "entry": {},
        "exit": [
          {
            "target": "NOUAISON",
            "when": {
              "or": [
                {
                  "var": "GDD_cumul",
                  "gt": 700
                },
                {
                  "var": "hot_streak",
                  "gte": 5
                }
              ]
            },
            "confidence": "MODEREE"
          }
        ]
      },
      "NOUAISON": {
        "nom": "Nouaison / Clarification",
        "entry": {},
        "exit": [
          {
            "target": "STRESS_ESTIVAL",
            "when": {
              "var": "hot_dry_streak",
              "gte": 3
            },
            "confidence": "ELEVEE"
          }
        ]
      },
      "STRESS_ESTIVAL": {
        "nom": "Stress estival + Maturation",
        "entry": {},
        "exit": [
          {
            "target": "REPRISE_AUTOMNALE",
            "when": {
              "and": [
                {
                  "var": "precip_30j",
                  "gt": 20
                },
                {
                  "var": "Tmoy",
                  "lt": 25
                },
                {
                  "var": "d_nirv_dt",
                  "gt": 0
                }
              ]
            },
            "confidence": "MODEREE"
          },
          {
            "target": "DORMANCE",
            "when": {
              "var": "cold_streak",
              "gte": 10
            },
            "confidence": "ELEVEE"
          }
        ]
      },
      "REPRISE_AUTOMNALE": {
        "nom": "Reprise automnale",
        "entry": {},
        "exit": [
          {
            "target": "DORMANCE",
            "when": {
              "var": "cold_streak",
              "gte": 10
            },
            "on_enter": {
              "reset": [
                "GDD_cumul"
              ]
            },
            "confidence": "ELEVEE"
          }
        ]
      }
    }
  },
  "stades_bbch": [
    {
      "code": "00",
      "nom": "Repos hivernal",
      "mois": [
        "dec",
        "jan",
        "feb"
      ],
      "gdd_cumul": [
        0,
        30
      ],
      "coef_nirvp": 0.3,
      "phase_kc": "repos"
    },
    {
      "code": "07",
      "nom": "Spathe visible",
      "mois": [
        "feb",
        "mar"
      ],
      "gdd_cumul": [
        30,
        80
      ],
      "coef_nirvp": 0.3,
      "phase_kc": "debourrement"
    },
    {
      "code": "51",
      "nom": "Émission inflorescence",
      "mois": [
        "mar"
      ],
      "gdd_cumul": [
        80,
        180
      ],
      "coef_nirvp": 0.4,
      "phase_kc": "floraison"
    },
    {
      "code": "60",
      "nom": "Début pollinisation",
      "mois": [
        "mar",
        "apr"
      ],
      "gdd_cumul": [
        180,
        350
      ],
      "coef_nirvp": 0.5,
      "phase_kc": "floraison"
    },
    {
      "code": "65",
      "nom": "Pleine pollinisation",
      "mois": [
        "apr"
      ],
      "gdd_cumul": [
        350,
        500
      ],
      "coef_nirvp": 0.6,
      "phase_kc": "floraison"
    },
    {
      "code": "69",
      "nom": "Hababouk (nouaison)",
      "mois": [
        "apr",
        "may"
      ],
      "gdd_cumul": [
        500,
        800
      ],
      "coef_nirvp": 0.7,
      "phase_kc": "nouaison"
    },
    {
      "code": "71",
      "nom": "Kimri (fruit vert)",
      "mois": [
        "may",
        "jun"
      ],
      "gdd_cumul": [
        800,
        1400
      ],
      "coef_nirvp": 0.8,
      "phase_kc": "grossissement"
    },
    {
      "code": "75",
      "nom": "Khalal (fruit jaune)",
      "mois": [
        "jun",
        "jul"
      ],
      "gdd_cumul": [
        1400,
        2200
      ],
      "coef_nirvp": 0.9,
      "phase_kc": "grossissement"
    },
    {
      "code": "79",
      "nom": "Routab (ramollissement)",
      "mois": [
        "jul",
        "aug"
      ],
      "gdd_cumul": [
        2200,
        3000
      ],
      "coef_nirvp": 1.0,
      "phase_kc": "grossissement"
    },
    {
      "code": "85",
      "nom": "Tamar début",
      "mois": [
        "aug",
        "sep"
      ],
      "gdd_cumul": [
        3000,
        3600
      ],
      "coef_nirvp": 0.9,
      "phase_kc": "maturation"
    },
    {
      "code": "89",
      "nom": "Tamar maturité récolte",
      "mois": [
        "sep",
        "oct"
      ],
      "gdd_cumul": [
        3600,
        4200
      ],
      "coef_nirvp": 0.7,
      "phase_kc": "maturation"
    },
    {
      "code": "92",
      "nom": "Post-récolte",
      "mois": [
        "oct",
        "nov",
        "dec"
      ],
      "gdd_cumul": [
        4200,
        4500
      ],
      "coef_nirvp": 0.4,
      "phase_kc": "post_recolte"
    }
  ],
  "signaux": {
    "streaks": {
      "warm_streak": {
        "var": "Tmoy",
        "gt_var": "Tmoy_Q25"
      },
      "cold_streak": {
        "var": "Tmoy",
        "lt_var": "Tmoy_Q25"
      },
      "hot_streak": {
        "var": "Tmoy",
        "gt": 35
      },
      "hot_dry_streak": {
        "and": [
          {
            "var": "Tmax",
            "gt": 40
          },
          {
            "var": "precip_30j",
            "lt": 5
          }
        ]
      }
    }
  }
}
$crop_ai_ref_palmier_dattier$::jsonb
)
ON CONFLICT (crop_type) DO UPDATE SET
  version = EXCLUDED.version,
  reference_data = EXCLUDED.reference_data,
  updated_at = NOW();


-- =====================================================
-- Inline reference seeds moved from schema.sql
-- =====================================================

-- account_templates — Morocco (CGNC) (was schema.sql lines 841-893)
-- Morocco (CGNC - Plan Comptable des Établissements de Crédit adapted for agriculture)
INSERT INTO account_templates (country_code, accounting_standard, template_name, account_code, account_name, account_type, is_group, display_order, description) VALUES
  -- Class 1: Financement permanent
  ('MA', 'CGNC', 'Financement permanent', '1', 'Financement permanent', 'equity', true, 10, 'Permanent financing'),
  ('MA', 'CGNC', 'Capital social', '111', 'Capital social', 'equity', false, 11, 'Share capital'),
  ('MA', 'CGNC', 'Réserves', '112', 'Réserves', 'equity', false, 12, 'Reserves'),
  ('MA', 'CGNC', 'Report à nouveau', '116', 'Report à nouveau', 'equity', false, 13, 'Retained earnings'),

  -- Class 2: Actif immobilisé
  ('MA', 'CGNC', 'Actif immobilisé', '2', 'Actif immobilisé', 'asset', true, 20, 'Fixed assets'),
  ('MA', 'CGNC', 'Terrains', '231', 'Terrains', 'asset', false, 21, 'Land'),
  ('MA', 'CGNC', 'Constructions', '232', 'Constructions', 'asset', false, 22, 'Buildings'),
  ('MA', 'CGNC', 'Matériel et outillage agricole', '233', 'Matériel et outillage agricole', 'asset', false, 23, 'Agricultural equipment and tools'),
  ('MA', 'CGNC', 'Autres immobilisations corporelles', '238', 'Autres immobilisations corporelles', 'asset', false, 24, 'Other tangible fixed assets'),

  -- Class 3: Actif circulant
  ('MA', 'CGNC', 'Actif circulant', '3', 'Actif circulant', 'asset', true, 30, 'Current assets'),
  ('MA', 'CGNC', 'Stocks de matières premières', '311', 'Stocks de matières premières', 'asset', false, 31, 'Raw materials inventory'),
  ('MA', 'CGNC', 'Stocks de produits en cours', '313', 'Stocks de produits en cours', 'asset', false, 32, 'Work in progress inventory'),
  ('MA', 'CGNC', 'Stocks de produits finis', '315', 'Stocks de produits finis', 'asset', false, 33, 'Finished goods inventory'),
  ('MA', 'CGNC', 'Clients et comptes rattachés', '342', 'Clients et comptes rattachés', 'asset', false, 34, 'Accounts receivable'),

  -- Class 4: Passif circulant
  ('MA', 'CGNC', 'Passif circulant', '4', 'Passif circulant', 'liability', true, 40, 'Current liabilities'),
  ('MA', 'CGNC', 'Fournisseurs et comptes rattachés', '441', 'Fournisseurs et comptes rattachés', 'liability', false, 41, 'Accounts payable'),
  ('MA', 'CGNC', 'Organismes sociaux', '443', 'Organismes sociaux', 'liability', false, 42, 'Social security'),
  ('MA', 'CGNC', 'État - Impôts et taxes', '445', 'État - Impôts et taxes', 'liability', false, 43, 'State - Taxes'),

  -- Class 5: Trésorerie
  ('MA', 'CGNC', 'Trésorerie', '5', 'Trésorerie', 'asset', true, 50, 'Cash and cash equivalents'),
  ('MA', 'CGNC', 'Caisse', '511', 'Caisse', 'asset', false, 51, 'Cash'),
  ('MA', 'CGNC', 'Banques', '514', 'Banques', 'asset', false, 52, 'Banks'),

  -- Class 6: Charges
  ('MA', 'CGNC', 'Charges', '6', 'Charges', 'expense', true, 60, 'Expenses'),
  ('MA', 'CGNC', 'Achats de matières premières', '611', 'Achats de matières premières', 'expense', false, 61, 'Purchases of raw materials'),
  ('MA', 'CGNC', 'Achats de fournitures', '612', 'Achats de fournitures', 'expense', false, 62, 'Purchases of supplies'),
  ('MA', 'CGNC', 'Achats de produits agricoles', '613', 'Achats de produits agricoles', 'expense', false, 63, 'Purchases of agricultural products'),
  ('MA', 'CGNC', 'Achats de matériel et outillage', '617', 'Achats de matériel et outillage', 'expense', false, 64, 'Purchases of equipment and tools'),
  ('MA', 'CGNC', 'Autres achats', '618', 'Autres achats', 'expense', false, 65, 'Other purchases'),
  ('MA', 'CGNC', 'Charges de personnel', '621', 'Charges de personnel', 'expense', false, 66, 'Staff costs'),
  ('MA', 'CGNC', 'Cotisations sociales', '622', 'Cotisations sociales', 'expense', false, 67, 'Social security contributions'),
  ('MA', 'CGNC', 'Impôts et taxes', '631', 'Impôts et taxes', 'expense', false, 68, 'Taxes'),
  ('MA', 'CGNC', 'Charges d''intérêts', '641', 'Charges d''intérêts', 'expense', false, 69, 'Interest charges'),

  -- Class 7: Produits
  ('MA', 'CGNC', 'Produits', '7', 'Produits', 'revenue', true, 70, 'Revenue'),
  ('MA', 'CGNC', 'Ventes de produits agricoles', '711', 'Ventes de produits agricoles', 'revenue', false, 71, 'Sales of agricultural products'),
  ('MA', 'CGNC', 'Ventes de produits transformés', '712', 'Ventes de produits transformés', 'revenue', false, 72, 'Sales of processed products'),
  ('MA', 'CGNC', 'Prestations de services', '713', 'Prestations de services', 'revenue', false, 73, 'Services'),
  ('MA', 'CGNC', 'Autres produits d''exploitation', '718', 'Autres produits d''exploitation', 'revenue', false, 74, 'Other operating income'),
  ('MA', 'CGNC', 'Subventions d''exploitation', '751', 'Subventions d''exploitation', 'revenue', false, 75, 'Operating subsidies')
ON CONFLICT (country_code, accounting_standard, account_code) DO NOTHING;

-- account_templates — Tunisia (PCN) (was schema.sql lines 895-941)
-- Tunisia (PCN - Plan Comptable National)
INSERT INTO account_templates (country_code, accounting_standard, template_name, account_code, account_name, account_type, is_group, display_order, description) VALUES
  -- Class 1: Capitaux propres
  ('TN', 'PCN', 'Capitaux propres', '1', 'Capitaux propres', 'equity', true, 10, 'Equity'),
  ('TN', 'PCN', 'Capital social', '101', 'Capital social', 'equity', false, 11, 'Share capital'),
  ('TN', 'PCN', 'Réserves', '106', 'Réserves', 'equity', false, 12, 'Reserves'),
  ('TN', 'PCN', 'Report à nouveau', '110', 'Report à nouveau', 'equity', false, 13, 'Retained earnings'),

  -- Class 2: Immobilisations
  ('TN', 'PCN', 'Immobilisations', '2', 'Immobilisations', 'asset', true, 20, 'Fixed assets'),
  ('TN', 'PCN', 'Terrains', '221', 'Terrains', 'asset', false, 21, 'Land'),
  ('TN', 'PCN', 'Constructions', '223', 'Constructions', 'asset', false, 22, 'Buildings'),
  ('TN', 'PCN', 'Autres immobilisations corporelles', '228', 'Autres immobilisations corporelles', 'asset', false, 23, 'Other tangible assets'),
  ('TN', 'PCN', 'Matériel agricole', '231', 'Matériel agricole', 'asset', false, 24, 'Agricultural equipment'),

  -- Class 3: Stocks
  ('TN', 'PCN', 'Stocks', '3', 'Stocks', 'asset', true, 30, 'Inventory'),
  ('TN', 'PCN', 'Matières premières', '31', 'Matières premières', 'asset', false, 31, 'Raw materials'),
  ('TN', 'PCN', 'Autres approvisionnements', '32', 'Autres approvisionnements', 'asset', false, 32, 'Other supplies'),
  ('TN', 'PCN', 'Stocks de produits finis', '35', 'Stocks de produits finis', 'asset', false, 33, 'Finished goods'),

  -- Class 4: Tiers
  ('TN', 'PCN', 'Tiers', '4', 'Tiers', 'asset', true, 40, 'Third parties'),
  ('TN', 'PCN', 'Fournisseurs', '401', 'Fournisseurs', 'liability', false, 41, 'Suppliers'),
  ('TN', 'PCN', 'Clients', '411', 'Clients', 'asset', false, 42, 'Customers'),
  ('TN', 'PCN', 'Personnel', '421', 'Personnel', 'liability', false, 43, 'Personnel'),
  ('TN', 'PCN', 'Sécurité sociale', '431', 'Sécurité sociale', 'liability', false, 44, 'Social security'),
  ('TN', 'PCN', 'État', '441', 'État', 'liability', false, 45, 'State'),

  -- Class 5: Financiers
  ('TN', 'PCN', 'Financiers', '5', 'Financiers', 'asset', true, 50, 'Financial accounts'),
  ('TN', 'PCN', 'Banques', '53', 'Banques', 'asset', false, 51, 'Banks'),

  -- Class 6: Charges
  ('TN', 'PCN', 'Charges', '6', 'Charges', 'expense', true, 60, 'Expenses'),
  ('TN', 'PCN', 'Achats de marchandises', '601', 'Achats de marchandises', 'expense', false, 61, 'Purchases of goods'),
  ('TN', 'PCN', 'Achats de fournitures', '604', 'Achats de fournitures', 'expense', false, 62, 'Purchases of supplies'),
  ('TN', 'PCN', 'Autres achats', '608', 'Autres achats', 'expense', false, 63, 'Other purchases'),
  ('TN', 'PCN', 'Frais de personnel', '621', 'Frais de personnel', 'expense', false, 64, 'Personnel costs'),
  ('TN', 'PCN', 'Impôts et taxes', '635', 'Impôts et taxes', 'expense', false, 65, 'Taxes'),

  -- Class 7: Produits
  ('TN', 'PCN', 'Produits', '7', 'Produits', 'revenue', true, 70, 'Revenue'),
  ('TN', 'PCN', 'Ventes de produits finis', '701', 'Ventes de produits finis', 'revenue', false, 71, 'Sales of finished products'),
  ('TN', 'PCN', 'Autres produits', '708', 'Autres produits', 'revenue', false, 72, 'Other revenue'),
  ('TN', 'PCN', 'Subventions d''exploitation', '74', 'Subventions d''exploitation', 'revenue', false, 73, 'Operating subsidies')
ON CONFLICT (country_code, accounting_standard, account_code) DO NOTHING;

-- account_templates — France (PCG) (was schema.sql lines 943-984)
-- USA (GAAP - Generally Accepted Accounting Principles)
INSERT INTO account_templates (country_code, accounting_standard, template_name, account_code, account_name, account_type, is_group, display_order, description) VALUES
  -- Assets
  ('US', 'GAAP', 'Cash', '1000', 'Cash and Cash Equivalents', 'asset', false, 10, 'Cash and cash equivalents'),
  ('US', 'GAAP', 'Receivables', '1100', 'Accounts Receivable', 'asset', false, 11, 'Accounts receivable'),
  ('US', 'GAAP', 'Inventory - Raw', '1200', 'Inventory - Raw Materials', 'asset', false, 12, 'Raw materials inventory'),
  ('US', 'GAAP', 'Inventory - WIP', '1210', 'Inventory - Work in Progress', 'asset', false, 13, 'Work in progress inventory'),
  ('US', 'GAAP', 'Inventory - Finished', '1220', 'Inventory - Finished Goods', 'asset', false, 14, 'Finished goods inventory'),
  ('US', 'GAAP', 'Land', '1500', 'Land', 'asset', false, 15, 'Land'),
  ('US', 'GAAP', 'Buildings', '1510', 'Buildings', 'asset', false, 16, 'Buildings'),
  ('US', 'GAAP', 'Equipment', '1520', 'Equipment', 'asset', false, 17, 'Equipment'),
  ('US', 'GAAP', 'Accumulated Depreciation', '1600', 'Accumulated Depreciation', 'asset', false, 18, 'Accumulated depreciation'),

  -- Liabilities
  ('US', 'GAAP', 'Accounts Payable', '2000', 'Accounts Payable', 'liability', false, 20, 'Accounts payable'),
  ('US', 'GAAP', 'Accrued Expenses', '2100', 'Accrued Expenses', 'liability', false, 21, 'Accrued expenses'),
  ('US', 'GAAP', 'Payroll Liabilities', '2200', 'Payroll Liabilities', 'liability', false, 22, 'Payroll liabilities'),
  ('US', 'GAAP', 'Long-term Debt', '2500', 'Long-term Debt', 'liability', false, 23, 'Long-term debt'),

  -- Equity
  ('US', 'GAAP', 'Owner Capital', '3000', 'Owner''s Capital', 'equity', false, 30, 'Owner''s capital'),
  ('US', 'GAAP', 'Retained Earnings', '3100', 'Retained Earnings', 'equity', false, 31, 'Retained earnings'),

  -- Revenue
  ('US', 'GAAP', 'Sales - Agricultural', '4000', 'Sales Revenue - Agricultural Products', 'revenue', false, 40, 'Sales of agricultural products'),
  ('US', 'GAAP', 'Sales - Processed', '4100', 'Sales Revenue - Processed Products', 'revenue', false, 41, 'Sales of processed products'),
  ('US', 'GAAP', 'Service Revenue', '4200', 'Service Revenue', 'revenue', false, 42, 'Service revenue'),
  ('US', 'GAAP', 'Other Revenue', '4900', 'Other Revenue', 'revenue', false, 43, 'Other revenue'),
  ('US', 'GAAP', 'Government Subsidies', '4950', 'Government Subsidies', 'revenue', false, 44, 'Government subsidies'),

  -- COGS
  ('US', 'GAAP', 'COGS', '5000', 'Cost of Goods Sold', 'expense', false, 50, 'Cost of goods sold'),

  -- Expenses
  ('US', 'GAAP', 'Wages', '6000', 'Wages and Salaries', 'expense', false, 60, 'Wages and salaries'),
  ('US', 'GAAP', 'Payroll Taxes', '6100', 'Payroll Taxes', 'expense', false, 61, 'Payroll taxes'),
  ('US', 'GAAP', 'Materials', '6200', 'Materials and Supplies', 'expense', false, 62, 'Materials and supplies'),
  ('US', 'GAAP', 'Utilities', '6300', 'Utilities', 'expense', false, 63, 'Utilities'),
  ('US', 'GAAP', 'Equipment Rental', '6400', 'Equipment Rental', 'expense', false, 64, 'Equipment rental'),
  ('US', 'GAAP', 'Repairs', '6500', 'Repairs and Maintenance', 'expense', false, 65, 'Repairs and maintenance'),
  ('US', 'GAAP', 'Other Expenses', '6900', 'Other Operating Expenses', 'expense', false, 66, 'Other operating expenses')
ON CONFLICT (country_code, accounting_standard, account_code) DO NOTHING;

-- account_templates — USA / UK / etc. (was schema.sql lines 986-1034)
-- UK (FRS 102 - UK Generally Accepted Accounting Practice)
INSERT INTO account_templates (country_code, accounting_standard, template_name, account_code, account_name, account_type, is_group, display_order, description) VALUES
  -- Non-current Assets
  ('GB', 'FRS102', 'Land and Buildings', '0010', 'Land and Buildings', 'asset', false, 10, 'Land and buildings'),
  ('GB', 'FRS102', 'Plant and Machinery', '0020', 'Plant and Machinery', 'asset', false, 11, 'Plant and machinery'),
  ('GB', 'FRS102', 'Motor Vehicles', '0030', 'Motor Vehicles', 'asset', false, 12, 'Motor vehicles'),
  ('GB', 'FRS102', 'Office Equipment', '0040', 'Office Equipment', 'asset', false, 13, 'Office equipment'),

  -- Current Assets
  ('GB', 'FRS102', 'Stock - Raw', '1000', 'Stock - Raw Materials', 'asset', false, 20, 'Stock of raw materials'),
  ('GB', 'FRS102', 'Stock - WIP', '1010', 'Stock - Work in Progress', 'asset', false, 21, 'Stock work in progress'),
  ('GB', 'FRS102', 'Stock - Finished', '1020', 'Stock - Finished Goods', 'asset', false, 22, 'Stock of finished goods'),
  ('GB', 'FRS102', 'Trade Debtors', '1100', 'Trade Debtors', 'asset', false, 23, 'Trade debtors'),
  ('GB', 'FRS102', 'Bank Current', '1200', 'Bank Current Account', 'asset', false, 24, 'Bank current account'),
  ('GB', 'FRS102', 'Bank Deposit', '1210', 'Bank Deposit Account', 'asset', false, 25, 'Bank deposit account'),
  ('GB', 'FRS102', 'Cash', '1220', 'Cash in Hand', 'asset', false, 26, 'Cash in hand'),

  -- Current Liabilities
  ('GB', 'FRS102', 'Trade Creditors', '2100', 'Trade Creditors', 'liability', false, 30, 'Trade creditors'),
  ('GB', 'FRS102', 'PAYE and NI', '2200', 'PAYE and NI', 'liability', false, 31, 'PAYE and National Insurance'),
  ('GB', 'FRS102', 'VAT', '2210', 'VAT', 'liability', false, 32, 'VAT'),
  ('GB', 'FRS102', 'Corporation Tax', '2300', 'Corporation Tax', 'liability', false, 33, 'Corporation tax'),

  -- Long-term Liabilities
  ('GB', 'FRS102', 'Bank Loans', '3000', 'Bank Loans', 'liability', false, 40, 'Bank loans'),

  -- Capital and Reserves
  ('GB', 'FRS102', 'Share Capital', '4000', 'Share Capital', 'equity', false, 50, 'Share capital'),
  ('GB', 'FRS102', 'Retained Earnings', '4100', 'Retained Earnings', 'equity', false, 51, 'Retained earnings'),

  -- Sales
  ('GB', 'FRS102', 'Sales - Agricultural', '5000', 'Sales - Agricultural Products', 'revenue', false, 60, 'Sales of agricultural products'),
  ('GB', 'FRS102', 'Sales - Processed', '5100', 'Sales - Processed Goods', 'revenue', false, 61, 'Sales of processed goods'),
  ('GB', 'FRS102', 'Other Income', '5200', 'Other Income', 'revenue', false, 62, 'Other income'),
  ('GB', 'FRS102', 'Government Grants', '5900', 'Government Grants', 'revenue', false, 63, 'Government grants'),

  -- Direct Costs
  ('GB', 'FRS102', 'Purchases - Raw', '6000', 'Purchases - Raw Materials', 'expense', false, 70, 'Purchases of raw materials'),
  ('GB', 'FRS102', 'Purchases - Consumables', '6100', 'Purchases - Consumables', 'expense', false, 71, 'Purchases of consumables'),

  -- Overheads
  ('GB', 'FRS102', 'Wages', '7000', 'Wages and Salaries', 'expense', false, 80, 'Wages and salaries'),
  ('GB', 'FRS102', 'Employer NI', '7100', 'Employer''s NI', 'expense', false, 81, 'Employer''s National Insurance'),
  ('GB', 'FRS102', 'Rent and Rates', '7200', 'Rent and Rates', 'expense', false, 82, 'Rent and rates'),
  ('GB', 'FRS102', 'Light and Heat', '7300', 'Light and Heat', 'expense', false, 83, 'Light and heat'),
  ('GB', 'FRS102', 'Motor Expenses', '7400', 'Motor Expenses', 'expense', false, 84, 'Motor expenses'),
  ('GB', 'FRS102', 'Repairs', '7500', 'Repairs and Renewals', 'expense', false, 85, 'Repairs and renewals'),
  ('GB', 'FRS102', 'Sundry Expenses', '7900', 'Sundry Expenses', 'expense', false, 86, 'Sundry expenses')
ON CONFLICT (country_code, accounting_standard, account_code) DO NOTHING;

-- account_mappings — Morocco (was schema.sql lines 1040-1060)
-- Morocco (CGNC) Mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code, description) VALUES
  ('MA', 'CGNC', 'cost_type', 'labor', '621', 'Labor costs mapped to Personnel costs'),
  ('MA', 'CGNC', 'cost_type', 'materials', '611', 'Materials mapped to Raw materials purchases'),
  ('MA', 'CGNC', 'cost_type', 'utilities', '612', 'Utilities mapped to Supplies purchases'),
  ('MA', 'CGNC', 'cost_type', 'equipment', '617', 'Equipment mapped to Equipment purchases'),
  ('MA', 'CGNC', 'cost_type', 'product_application', '612', 'Product application mapped to Supplies'),
  ('MA', 'CGNC', 'cost_type', 'other', '618', 'Other costs mapped to Other purchases'),
  ('MA', 'CGNC', 'revenue_type', 'harvest', '711', 'Harvest revenue mapped to Agricultural product sales'),
  ('MA', 'CGNC', 'revenue_type', 'subsidy', '751', 'Subsidy mapped to Operating subsidies'),
  ('MA', 'CGNC', 'revenue_type', 'metayage', '711', 'Metayage (sharecropping) revenue mapped to Agricultural product sales'),
  ('MA', 'CGNC', 'revenue_type', 'other', '718', 'Other revenue mapped to Other operating income'),
  ('MA', 'CGNC', 'cash', 'bank', '5141', 'Bank account (Banque - Compte courant)'),
  ('MA', 'CGNC', 'cash', 'cash', '5161', 'Cash account (Caisse principale)'),
  ('MA', 'CGNC', 'receivable', 'trade', '3420', 'Trade receivables (Clients)'),
  ('MA', 'CGNC', 'payable', 'trade', '4410', 'Trade payables (Fournisseurs)'),
  ('MA', 'CGNC', 'tax', 'collected', '4457', 'TVA collectée'),
  ('MA', 'CGNC', 'tax', 'deductible', '4456', 'TVA déductible'),
  ('MA', 'CGNC', 'revenue', 'default', '7111', 'Default revenue account (Ventes fruits et légumes)'),
  ('MA', 'CGNC', 'expense', 'default', '6111', 'Default expense account (Achats engrais)')
ON CONFLICT DO NOTHING;

-- account_mappings — Tunisia (was schema.sql lines 1062-1082)
-- Tunisia (PCN) Mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code, description) VALUES
  ('TN', 'PCN', 'cost_type', 'labor', '621', 'Labor costs mapped to Personnel costs'),
  ('TN', 'PCN', 'cost_type', 'materials', '601', 'Materials mapped to Goods purchases'),
  ('TN', 'PCN', 'cost_type', 'utilities', '604', 'Utilities mapped to Supplies purchases'),
  ('TN', 'PCN', 'cost_type', 'equipment', '604', 'Equipment mapped to Supplies purchases'),
  ('TN', 'PCN', 'cost_type', 'product_application', '604', 'Product application mapped to Supplies'),
  ('TN', 'PCN', 'cost_type', 'other', '608', 'Other costs mapped to Other purchases'),
  ('TN', 'PCN', 'revenue_type', 'harvest', '701', 'Harvest revenue mapped to Finished product sales'),
  ('TN', 'PCN', 'revenue_type', 'subsidy', '74', 'Subsidy mapped to Operating subsidies'),
  ('TN', 'PCN', 'revenue_type', 'metayage', '701', 'Metayage (sharecropping) revenue mapped to Finished product sales'),
  ('TN', 'PCN', 'revenue_type', 'other', '708', 'Other revenue mapped to Other revenue'),
  ('TN', 'PCN', 'cash', 'bank', '52', 'Bank account (Banques)'),
  ('TN', 'PCN', 'cash', 'cash', '511', 'Cash account (Caisse)'),
  ('TN', 'PCN', 'receivable', 'trade', '411', 'Trade receivables (Clients)'),
  ('TN', 'PCN', 'payable', 'trade', '401', 'Trade payables (Fournisseurs)'),
  ('TN', 'PCN', 'tax', 'collected', '431', 'TVA à payer'),
  ('TN', 'PCN', 'tax', 'deductible', '431', 'TVA déductible (à configurer manuellement)'),
  ('TN', 'PCN', 'revenue', 'default', '701', 'Default revenue account (Ventes de céréales)'),
  ('TN', 'PCN', 'expense', 'default', '601', 'Default expense account (Achats de matières premières)')
ON CONFLICT DO NOTHING;

-- account_mappings — France (was schema.sql lines 1084-1104)
-- USA (GAAP) Mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code, description) VALUES
  ('US', 'GAAP', 'cost_type', 'labor', '6000', 'Labor costs mapped to Wages and Salaries'),
  ('US', 'GAAP', 'cost_type', 'materials', '6200', 'Materials mapped to Materials and Supplies'),
  ('US', 'GAAP', 'cost_type', 'utilities', '6300', 'Utilities mapped to Utilities'),
  ('US', 'GAAP', 'cost_type', 'equipment', '6500', 'Equipment mapped to Repairs and Maintenance'),
  ('US', 'GAAP', 'cost_type', 'product_application', '6200', 'Product application mapped to Materials and Supplies'),
  ('US', 'GAAP', 'cost_type', 'other', '6900', 'Other costs mapped to Other Operating Expenses'),
  ('US', 'GAAP', 'revenue_type', 'harvest', '4000', 'Harvest revenue mapped to Agricultural product sales'),
  ('US', 'GAAP', 'revenue_type', 'subsidy', '4950', 'Subsidy mapped to Government Subsidies'),
  ('US', 'GAAP', 'revenue_type', 'metayage', '4000', 'Metayage (sharecropping) revenue mapped to Agricultural product sales'),
  ('US', 'GAAP', 'revenue_type', 'other', '4900', 'Other revenue mapped to Other Revenue'),
  ('US', 'GAAP', 'cash', 'bank', '1000', 'Cash and Cash Equivalents'),
  ('US', 'GAAP', 'cash', 'cash', '1000', 'Cash and Cash Equivalents'),
  ('US', 'GAAP', 'receivable', 'trade', '1200', 'Accounts Receivable'),
  ('US', 'GAAP', 'payable', 'trade', '2110', 'Trade Payables'),
  ('US', 'GAAP', 'tax', 'collected', '2250', 'Sales Tax Payable'),
  ('US', 'GAAP', 'tax', 'deductible', '2200', 'Taxes Payable (input tax)'),
  ('US', 'GAAP', 'revenue', 'default', '4100', 'Default revenue account (Crop Sales)'),
  ('US', 'GAAP', 'expense', 'default', '5100', 'Default expense account (Cost of Goods Sold)')
ON CONFLICT DO NOTHING;

-- account_mappings — USA (was schema.sql lines 1106-1126)
-- UK (FRS 102) Mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code, description) VALUES
  ('GB', 'FRS102', 'cost_type', 'labor', '7000', 'Labor costs mapped to Wages and Salaries'),
  ('GB', 'FRS102', 'cost_type', 'materials', '6000', 'Materials mapped to Raw Materials purchases'),
  ('GB', 'FRS102', 'cost_type', 'utilities', '7300', 'Utilities mapped to Light and Heat'),
  ('GB', 'FRS102', 'cost_type', 'equipment', '7500', 'Equipment mapped to Repairs and Renewals'),
  ('GB', 'FRS102', 'cost_type', 'product_application', '6100', 'Product application mapped to Consumables'),
  ('GB', 'FRS102', 'cost_type', 'other', '7900', 'Other costs mapped to Sundry Expenses'),
  ('GB', 'FRS102', 'revenue_type', 'harvest', '5000', 'Harvest revenue mapped to Agricultural product sales'),
  ('GB', 'FRS102', 'revenue_type', 'subsidy', '5900', 'Subsidy mapped to Government Grants'),
  ('GB', 'FRS102', 'revenue_type', 'metayage', '5000', 'Metayage (sharecropping) revenue mapped to Agricultural product sales'),
  ('GB', 'FRS102', 'revenue_type', 'other', '5200', 'Other revenue mapped to Other Income'),
  ('GB', 'FRS102', 'cash', 'bank', '232', 'Cash at Bank'),
  ('GB', 'FRS102', 'cash', 'cash', '231', 'Cash in Hand'),
  ('GB', 'FRS102', 'receivable', 'trade', '220', 'Trade Receivables'),
  ('GB', 'FRS102', 'payable', 'trade', '360', 'Trade and Other Payables'),
  ('GB', 'FRS102', 'tax', 'collected', '363', 'VAT Payable'),
  ('GB', 'FRS102', 'tax', 'deductible', '224', 'Other Receivables (input VAT)'),
  ('GB', 'FRS102', 'revenue', 'default', '511', 'Default revenue account (Agricultural Sales)'),
  ('GB', 'FRS102', 'expense', 'default', '610', 'Default expense account (Raw Materials and Consumables)')
ON CONFLICT DO NOTHING;

-- account_mappings — UK (was schema.sql lines 1128-1148)
-- France (PCG) Mappings - Migrate existing hard-coded mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code, description) VALUES
  ('FR', 'PCG', 'cost_type', 'labor', '641', 'Labor costs mapped to Staff remuneration'),
  ('FR', 'PCG', 'cost_type', 'materials', '601', 'Materials mapped to Raw materials purchases'),
  ('FR', 'PCG', 'cost_type', 'utilities', '606', 'Utilities mapped to Non-stored materials and supplies'),
  ('FR', 'PCG', 'cost_type', 'equipment', '615', 'Equipment mapped to Maintenance and repairs'),
  ('FR', 'PCG', 'cost_type', 'product_application', '604', 'Product application mapped to Studies and services purchases'),
  ('FR', 'PCG', 'cost_type', 'other', '628', 'Other costs mapped to Other external charges'),
  ('FR', 'PCG', 'revenue_type', 'harvest', '701', 'Harvest revenue mapped to Finished product sales'),
  ('FR', 'PCG', 'revenue_type', 'subsidy', '74', 'Subsidy mapped to Operating subsidies'),
  ('FR', 'PCG', 'revenue_type', 'metayage', '701', 'Metayage (sharecropping) revenue mapped to Finished product sales'),
  ('FR', 'PCG', 'revenue_type', 'other', '708', 'Other revenue mapped to Ancillary activities products'),
  ('FR', 'PCG', 'cash', 'bank', '512', 'Banks'),
  ('FR', 'PCG', 'cash', 'cash', '531', 'Cash'),
  ('FR', 'PCG', 'receivable', 'trade', '411', 'Trade receivables (Clients)'),
  ('FR', 'PCG', 'payable', 'trade', '401', 'Trade payables (Fournisseurs)'),
  ('FR', 'PCG', 'tax', 'collected', '4437', 'TVA collectée'),
  ('FR', 'PCG', 'tax', 'deductible', '4456', 'TVA déductible'),
  ('FR', 'PCG', 'revenue', 'default', '701', 'Default revenue account (Ventes de produits agricoles)'),
  ('FR', 'PCG', 'expense', 'default', '601', 'Default expense account (Achats de semences et plants)')
ON CONFLICT DO NOTHING;

-- account_mappings — EU/Germany (was schema.sql lines 1150-1170)
-- Germany (HGB) Mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code, description) VALUES
  ('DE', 'HGB', 'cost_type', 'labor', '6400', 'Labor costs mapped to Personnel costs'),
  ('DE', 'HGB', 'cost_type', 'materials', '6100', 'Materials mapped to Cost of Materials'),
  ('DE', 'HGB', 'cost_type', 'utilities', '6300', 'Utilities mapped to Energy costs'),
  ('DE', 'HGB', 'cost_type', 'equipment', '6500', 'Equipment mapped to Maintenance costs'),
  ('DE', 'HGB', 'cost_type', 'product_application', '6100', 'Product application mapped to Cost of Materials'),
  ('DE', 'HGB', 'cost_type', 'other', '6900', 'Other costs mapped to Other operating expenses'),
  ('DE', 'HGB', 'revenue_type', 'harvest', '5100', 'Harvest revenue mapped to Agricultural Sales'),
  ('DE', 'HGB', 'revenue_type', 'subsidy', '5600', 'Subsidy mapped to Government subsidies'),
  ('DE', 'HGB', 'revenue_type', 'metayage', '5100', 'Metayage (sharecropping) revenue mapped to Agricultural Sales'),
  ('DE', 'HGB', 'revenue_type', 'other', '5900', 'Other revenue mapped to Other income'),
  ('DE', 'HGB', 'cash', 'bank', '1200', 'Bank accounts'),
  ('DE', 'HGB', 'cash', 'cash', '1000', 'Cash account (Kasse)'),
  ('DE', 'HGB', 'receivable', 'trade', '1400', 'Trade receivables (Forderungen aus Lieferungen und Leistungen)'),
  ('DE', 'HGB', 'payable', 'trade', '3100', 'Trade payables (Verbindlichkeiten aus Lieferungen und Leistungen)'),
  ('DE', 'HGB', 'tax', 'collected', '3301', 'Umsatzsteuer (VAT Payable)'),
  ('DE', 'HGB', 'tax', 'deductible', '3300', 'Vorsteuer (Input VAT) - to be configured'),
  ('DE', 'HGB', 'revenue', 'default', '5100', 'Default revenue account (Agricultural Sales)'),
  ('DE', 'HGB', 'expense', 'default', '6100', 'Default expense account (Cost of Materials)')
ON CONFLICT DO NOTHING;

-- phenological_stages (was schema.sql lines 6224-6253)
-- Seed phenological stages
INSERT INTO phenological_stages (crop_type_name, stage_name, stage_name_fr, bbch_code, stage_order, gdd_threshold_min, gdd_threshold_max, typical_month_start, typical_month_end, description_fr)
VALUES
  ('olive', 'Dormancy', 'Repos végétatif', '00', 1, 0, 100, 1, 2, 'Période de dormance hivernale'),
  ('olive', 'Bud break', 'Débourrement', '08', 2, 100, 200, 2, 3, 'Éclatement des bourgeons'),
  ('olive', 'Shoot growth', 'Croissance végétative', '10', 3, 200, 400, 3, 4, 'Allongement des pousses'),
  ('olive', 'Inflorescence emergence', 'Apparition des inflorescences', '51', 4, 400, 600, 4, 5, 'Formation des grappes florales'),
  ('olive', 'Flowering', 'Floraison', '60', 5, 600, 800, 5, 6, 'Pleine floraison'),
  ('olive', 'Fruit set', 'Nouaison', '71', 6, 800, 1000, 6, 6, 'Formation des fruits'),
  ('olive', 'Fruit growth', 'Grossissement du fruit', '72', 7, 1000, 2000, 6, 9, 'Phase de croissance du fruit'),
  ('olive', 'Veraison/Lipogenesis', 'Véraison/Lipogenèse', '81', 8, 2000, 2500, 9, 10, 'Changement de couleur et accumulation huile'),
  ('olive', 'Maturation', 'Maturation', '86', 9, 2500, 3000, 10, 12, 'Maturation complète du fruit'),
  ('olive', 'Harvest', 'Récolte', '89', 10, 3000, NULL, 11, 1, 'Période de récolte'),
  ('avocado', 'Vegetative rest', 'Repos végétatif', '00', 1, 0, 100, 12, 1, 'Période de repos'),
  ('avocado', 'Bud break', 'Débourrement', '08', 2, 100, 300, 1, 2, 'Éclatement des bourgeons'),
  ('avocado', 'Flowering', 'Floraison', '60', 3, 300, 600, 2, 4, 'Pleine floraison (Type A ou B)'),
  ('avocado', 'Fruit set', 'Nouaison', '71', 4, 600, 900, 4, 5, 'Formation des fruits'),
  ('avocado', 'Fruit growth phase 1', 'Croissance fruit phase 1', '72', 5, 900, 1500, 5, 7, 'Division cellulaire rapide'),
  ('avocado', 'Fruit growth phase 2', 'Croissance fruit phase 2', '75', 6, 1500, 2200, 7, 9, 'Accumulation lipidique'),
  ('avocado', 'Maturation', 'Maturation', '86', 7, 2200, 2800, 9, 11, 'Maturation physiologique'),
  ('avocado', 'Harvest', 'Récolte', '89', 8, 2800, NULL, 11, 3, 'Période de récolte')
ON CONFLICT (crop_type_name, stage_order) DO UPDATE SET
  stage_name = EXCLUDED.stage_name,
  stage_name_fr = EXCLUDED.stage_name_fr,
  bbch_code = EXCLUDED.bbch_code,
  gdd_threshold_min = EXCLUDED.gdd_threshold_min,
  gdd_threshold_max = EXCLUDED.gdd_threshold_max,
  typical_month_start = EXCLUDED.typical_month_start,
  typical_month_end = EXCLUDED.typical_month_end,
  description_fr = EXCLUDED.description_fr;

-- crop_kc_coefficients (was schema.sql lines 6255-6293)
-- Seed Kc coefficients
INSERT INTO crop_kc_coefficients (crop_type_name, phenological_stage_name, kc_value, kc_min, kc_max)
VALUES
  ('olive', 'Dormancy', 0.45, 0.40, 0.50),
  ('olive', 'Bud break', 0.50, 0.45, 0.55),
  ('olive', 'Shoot growth', 0.55, 0.50, 0.60),
  ('olive', 'Inflorescence emergence', 0.60, 0.55, 0.65),
  ('olive', 'Flowering', 0.65, 0.60, 0.70),
  ('olive', 'Fruit set', 0.65, 0.60, 0.70),
  ('olive', 'Fruit growth', 0.70, 0.65, 0.75),
  ('olive', 'Veraison/Lipogenesis', 0.65, 0.60, 0.70),
  ('olive', 'Maturation', 0.55, 0.50, 0.60),
  ('olive', 'Harvest', 0.50, 0.45, 0.55),
  ('avocado', 'Vegetative rest', 0.60, 0.55, 0.65),
  ('avocado', 'Bud break', 0.65, 0.60, 0.70),
  ('avocado', 'Flowering', 0.75, 0.70, 0.80),
  ('avocado', 'Fruit set', 0.80, 0.75, 0.85),
  ('avocado', 'Fruit growth phase 1', 0.85, 0.80, 0.90),
  ('avocado', 'Fruit growth phase 2', 0.85, 0.80, 0.90),
  ('avocado', 'Maturation', 0.70, 0.65, 0.75),
  ('avocado', 'Harvest', 0.65, 0.60, 0.70),
  ('citrus', 'Dormancy', 0.50, 0.45, 0.55),
  ('citrus', 'Flowering', 0.65, 0.60, 0.70),
  ('citrus', 'Fruit growth', 0.70, 0.65, 0.75),
  ('citrus', 'Maturation', 0.65, 0.60, 0.70),
  ('vine', 'Dormancy', 0.30, 0.25, 0.35),
  ('vine', 'Bud break', 0.40, 0.35, 0.45),
  ('vine', 'Flowering', 0.60, 0.55, 0.65),
  ('vine', 'Fruit growth', 0.70, 0.65, 0.80),
  ('vine', 'Veraison', 0.65, 0.60, 0.70),
  ('vine', 'Maturation', 0.55, 0.50, 0.60),
  ('almond', 'Dormancy', 0.40, 0.35, 0.45),
  ('almond', 'Flowering', 0.55, 0.50, 0.60),
  ('almond', 'Fruit growth', 0.80, 0.75, 0.90),
  ('almond', 'Maturation', 0.65, 0.60, 0.70)
ON CONFLICT (crop_type_name, phenological_stage_name) DO UPDATE SET
  kc_value = EXCLUDED.kc_value,
  kc_min = EXCLUDED.kc_min,
  kc_max = EXCLUDED.kc_max;

-- crop_mineral_exports (was schema.sql lines 6295-6315)
-- Seed mineral exports for all 11 crops
INSERT INTO crop_mineral_exports (crop_type_name, product_type, n_kg_per_ton, p2o5_kg_per_ton, k2o_kg_per_ton, cao_kg_per_ton, mgo_kg_per_ton)
VALUES
  ('olive', 'fruit', 15.0, 4.0, 20.0, 5.0, 2.0),
  ('olive', 'oil', 0.0, 0.0, 0.5, 0.0, 0.0),
  ('avocado', 'fruit', 8.5, 2.5, 25.0, 3.0, 2.0),
  ('citrus', 'fruit', 2.5, 0.8, 3.5, 2.0, 0.5),
  ('almond', 'fruit', 50.0, 10.0, 12.0, 3.0, 4.0),
  ('vine', 'fruit', 5.0, 2.0, 7.0, 3.0, 1.0),
  ('pomegranate', 'fruit', 3.0, 1.0, 4.0, 2.0, 0.5),
  ('fig', 'fruit', 4.0, 1.5, 5.0, 3.0, 1.0),
  ('apple_pear', 'fruit', 3.5, 1.2, 4.5, 1.5, 0.5),
  ('stone_fruit', 'fruit', 4.5, 1.5, 6.0, 2.0, 0.8),
  ('date_palm', 'fruit', 6.0, 2.0, 12.0, 3.0, 2.0),
  ('walnut', 'fruit', 30.0, 8.0, 10.0, 5.0, 3.0)
ON CONFLICT (crop_type_name, product_type) DO UPDATE SET
  n_kg_per_ton = EXCLUDED.n_kg_per_ton,
  p2o5_kg_per_ton = EXCLUDED.p2o5_kg_per_ton,
  k2o_kg_per_ton = EXCLUDED.k2o_kg_per_ton,
  cao_kg_per_ton = EXCLUDED.cao_kg_per_ton,
  mgo_kg_per_ton = EXCLUDED.mgo_kg_per_ton;

-- crop_diseases (was schema.sql lines 6317-6343)
-- Seed crop diseases (olive and avocado priority)
INSERT INTO crop_diseases (crop_type_name, disease_name, disease_name_fr, pathogen_name, disease_type, temperature_min, temperature_max, humidity_threshold, season, treatment_product, treatment_dose, treatment_timing, days_after_treatment, satellite_signal, severity)
VALUES
  ('olive', 'Peacock spot', 'Oeil de paon', 'Spilocaea oleagina', 'fungal', 15.0, 20.0, 80.0, 'spring', 'Copper hydroxide', '3-5 L/ha', 'Preventive autumn + spring', 21, 'NDVI drop, leaf spots visible in NDRE', 'high'),
  ('olive', 'Verticillium wilt', 'Verticilliose', 'Verticillium dahliae', 'fungal', 20.0, 25.0, NULL, 'spring', 'No chemical cure', NULL, 'Resistant rootstocks, solarization', NULL, 'Asymmetric NDVI decline in canopy', 'critical'),
  ('olive', 'Olive knot', 'Tuberculose', 'Pseudomonas savastanoi', 'bacterial', 15.0, 25.0, 90.0, 'year_round', 'Copper compounds', '5 L/ha', 'After pruning wounds', 14, 'Branch dieback in NIRv', 'medium'),
  ('olive', 'Olive fruit fly', 'Mouche de l''olive', 'Bactrocera oleae', 'insect', 20.0, 30.0, NULL, 'autumn', 'Dimethoate or traps', '0.5-1 L/ha', 'When fruit starts coloring', 28, 'Not directly visible', 'high'),
  ('olive', 'Black scale', 'Cochenille noire', 'Saissetia oleae', 'insect', 20.0, 30.0, 70.0, 'summer', 'Mineral oil', '10-15 L/ha', 'Crawler stage (May-Jun)', 7, 'Sooty mold reduces NDVI', 'medium'),
  ('olive', 'Anthracnose', 'Dalmatica', 'Colletotrichum spp.', 'fungal', 15.0, 25.0, 85.0, 'autumn', 'Copper + mancozeb', '3-4 L/ha', 'Before rainy season', 21, 'Fruit damage, late NDVI drop', 'high'),
  ('avocado', 'Phytophthora root rot', 'Pourriture des racines', 'Phytophthora cinnamomi', 'fungal', 20.0, 30.0, 90.0, 'year_round', 'Phosphonic acid (Fosetyl-Al)', '2-3 g/L trunk injection', 'Preventive in spring/autumn', 30, 'NDVI and NIRv progressive decline, canopy thinning', 'critical'),
  ('avocado', 'Anthracnose', 'Anthracnose', 'Colletotrichum gloeosporioides', 'fungal', 25.0, 30.0, 85.0, 'summer', 'Copper hydroxide', '3-5 L/ha', 'Pre-harvest preventive', 14, 'Fruit spots, late NDVI impact', 'high'),
  ('avocado', 'Scab', 'Gale', 'Sphaceloma perseae', 'fungal', 20.0, 28.0, 80.0, 'spring', 'Copper oxychloride', '4 L/ha', 'Spring flush protection', 21, 'Leaf lesions visible in NDRE', 'medium'),
  ('avocado', 'Cercospora spot', 'Cercosporiose', 'Cercospora purpurea', 'fungal', 20.0, 28.0, 80.0, 'summer', 'Mancozeb', '2-3 kg/ha', 'Before symptoms appear', 14, 'Leaf spotting, NDVI decrease', 'medium')
ON CONFLICT (crop_type_name, disease_name) DO UPDATE SET
  disease_name_fr = EXCLUDED.disease_name_fr,
  pathogen_name = EXCLUDED.pathogen_name,
  disease_type = EXCLUDED.disease_type,
  temperature_min = EXCLUDED.temperature_min,
  temperature_max = EXCLUDED.temperature_max,
  humidity_threshold = EXCLUDED.humidity_threshold,
  season = EXCLUDED.season,
  treatment_product = EXCLUDED.treatment_product,
  treatment_dose = EXCLUDED.treatment_dose,
  treatment_timing = EXCLUDED.treatment_timing,
  days_after_treatment = EXCLUDED.days_after_treatment,
  satellite_signal = EXCLUDED.satellite_signal,
  severity = EXCLUDED.severity;

-- crop_index_thresholds (was schema.sql lines 6345-6375)
-- Seed index thresholds by crop and plantation system
INSERT INTO crop_index_thresholds (crop_type_name, plantation_system_type, index_name, healthy_min, healthy_max, stress_low, critical_low, notes)
VALUES
  ('olive', 'traditional', 'NDVI', 0.300, 0.550, 0.250, 0.150, 'Traditional olive 100-200 trees/ha'),
  ('olive', 'intensive', 'NDVI', 0.450, 0.700, 0.350, 0.250, 'Intensive olive 200-500 trees/ha'),
  ('olive', 'super_intensive', 'NDVI', 0.550, 0.800, 0.400, 0.300, 'Super-intensive >1000 trees/ha'),
  ('olive', 'traditional', 'NIRv', 0.100, 0.250, 0.080, 0.050, NULL),
  ('olive', 'intensive', 'NIRv', 0.150, 0.350, 0.120, 0.080, NULL),
  ('olive', 'super_intensive', 'NIRv', 0.200, 0.450, 0.150, 0.100, NULL),
  ('olive', 'traditional', 'EVI', 0.200, 0.450, 0.150, 0.100, NULL),
  ('olive', 'intensive', 'EVI', 0.300, 0.550, 0.250, 0.150, NULL),
  ('olive', 'super_intensive', 'EVI', 0.400, 0.650, 0.300, 0.200, NULL),
  ('olive', NULL, 'NDMI', 0.050, 0.300, 0.000, -0.100, 'Water stress indicator'),
  ('olive', NULL, 'NDRE', 0.200, 0.500, 0.150, 0.100, 'Nitrogen status indicator'),
  ('avocado', 'traditional', 'NDVI', 0.500, 0.800, 0.400, 0.300, 'Traditional avocado 100-200 trees/ha'),
  ('avocado', 'intensive', 'NDVI', 0.600, 0.850, 0.500, 0.400, 'Intensive avocado 400-600 trees/ha'),
  ('avocado', NULL, 'NDMI', 0.100, 0.400, 0.050, -0.050, 'Avocado is moisture-sensitive'),
  ('avocado', NULL, 'NIRv', 0.200, 0.500, 0.150, 0.100, NULL),
  ('avocado', NULL, 'EVI', 0.350, 0.700, 0.300, 0.200, NULL),
  ('citrus', NULL, 'NDVI', 0.450, 0.750, 0.350, 0.250, 'Citrus orchards'),
  ('citrus', NULL, 'NDMI', 0.100, 0.350, 0.050, -0.050, NULL),
  ('vine', NULL, 'NDVI', 0.250, 0.600, 0.200, 0.120, 'Vineyard canopy varies by training system'),
  ('vine', NULL, 'NDMI', 0.000, 0.250, -0.050, -0.150, 'Water stress common in viticulture'),
  ('almond', NULL, 'NDVI', 0.350, 0.650, 0.280, 0.180, NULL),
  ('date_palm', NULL, 'NDVI', 0.300, 0.600, 0.200, 0.120, 'Palm canopy structure differs')
ON CONFLICT (crop_type_name, COALESCE(plantation_system_type, ''), index_name) DO UPDATE SET
  healthy_min = EXCLUDED.healthy_min,
  healthy_max = EXCLUDED.healthy_max,
  stress_low = EXCLUDED.stress_low,
  critical_low = EXCLUDED.critical_low,
  notes = EXCLUDED.notes;

-- compliance_requirements — GlobalGAP (was schema.sql lines 15886-15979)
-- GlobalGAP Requirements (10 requirements)
INSERT INTO compliance_requirements (certification_type, requirement_code, requirement_description, category, verification_method, frequency, is_critical)
VALUES
  (
    'GlobalGAP',
    'AF.1.1',
    'Traceability system for all products from production to sale',
    'Traceability',
    'Document Review, System Inspection',
    'Continuous',
    true
  ),
  (
    'GlobalGAP',
    'AF.2.1',
    'Record keeping for all farm activities including inputs, outputs, and labor',
    'Record Keeping',
    'Document Review',
    'Per Activity',
    true
  ),
  (
    'GlobalGAP',
    'CB.4.1',
    'Fertilizer application records with dates, products, rates, and fields',
    'Input Management',
    'Document Review, Field Inspection',
    'Per Application',
    true
  ),
  (
    'GlobalGAP',
    'CB.5.1',
    'Irrigation water quality testing and records',
    'Water Management',
    'Test Results, Document Review',
    'Annual',
    false
  ),
  (
    'GlobalGAP',
    'CB.7.1',
    'Integrated pest management plan with pesticide records',
    'Pest Management',
    'Document Review, Field Inspection',
    'Annual',
    true
  ),
  (
    'GlobalGAP',
    'FV.5.1',
    'Harvest hygiene procedures and worker training documentation',
    'Harvest Management',
    'Document Review, Worker Interview',
    'Per Harvest',
    true
  ),
  (
    'GlobalGAP',
    'FV.6.1',
    'Post-harvest handling and storage procedures',
    'Post-Harvest',
    'Document Review, Facility Inspection',
    'Annual',
    false
  ),
  (
    'GlobalGAP',
    'SA.1.1',
    'Worker safety training and incident records',
    'Worker Safety',
    'Document Review, Worker Interview',
    'Annual',
    true
  ),
  (
    'GlobalGAP',
    'SA.2.1',
    'Personal protective equipment (PPE) provision and usage',
    'Worker Safety',
    'Facility Inspection, Worker Interview',
    'Quarterly',
    true
  ),
  (
    'GlobalGAP',
    'SA.3.1',
    'Child labor and forced labor prevention policies',
    'Labor Practices',
    'Document Review, Worker Interview',
    'Annual',
    true
  )
ON CONFLICT (certification_type, requirement_code) DO NOTHING;

-- compliance_requirements — group 2 (was schema.sql lines 15981-16029)
-- HACCP Requirements (5 requirements)
INSERT INTO compliance_requirements (certification_type, requirement_code, requirement_description, category, verification_method, frequency, is_critical)
VALUES
  (
    'HACCP',
    'CCP1',
    'Receiving raw materials inspection and acceptance criteria',
    'Receiving',
    'Inspection Records, Supplier Verification',
    'Per Delivery',
    true
  ),
  (
    'HACCP',
    'CCP2',
    'Storage temperature monitoring and records for perishables',
    'Storage',
    'Temperature Records, Equipment Calibration',
    'Continuous',
    true
  ),
  (
    'HACCP',
    'CCP3',
    'Processing temperature control and time records',
    'Processing',
    'Temperature Records, Process Logs',
    'Per Batch',
    true
  ),
  (
    'HACCP',
    'CCP4',
    'Metal detection and foreign material prevention',
    'Quality Control',
    'Equipment Logs, Test Records',
    'Per Batch',
    true
  ),
  (
    'HACCP',
    'CCP5',
    'Final product testing and microbiological analysis',
    'Testing',
    'Lab Test Results, Certificate of Analysis',
    'Per Batch',
    true
  )
ON CONFLICT (certification_type, requirement_code) DO NOTHING;

-- compliance_requirements — group 3 (was schema.sql lines 16031-16079)
-- ISO 9001 Requirements (5 requirements)
INSERT INTO compliance_requirements (certification_type, requirement_code, requirement_description, category, verification_method, frequency, is_critical)
VALUES
  (
    'ISO9001',
    'QMS.1',
    'Quality management system documentation and procedures',
    'Quality Management',
    'Document Review, System Audit',
    'Annual',
    true
  ),
  (
    'ISO9001',
    'QMS.2',
    'Management review and effectiveness evaluation',
    'Management Review',
    'Meeting Minutes, Performance Data',
    'Annual',
    false
  ),
  (
    'ISO9001',
    'QMS.3',
    'Customer satisfaction monitoring and feedback management',
    'Customer Focus',
    'Survey Results, Complaint Records',
    'Quarterly',
    false
  ),
  (
    'ISO9001',
    'QMS.4',
    'Internal audit program and corrective actions',
    'Internal Audit',
    'Audit Reports, Corrective Action Records',
    'Annual',
    true
  ),
  (
    'ISO9001',
    'QMS.5',
    'Competence and training of personnel',
    'Personnel',
    'Training Records, Competency Assessment',
    'Annual',
    false
  )
ON CONFLICT (certification_type, requirement_code) DO NOTHING;

-- email_templates — SIAM RDV (was schema.sql lines 16881-16913)
-- =====================================================
-- SIAM RDV email templates (system-level, no org)
-- =====================================================
INSERT INTO email_templates (organization_id, name, description, type, category, subject, html_body, text_body, variables, is_system, is_active)
VALUES (
  NULL,
  'Confirmation RDV SIAM',
  'Email sent to lead when their SIAM rendez-vous is confirmed by admin',
  'siam_rdv_confirmation',
  'general',
  'Votre rendez-vous AgroGina au SIAM est confirmé — {{confirmed_slot}}',
  '<div style="max-width:600px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#f9f7f2;padding:24px;border-radius:12px">'
    || '<div style="background:#1d6b3a;color:white;padding:24px;border-radius:8px 8px 0 0;text-align:center">'
    || '<h1 style="margin:0;font-size:22px">Rendez-vous confirmé ✅</h1>'
    || '</div>'
    || '<div style="background:white;padding:24px;border-radius:0 0 8px 8px">'
    || '<p style="font-size:16px">Bonjour <strong>{{nom}}</strong>,</p>'
    || '<p style="font-size:15px">Votre demande de rendez-vous au Salon International de l''Agriculture (SIAM) à Meknès a été <strong>confirmée</strong>.</p>'
    || '<div style="background:#e8f5ec;border:1px solid #1d6b3a;border-radius:8px;padding:16px;margin:16px 0;text-align:center">'
    || '<p style="margin:0;font-size:13px;color:#666">Créneau confirmé</p>'
    || '<p style="margin:4px 0 0;font-size:20px;font-weight:600;color:#1d6b3a">{{confirmed_slot}}</p>'
    || '</div>'
    || '<p style="font-size:14px;color:#555">Nous vous attendons sur le stand AgroGina. Notre équipe vous présentera la plateforme ERP + IA décisionnelle conçue pour les fermes marocaines.</p>'
    || '<p style="font-size:14px;color:#555">En cas d''empêchement, contactez-nous à <a href="mailto:contact@agrogina.com" style="color:#1d6b3a">contact@agrogina.com</a> ou au <strong>{{contact_phone}}</strong>.</p>'
    || '<hr style="border:none;border-top:1px solid #eee;margin:20px 0" />'
    || '<p style="font-size:12px;color:#888;text-align:center">AgroGina — ERP agricole + Agronomie + AgromindIA<br/>Stand SIAM 2026, Meknès</p>'
    || '</div>'
    || '</div>',
  E'Bonjour {{nom}}, votre rendez-vous au SIAM est confirmé pour le créneau {{confirmed_slot}}.\nNous vous attendons sur le stand AgroGina.\nEn cas d''empêchement, contactez-nous à contact@agrogina.com ou au {{contact_phone}}.',
  '["nom","confirmed_slot","contact_phone"]'::jsonb,
  true,
  true
) ON CONFLICT (type) WHERE organization_id IS NULL DO NOTHING;

-- email_templates — group 2 (was schema.sql lines 16915-16947)
INSERT INTO email_templates (organization_id, name, description, type, category, subject, html_body, text_body, variables, is_system, is_active)
VALUES (
  NULL,
  'Refus RDV SIAM',
  'Email sent to lead when their SIAM rendez-vous slot is no longer available',
  'siam_rdv_rejection',
  'general',
  'Mise à jour concernant votre demande de rendez-vous SIAM',
  '<div style="max-width:600px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#f9f7f2;padding:24px;border-radius:12px">'
    || '<div style="background:#555;color:white;padding:24px;border-radius:8px 8px 0 0;text-align:center">'
    || '<h1 style="margin:0;font-size:22px">Mise à jour de votre demande</h1>'
    || '</div>'
    || '<div style="background:white;padding:24px;border-radius:0 0 8px 8px">'
    || '<p style="font-size:16px">Bonjour <strong>{{nom}}</strong>,</p>'
    || '<p style="font-size:15px">Nous avons bien reçu votre demande de rendez-vous au SIAM, malheureusement le créneau demandé n''est plus disponible.</p>'
    || '<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:16px 0">'
    || '<p style="margin:0;font-size:14px;color:#92400e">{{rejection_reason}}</p>'
    || '</div>'
    || '<p style="font-size:14px;color:#555">Nous serions ravis de vous rencontrer ! Merci de nous contacter pour convenir d''un autre créneau :</p>'
    || '<ul style="font-size:14px;color:#555">'
    || '<li>📧 <a href="mailto:contact@agrogina.com" style="color:#1d6b3a">contact@agrogina.com</a></li>'
    || '<li>📞 <strong>{{contact_phone}}</strong></li>'
    || '<li>🌐 <a href="https://rdv.agrogina.ma/rdv-siam" style="color:#1d6b3a">rdv.agrogina.ma/rdv-siam</a></li>'
    || '</ul>'
    || '<hr style="border:none;border-top:1px solid #eee;margin:20px 0" />'
    || '<p style="font-size:12px;color:#888;text-align:center">AgroGina — ERP agricole + Agronomie + AgromindIA<br/>Stand SIAM 2026, Meknès</p>'
    || '</div>'
    || '</div>',
  E'Bonjour {{nom}}, votre demande de rendez-vous au SIAM n''a pas pu être confirmée.\nMotif : {{rejection_reason}}\nContactez-nous pour reprogrammer : contact@agrogina.com ou {{contact_phone}}.',
  '["nom","rejection_reason","contact_phone"]'::jsonb,
  true,
  true
) ON CONFLICT (type) WHERE organization_id IS NULL DO NOTHING;
