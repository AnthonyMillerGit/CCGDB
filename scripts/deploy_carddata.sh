#!/usr/bin/env bash
# Deploy card/set/printing data to production WITHOUT touching user data.
#
# Usage:
#   ./scripts/deploy_carddata.sh
#
# Strategy:
#   1. Dump only game/set/card/printing tables from local DB
#   2. SCP the dump to EC2
#   3. On EC2: export user-linked tables (collections/decks) to /tmp,
#              truncate everything EXCEPT users, restore card data,
#              restore user-linked tables from /tmp files
#
# Tables NEVER truncated: users (accounts survive; no FK to card tables)

set -euo pipefail

EC2_HOST="ubuntu@52.8.18.142"
EC2_KEY="/Users/anthonymiller/Documents/AWS/ccgvault-key.pem"
LOCAL_CONTAINER="ccgdb-postgres-1"
LOCAL_DB="ccgdb"
LOCAL_USER="admin"
DUMP_FILE="/tmp/ccgdb_carddata_$(date +%Y%m%d_%H%M%S).dump"

CARD_TABLES=(games sets cards printings)

echo "=== Dumping card/set/printing tables from local DB ==="
TABLES_ARGS=""
for t in "${CARD_TABLES[@]}"; do TABLES_ARGS="$TABLES_ARGS -t $t"; done
docker exec "$LOCAL_CONTAINER" pg_dump -U "$LOCAL_USER" -Fc $TABLES_ARGS "$LOCAL_DB" > "$DUMP_FILE"
echo "Dump written to $DUMP_FILE ($(du -sh "$DUMP_FILE" | cut -f1))"

echo ""
echo "=== Copying to EC2 ==="
scp -i "$EC2_KEY" "$DUMP_FILE" "${EC2_HOST}:/tmp/carddata.dump"

echo ""
echo "=== Restoring on EC2 (card tables only, user data preserved) ==="
ssh -i "$EC2_KEY" "$EC2_HOST" bash <<'REMOTE'
set -euo pipefail

# Tables that reference card tables and need to be saved/restored
# (users is NOT here — user accounts have no FK to card tables)
USER_LINKED=(decks deck_cards wishlists user_collections user_favorite_games password_reset_tokens)

echo "Step 1: Export user-linked data to /tmp files..."
for t in "${USER_LINKED[@]}"; do
  docker exec postgres psql -U ccgvault -d ccgdb -tAc "COPY $t TO STDOUT" > /tmp/ud_${t}.tsv
  lines=$(wc -l < /tmp/ud_${t}.tsv)
  echo "  $t: $lines rows"
done

echo ""
echo "Step 2: Truncate all tables except users..."
docker exec postgres psql -U ccgvault -d ccgdb -c "
  TRUNCATE
    deck_cards, decks, wishlists, user_collections, user_favorite_games,
    password_reset_tokens, post_card_tags, post_game_tags, post_set_tags,
    printings, cards, sets, games
  RESTART IDENTITY;
  SELECT 'All tables truncated (users untouched)';
"

echo ""
echo "Step 3: Restore card data..."
docker exec -i postgres pg_restore \
  -U ccgvault -d ccgdb \
  --no-owner --no-acl \
  --data-only \
  --disable-triggers \
  < /tmp/carddata.dump
echo "Card data restored"

echo ""
echo "Step 4: Restore user-linked data in dependency order..."
# decks must come before deck_cards; user_collections after printings
for t in decks wishlists user_favorite_games password_reset_tokens deck_cards user_collections; do
  count=$(wc -l < /tmp/ud_${t}.tsv)
  if [ "$count" -gt 0 ]; then
    docker exec -i postgres psql -U ccgvault -d ccgdb \
      -c "SET session_replication_role = replica;" \
      -c "COPY $t FROM STDIN;" \
      < /tmp/ud_${t}.tsv
    echo "  $t: $count rows restored"
  else
    echo "  $t: empty, skipped"
  fi
done

echo ""
echo "Step 5: Reset sequences..."
docker exec postgres psql -U ccgvault -d ccgdb -tAc "
  SELECT setval('decks_id_seq',              COALESCE((SELECT MAX(id) FROM decks), 1));
  SELECT setval('deck_cards_id_seq',         COALESCE((SELECT MAX(id) FROM deck_cards), 1));
  SELECT setval('wishlists_id_seq',          COALESCE((SELECT MAX(id) FROM wishlists), 1));
  SELECT setval('password_reset_tokens_id_seq', COALESCE((SELECT MAX(id) FROM password_reset_tokens), 1));
  SELECT setval('user_collections_id_seq',   COALESCE((SELECT MAX(id) FROM user_collections), 1));
"

echo ""
echo "Verification:"
docker exec postgres psql -U ccgvault -d ccgdb -tAc "
  SELECT 'games: '            || COUNT(*) FROM games
  UNION ALL SELECT 'cards: '             || COUNT(*) FROM cards
  UNION ALL SELECT 'printings: '         || COUNT(*) FROM printings
  UNION ALL SELECT 'users: '             || COUNT(*) FROM users
  UNION ALL SELECT 'user_collections: '  || COUNT(*) FROM user_collections
  UNION ALL SELECT 'decks: '             || COUNT(*) FROM decks
  UNION ALL SELECT 'deck_cards: '        || COUNT(*) FROM deck_cards;
"

rm -f /tmp/ud_*.tsv
echo ""
echo "Done. Card data deployed, user data preserved."
REMOTE

rm -f "$DUMP_FILE"
echo ""
echo "Local dump cleaned up. Deployment complete."
