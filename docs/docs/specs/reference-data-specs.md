---
sidebar_position: 4
title: "Reference Data Specifications"
---

# FEATURE SPECS REFERENCE

Reference specifications extracted from crop knowledge-base documents.

Each specification describes the data structure, rules, and thresholds for a particular crop system.

---

#### 🎯 Agrumes Reference Data System

#### 📌 Overview

**RÉFÉRENTIEL OPÉRATIONNEL COMPLET** Orange • Petits agrumes • Citron • Pomelo Fichier indexé pour le moteur IA Document central contenant TOUTES les données nécessaires pour piloter une parcelle d'agrumes de A à Z Espèces & Variétés • Porte-greffes • Stades phénologiques • Seuils satellite • NPK & 

This document defines all operational parameters needed to manage Agrumes from A to Z, including species classification, phenological stages, satellite monitoring thresholds, nutrition programs, and phytosanitary alerts.

#### 👤 User Stories / Use Cases

- As a farm manager, I need reference data on Agrumes varieties and their characteristics to select optimal cultivars.
- As a fertility advisor, I need NPK/micronutrient requirements for Agrumes at each phenological stage.
- As a crop monitor, I need satellite index thresholds (NDVI, NIRv, NDMI) to detect Agrumes stress.
- As a harvester, I need maturity stages and quality parameters for Agrumes.
- As a disease scout, I need phytosanitary thresholds and pressure periods for Agrumes.

#### ✅ Functional Requirements

- Store and retrieve species/variety taxonomy and production statistics
- Define pedo-climatic requirements (temperature, pH, salinity, etc.)
- Track rootstock compatibility matrix and selection logic
- Store phenological stage definitions with satellite index ranges
- Calculate NPK requirements based on target yield and stage (contains 9 nutrition sections)
- Define micronutrient sufficiency ranges and foliar diagnosis thresholds
- Define irrigation thresholds by system type and phenological stage
- Store phytosanitary alert periods and economic thresholds
- Define harvest readiness criteria and quality standards
- Provide predictive model recommendations based on satellite data
- Track annual planning calendar with critical decision points for Agrumes

#### 🚫 Out of Scope / Constraints

- Detailed farm economics or ROI calculations
- Real-time pest identification from images
- Integration with external weather APIs (data provided as input)
- Field-level soil sampling logistics
- Regulatory compliance for export markets
- Labor management or scheduling

#### 🔗 Dependencies

- Satellite data source (Sentinel-2 or similar) for NDVI/NIRv/NDMI calculation
- Soil test data (optional but recommended for nutrition planning)
- Water quality data (CE, Cl, Na content)
- Target yield or production goal from farmer
- Phenological stage observation from field (or satellite-based estimation)

#### ❓ Open Questions / Ambiguities

- Should alternate bearing years have separate recommendation profiles?
- How to handle partial soil test results (some but not all parameters)?
- Should microclimate variations within field be modeled?
- What level of phytosanitary pressure data is available (economic thresholds)?

#### 🏷️ Labels / Tags

- `reference-data`
- `crop-specific`
- `nutrition`
- `phenology`
- `satellite-thresholds`
- `agrumes`

---

#### 🎯 Avocatier Reference Data System

#### 📌 Overview

**RÉFÉRENTIEL OPÉRATIONNEL COMPLET** Fichier indexé pour le moteur IA Document central contenant TOUTES les données nécessaires pour piloter une parcelle d'avocatier de A à Z Variétés • Stades phénologiques • Seuils satellite • Options nutrition • NPK & Microéléments • Biostimulants • Irrigation • P

This document defines all operational parameters needed to manage Avocatier from A to Z, including species classification, phenological stages, satellite monitoring thresholds, nutrition programs, and phytosanitary alerts.

#### 👤 User Stories / Use Cases

