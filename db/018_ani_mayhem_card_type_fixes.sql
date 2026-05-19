-- Ani-Mayhem card type QC fixes
-- Fixes 10 confirmed Disaster cards mislabeled as Character,
-- 1 suspicious card (Kiriya) reclassified as Minor Disaster based on "Difficulty: D" marker,
-- and 6 cards with blank card_type assigned their correct types.
-- Toma (id=1960904) and Toma's Guards (id=1960905) retain Character type —
-- "Series D" in their notes refers to the El-Hazard anime series designation, not a Disaster marker.

-- =============================================
-- CONFIRMED DISASTERS: reclassify from Character
-- =============================================

-- Minor Disasters ("D" marker, not "D!")
UPDATE cards SET card_type = 'Minor Disaster' WHERE id = 1960627; -- 33-S Sexaroid
UPDATE cards SET card_type = 'Minor Disaster' WHERE id = 1960759; -- Kodachi Kuno (The Black Rose)
UPDATE cards SET card_type = 'Minor Disaster' WHERE id = 1960886; -- Tatewaki Kuno

-- Major Disasters ("D!" marker)
UPDATE cards SET card_type = 'Major Disaster' WHERE id = 1960731; -- Happosai
UPDATE cards SET card_type = 'Major Disaster' WHERE id = 1960743; -- Jinnai's Strike Squad
UPDATE cards SET card_type = 'Major Disaster' WHERE id = 1960746; -- Juraian Guardians
UPDATE cards SET card_type = 'Major Disaster' WHERE id = 1960751; -- Kagato
UPDATE cards SET card_type = 'Major Disaster' WHERE id = 1960755; -- Kirin
UPDATE cards SET card_type = 'Major Disaster' WHERE id = 1960765; -- Largo
UPDATE cards SET card_type = 'Major Disaster' WHERE id = 1960894; -- The Demoness Ifurita

-- =============================================
-- SUSPICIOUS: Kiriya reclassified as Minor Disaster
-- Basis: "Difficulty: D" marker matches confirmed Minor Disaster format;
-- only "Shadow Nation" pseudo-skill (no combat skills); rules describe
-- an opponent-penalty mechanic consistent with Disaster behavior.
-- =============================================
UPDATE cards SET card_type = 'Minor Disaster' WHERE id = 1960757; -- Kiriya, The Phantom Assassin

-- =============================================
-- BLANK card_type: assign correct types
-- =============================================
UPDATE cards SET card_type = 'Character' WHERE id = 1960840; -- Reika Vision Chang (has Music/Driving/Marksman/Seduction skills)
UPDATE cards SET card_type = 'Item'      WHERE id = 1961025; -- Group Photo ("ITEM: Group Photo" on card)
UPDATE cards SET card_type = 'Combat'    WHERE id = 1961028; -- Happy/Surprise Attack (two-sided combat card)
UPDATE cards SET card_type = 'Location'  WHERE id = 1961031; -- Hu-Gite Manufacturing (green border, location categories)
UPDATE cards SET card_type = 'Item'      WHERE id = 1961043; -- Kelly McCanon Poster ("ITEM: Kelly McCanon Poster" on card)
UPDATE cards SET card_type = 'Item'      WHERE id = 1961045; -- Lab Computers ("ITEM: Lab Computers" on card)
