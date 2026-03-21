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
    print("Fetching back face images for double-faced cards...")
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            # Get all MTG printings that have a front image but no back image
            # Double-faced cards are identified by // in their name
            cur.execute("""
                SELECT p.id, p.collector_number, s.code, c.name
                FROM printings p
                JOIN cards c ON c.id = p.card_id
                JOIN sets s ON s.id = p.set_id
                WHERE c.game_id = 1
                AND c.name LIKE '%//%'
                AND p.image_url IS NOT NULL
                AND p.back_image_url IS NULL
                ORDER BY s.code, p.collector_number
            """)
            dfc_printings = cur.fetchall()
            print(f"Found {len(dfc_printings)} double-faced printings to fix")

            fixed = 0
            failed = 0

            for i, (printing_id, collector_number, set_code, card_name) in enumerate(dfc_printings):
                try:
                    url = f"https://api.scryfall.com/cards/{set_code}/{collector_number}"
                    response = requests.get(url)

                    if response.status_code == 404:
                        failed += 1
                        continue

                    response.raise_for_status()
                    card_data = response.json()

                    back_image_url = None
                    if "card_faces" in card_data:
                        faces = card_data["card_faces"]
                        if len(faces) > 1 and "image_uris" in faces[1]:
                            back_image_url = faces[1]["image_uris"].get("normal")

                    if back_image_url:
                        cur.execute("""
                            UPDATE printings SET back_image_url = %s WHERE id = %s
                        """, (back_image_url, printing_id))
                        fixed += 1
                    else:
                        failed += 1

                    if (i + 1) % 50 == 0:
                        conn.commit()
                        print(f"  [{i+1}/{len(dfc_printings)}] Fixed: {fixed} Failed: {failed}")

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