- As a farm manager, I need reference data on Avocatier varieties and their characteristics to select optimal cultivars.
- As a fertility advisor, I need NPK/micronutrient requirements for Avocatier at each phenological stage.
- As a crop monitor, I need satellite index thresholds (NDVI, NIRv, NDMI) to detect Avocatier stress.
- As a harvester, I need maturity stages and quality parameters for Avocatier.
- As a disease scout, I need phytosanitary thresholds and pressure periods for Avocatier.

#### ✅ Functional Requirements

- Store and retrieve species/variety taxonomy and production statistics
- Define pedo-climatic requirements (temperature, pH, salinity, etc.)
- Track rootstock compatibility matrix and selection logic
- Store phenological stage definitions with satellite index ranges
- Calculate NPK requirements based on target yield and stage (contains 13 nutrition sections)
- Define micronutrient sufficiency ranges and foliar diagnosis thresholds
- Define irrigation thresholds by system type and phenological stage
- Store phytosanitary alert periods and economic thresholds
- Define harvest readiness criteria and quality standards
- Provide predictive model recommendations based on satellite data
- Track annual planning calendar with critical decision points for Avocatier

#### 🚫 Out of Scope / Constraints

- Detailed farm economics or ROI calculations
- Real-time pest identification from images
- Integration with external weather APIs (data provided as input)
- Field-level soil sampling logistics
- Regulatory compliance for export markets
- Labor management or scheduling

#### 🔗 Dependencies

- Satellite data source (Sentinel-2 or similar) for NDVI/NIRv/NDMI calculation
- Soil test data (optional but recommended for nutrition planning)
- Water quality data (CE, Cl, Na content)
- Target yield or production goal from farmer
- Phenological stage observation from field (or satellite-based estimation)

#### ❓ Open Questions / Ambiguities

- Should alternate bearing years have separate recommendation profiles?
- How to handle partial soil test results (some but not all parameters)?
- Should microclimate variations within field be modeled?
- What level of phytosanitary pressure data is available (economic thresholds)?

#### 🏷️ Labels / Tags

- `reference-data`
- `crop-specific`
- `nutrition`
- `phenology`
- `satellite-thresholds`
- `avocatier`

---

#### 🎯 Olivier Reference Data System

#### 📌 Overview

**RÉFÉRENTIEL OPÉRATIONNEL COMPLET** Fichier indexé pour le moteur IA Document central contenant TOUTES les données nécessaires pour piloter une parcelle d'olivier de A à Z Variétés • Stades BBCH • Seuils satellite • Options nutrition • NPK & Microéléments • Biostimulants • Irrigation & Salinité • A

This document defines all operational parameters needed to manage Olivier from A to Z, including species classification, phenological stages, satellite monitoring thresholds, nutrition programs, and phytosanitary alerts.

#### 👤 User Stories / Use Cases

- As a farm manager, I need reference data on Olivier varieties and their characteristics to select optimal cultivars.
- As a fertility advisor, I need NPK/micronutrient requirements for Olivier at each phenological stage.
- As a crop monitor, I need satellite index thresholds (NDVI, NIRv, NDMI) to detect Olivier stress.
- As a harvester, I need maturity stages and quality parameters for Olivier.
- As a disease scout, I need phytosanitary thresholds and pressure periods for Olivier.

#### ✅ Functional Requirements

- Store and retrieve species/variety taxonomy and production statistics
- Define pedo-climatic requirements (temperature, pH, salinity, etc.)
- Track rootstock compatibility matrix and selection logic
- Store phenological stage definitions with satellite index ranges
- Calculate NPK requirements based on target yield and stage (contains 26 nutrition sections)
- Define micronutrient sufficiency ranges and foliar diagnosis thresholds
- Define irrigation thresholds by system type and phenological stage
- Store phytosanitary alert periods and economic thresholds
- Define harvest readiness criteria and quality standards
- Provide predictive model recommendations based on satellite data
- Track annual planning calendar with critical decision points for Olivier

#### 🚫 Out of Scope / Constraints

