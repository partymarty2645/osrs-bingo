import sqlite3
import re
conn = sqlite3.connect('file:clan_data.db?mode=ro', uri=True)
cursor = conn.cursor()
cursor.execute("SELECT content FROM discord_messages WHERE content LIKE '% coins)%' LIMIT 10")
for row in cursor.fetchall():
    print(row[0])
