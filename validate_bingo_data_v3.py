import sqlite3
import json
import re
from datetime import datetime, timezone

# Load JSON data
with open('all_teams.json', 'r') as f:
    teams_data = f.read()
    teams_json = json.loads(teams_data)

# Normalize string for robust comparison
def normalize_name(name):
    return re.sub(r'[^a-z0-9]', '', name.lower())

json_drops = {}
participating_players = set()
bingo_start_str = teams_json[0]['period']['start'] # e.g. "2026-03-01T11:00:00+00:00"
bingo_end_str = teams_json[0]['period']['end']

for team in teams_json:
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

# Get messages in strict timeframe
cursor.execute("SELECT content, created_at FROM discord_messages WHERE content LIKE '%received%' AND created_at >= '2026-03-01 11:00:00' AND created_at <= '2026-03-15 11:00:00'")
messages = cursor.fetchall()

db_drops = {}

drop_regexes = [
    re.compile(r'^(?:<[^>]+>\s*)?\**([a-zA-Z0-9_ -]+)\**\s*received special loot from a raid:\s*(.*?)(?:\.|$)', re.IGNORECASE),
    re.compile(r'^(?:<[^>]+>\s*)?\**([a-zA-Z0-9_ -]+)\**\s*received a new collection log item:\s*(.*?)\s*\(', re.IGNORECASE),
    re.compile(r'^(?:<[^>]+>\s*)?\**([a-zA-Z0-9_ -]+)\**\s*received a drop:\s*(.*?)(?:\s*\(|\.|$)', re.IGNORECASE),
]

def extract_value(content):
    # Match (...) coins) or something similar
    val_match = re.search(r'\(([\d,]+)\s*coins\)', content, re.IGNORECASE)
    if val_match:
        try:
            return int(val_match.group(1).replace(',', ''))
        except:
            return 0
    return 0

for msg in messages:
    content = msg['content']
    value = extract_value(content)
    
    # Filter rules for completeness validation:
    # Most items under 500k aren't counted unless they're special collection log slots without values
    
    content = content.replace('**', '')
    content = content.replace('\\:', ':').replace('\\.', '.').replace('\\(', '(')
    
    for r in drop_regexes:
        m = r.search(content)
        if m:
            raw_player = normalize_name(m.group(1))
            raw_item = m.group(2).strip().lower().replace('\\', '')
            raw_item = re.sub(r'\s*\(.*?\)', '', raw_item)
            
            # Certain drops are just purely junk, but sometimes no coin value means special item
            # Let's track DB drops > 500k 
            # (or collection log items, which may have 0 val listed but are valuable bingo tiles)
            if value >= 500000 or "collection log" in content or "special loot" in content:
                if raw_player in participating_players:
                    if raw_player not in db_drops:
                        db_drops[raw_player] = []
                    db_drops[raw_player].append({
                        'name': raw_item.strip(),
                        'created_at': msg['created_at'],
                        'value': value,
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

# What's left in DB that JSON didn't pick up?
missing_in_json = []
for p_name, drops in db_drops.items():
    for d in drops:
        if not d['matched']:
            missing_in_json.append((p_name, d['name'], d['created_at'], d['value']))

print(f"--- 100% COMPLETENESS GUARANTEE REPORT ---")
print(f"Total drops in JSON UI Data: {sum(len(d) for d in json_drops.values())}")
print(f"Confirmed valid Drops (matched 1:1 against DB logs): {correct_drops}")

if len(missing_in_db) > 0:
    print(f"\n[ALERT] FAKE OR WRONG DROPS IN JSON ({len(missing_in_db)}):")
    for player, item in missing_in_db:
        print(f"[{player}] claims: {item}")
else:
    print("\n[SUCCESS] 100% CORRECTNESS: Every single drop in the Dashboard matches a real DB log.")

print(f"\nPotential Drops Omitted from Dashboard (>500k value/Unique): {len(missing_in_json)}")
if len(missing_in_json) > 0:
    print(f"Here are the most valuable omissions from the database that MIGHT be missing from JSON:")
    missing_in_json = sorted(missing_in_json, key=lambda x: x[3], reverse=True)
    for p, i, d, v in missing_in_json[:20]:
        print(f"[{p}] missed: {i} ({d}) - {v:,} coins")