- Detailed farm economics or ROI calculations
- Real-time pest identification from images
- Integration with external weather APIs (data provided as input)
- Field-level soil sampling logistics
- Regulatory compliance for export markets
- Labor management or scheduling

#### 🔗 Dependencies

- Satellite data source (Sentinel-2 or similar) for NDVI/NIRv/NDMI calculation
- Soil test data (optional but recommended for nutrition planning)
- Water quality data (CE, Cl, Na content)
- Target yield or production goal from farmer
- Phenological stage observation from field (or satellite-based estimation)

#### ❓ Open Questions / Ambiguities

- Should alternate bearing years have separate recommendation profiles?
- How to handle partial soil test results (some but not all parameters)?
- Should microclimate variations within field be modeled?
- What level of phytosanitary pressure data is available (economic thresholds)?

#### 🏷️ Labels / Tags

- `reference-data`
- `crop-specific`
- `nutrition`
- `phenology`
- `satellite-thresholds`
- `olivier`

---

#### 🎯 Palmier Dattier Reference Data System

#### 📌 Overview

**RÉFÉRENTIEL OPÉRATIONNEL COMPLET** *Phoenix dactylifera L.* Fichier indexé pour le moteur IA Document central contenant TOUTES les données nécessaires pour piloter une palmeraie de A à Z Variétés • Pollinisation • Stades phénologiques • Seuils satellite • NPK & Microéléments • Irrigation oasienne 

This document defines all operational parameters needed to manage Palmier Dattier from A to Z, including species classification, phenological stages, satellite monitoring thresholds, nutrition programs, and phytosanitary alerts.

#### 👤 User Stories / Use Cases

- As a farm manager, I need reference data on Palmier Dattier varieties and their characteristics to select optimal cultivars.
- As a fertility advisor, I need NPK/micronutrient requirements for Palmier Dattier at each phenological stage.
- As a crop monitor, I need satellite index thresholds (NDVI, NIRv, NDMI) to detect Palmier Dattier stress.
- As a harvester, I need maturity stages and quality parameters for Palmier Dattier.
- As a disease scout, I need phytosanitary thresholds and pressure periods for Palmier Dattier.

#### ✅ Functional Requirements

- Store and retrieve species/variety taxonomy and production statistics
- Define pedo-climatic requirements (temperature, pH, salinity, etc.)
- Track rootstock compatibility matrix and selection logic
- Store phenological stage definitions with satellite index ranges
- Calculate NPK requirements based on target yield and stage (contains 4 nutrition sections)
- Define micronutrient sufficiency ranges and foliar diagnosis thresholds
- Define irrigation thresholds by system type and phenological stage
- Store phytosanitary alert periods and economic thresholds
- Define harvest readiness criteria and quality standards
- Provide predictive model recommendations based on satellite data
- Track annual planning calendar with critical decision points for Palmier Dattier

#### 🚫 Out of Scope / Constraints

- Detailed farm economics or ROI calculations
- Real-time pest identification from images
- Integration with external weather APIs (data provided as input)
- Field-level soil sampling logistics
- Regulatory compliance for export markets
- Labor management or scheduling

#### 🔗 Dependencies

- Satellite data source (Sentinel-2 or similar) for NDVI/NIRv/NDMI calculation
- Soil test data (optional but recommended for nutrition planning)
- Water quality data (CE, Cl, Na content)
- Target yield or production goal from farmer
- Phenological stage observation from field (or satellite-based estimation)

#### ❓ Open Questions / Ambiguities

- Should alternate bearing years have separate recommendation profiles?
- How to handle partial soil test results (some but not all parameters)?
- Should microclimate variations within field be modeled?
- What level of phytosanitary pressure data is available (economic thresholds)?

#### 🏷️ Labels / Tags

- `reference-data`
- `crop-specific`
- `nutrition`
- `phenology`
- `satellite-thresholds`
- `palmier-dattier`

---

