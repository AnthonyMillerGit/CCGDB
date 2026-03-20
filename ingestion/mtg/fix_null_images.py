import requests
import psycopg2
import os
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD")
    )

def main():
    print("Fixing null image URLs for double-faced cards...")
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            # Get all printings with null images for MTG
            cur.execute("""
                SELECT p.id, p.collector_number, s.code, c.name
                FROM printings p
                JOIN cards c ON c.id = p.card_id
                JOIN sets s ON s.id = p.set_id
                WHERE p.image_url IS NULL
                AND c.game_id = 1
                ORDER BY s.code, p.collector_number
            """)
            null_printings = cur.fetchall()
            print(f"Found {len(null_printings)} printings with null images")

            fixed = 0
            failed = 0

            for i, (printing_id, collector_number, set_code, card_name) in enumerate(null_printings):
                try:
                    # Fetch card from Scryfall by set and collector number
                    url = f"https://api.scryfall.com/cards/{set_code}/{collector_number}"
                    response = requests.get(url)

                    if response.status_code == 404:
                        failed += 1
                        continue

                    response.raise_for_status()
                    card_data = response.json()

                    # Get image url handling double-faced cards
                    image_url = None
                    if "image_uris" in card_data:
                        image_url = card_data["image_uris"].get("normal")
                    elif "card_faces" in card_data:
                        faces = card_data["card_faces"]
                        if faces and "image_uris" in faces[0]:
                            image_url = faces[0]["image_uris"].get("normal")

                    if image_url:
                        cur.execute("""
                            UPDATE printings SET image_url = %s WHERE id = %s
                        """, (image_url, printing_id))
                        fixed += 1
                    else:
                        failed += 1

                    # Commit every 50 fixes
                    if (i + 1) % 50 == 0:
                        conn.commit()
                        print(f"  [{i+1}/{len(null_printings)}] Fixed: {fixed} Failed: {failed}")

                    # Be polite to Scryfall API
                    time.sleep(0.1)

                except Exception as e:
                    print(f"  Error on {card_name} ({set_code}/{collector_number}): {e}")
                    failed += 1
                    continue

            conn.commit()
            print(f"\nDone! Fixed: {fixed} Failed: {failed}")

    finally:
        conn.close()

if __name__ == "__main__":
    main()