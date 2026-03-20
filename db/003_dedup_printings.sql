-- Remove duplicate printings (run 1 - NOT IN approach)
DELETE FROM printings
WHERE id NOT IN (
    SELECT MIN(id)
    FROM printings
    GROUP BY card_id, set_id, collector_number
);

-- Remove duplicate printings (run 2 - self join approach)
DELETE FROM printings a
USING printings b
WHERE a.id > b.id
AND a.card_id = b.card_id
AND a.set_id = b.set_id
AND a.collector_number = b.collector_number;

-- Add unique constraint after deduplication
ALTER TABLE printings ADD CONSTRAINT unique_printing 
UNIQUE (card_id, set_id, collector_number);