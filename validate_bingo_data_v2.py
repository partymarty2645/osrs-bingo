import sqlite3
import json
import re
from datetime import datetime, timezone

# Load JSON data
with open('all_teams.json', 'r') as f:
    teams_data = json.load(f)

# Normalize string for robust comparison: lowercase and remove all non-alphanumeric chars
def normalize_name(name):
    return re.sub(r'[^a-z0-9]', '', name.lower())

json_drops = {}
participating_players = set()
for team in teams_data:
    for player in team['players']:
        p_name = normalize_name(player['name'])
        participating_players.add(p_name)
        if p_name not in json_drops:
            json_drops[p_name] = []
        for item in player['items_obtained']:
            clean_item_name = item['name'].lower().replace('\\', '')
            clean_item_name = re.sub(r'\s*\(.*?\)', '', clean_item_name)
            if " x " in clean_item_name:
                clean_item_name = clean_item_name.split(" x ")[1]
            json_drops[p_name].append({
                'name': clean_item_name.strip(),
                'json_original_name': item['name'],
                'timestamp': item['timestamp'],
                'matched': False
            })

# Connect to DB
conn = sqlite3.connect('file:clan_data.db?mode=ro', uri=True)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Get all messages in the timeframe roughly matching the bingo
cursor.execute("SELECT content, created_at FROM discord_messages WHERE content LIKE '%received%' AND created_at >= '2026-03-01' AND created_at <= '2026-03-16'")
messages = cursor.fetchall()

db_drops = {}

drop_regexes = [
    re.compile(r'^(?:<[^>]+>\s*)?\**([a-zA-Z0-9_ -]+)\**\s*received special loot from a raid:\s*(.*?)(?:\.|$)', re.IGNORECASE),
    re.compile(r'^(?:<[^>]+>\s*)?\**([a-zA-Z0-9_ -]+)\**\s*received a new collection log item:\s*(.*?)\s*\(', re.IGNORECASE),
    re.compile(r'^(?:<[^>]+>\s*)?\**([a-zA-Z0-9_ -]+)\**\s*received a drop:\s*(.*?)(?:\s*\(|\.|$)', re.IGNORECASE),
]

for msg in messages:
    content = msg['content']
    content = content.replace('**', '')
    content = content.replace('\\:', ':').replace('\\.', '.').replace('\\(', '(')
    
    for r in drop_regexes:
        m = r.search(content)
        if m:
            raw_player = normalize_name(m.group(1))
            raw_item = m.group(2).strip().lower().replace('\\', '')
            raw_item = re.sub(r'\s*\(.*?\)', '', raw_item)
            
            if raw_player in participating_players:
                if raw_player not in db_drops:
                    db_drops[raw_player] = []
                db_drops[raw_player].append({
                    'name': raw_item.strip(),
                    'created_at': msg['created_at'],
                    'matched': False
                })
            break

# Compare JSON to DB
missing_in_db = []
correct_drops = 0

for p_name, drops in json_drops.items():
    if p_name not in db_drops:
        for d in drops:
            missing_in_db.append((p_name, d['json_original_name']))
        continue
    
    for json_item in drops:
        found = False
        for db_item in db_drops[p_name]:
            if not db_item['matched'] and json_item['name'] in db_item['name']:
                db_item['matched'] = True
                json_item['matched'] = True
                found = True
                break
        
        if found:
            correct_drops += 1
        else:
            missing_in_db.append((p_name, json_item['json_original_name']))

# Potential DB drops missing in JSON
missing_in_json = []
for p_name, drops in db_drops.items():
    for d in drops:
        if not d['matched']:
            missing_in_json.append((p_name, d['name'], d['created_at']))

print(f"--- Validation Summary ---")
print(f"Total drops in JSON: {sum(len(d) for d in json_drops.values())}")
print(f"Correct drops (matched 1:1): {correct_drops}")
print(f"Drops in JSON MISSING in DB (False data?): {len(missing_in_db)}")

if len(missing_in_db) > 0:
    print("\n--- ERROR: Drops in JSON but NOT found in Database ---")
    for player, item in missing_in_db:
        print(f"[{player}] claims: {item}")

print(f"\nDrops in DB but missing in JSON (Possible omissions): {len(missing_in_json)}")

# Find out if we have major discrepancy or just noise (like "cabbage" not included in bingo JSON)
noise_keywords = ['cabbage', 'coins', 'bones', 'grimy', 'unstrung', 'seed']
legit_missing = []
for p, item, date in missing_in_json:
    if not any(k in item for k in noise_keywords):
        legit_missing.append((p, item, date))

if legit_missing:
    print("\n--- WARNING: Valuable drops in Database MISSING in JSON ---")
    for p, i, d in legit_missing[:30]:
        print(f"[{p}] missed: {i} ({d})")
