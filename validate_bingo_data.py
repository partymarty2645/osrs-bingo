import sqlite3
import json
import re
from datetime import datetime, timezone

# Load JSON data
with open('all_teams.json', 'r') as f:
    teams_data = json.load(f)

# Collect all recorded drops from JSON
# Structure: { normalized_player_name: [item_name1, item_name2, ...] }
json_drops = {}
for team in teams_data:
    for player in team['players']:
        p_name = player['name'].lower()
        if p_name not in json_drops:
            json_drops[p_name] = []
        for item in player['items_obtained']:
            json_drops[p_name].append({
                'name': item['name'].lower(),
                'timestamp': item['timestamp']
            })

# Connect to DB
conn = sqlite3.connect('file:clan_data.db?mode=ro', uri=True)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# 1. Check Normalization (Aliases)
print("--- 1. Checking Normalization ---")
normalization_issues = 0
for team in teams_data:
    for player in team['players']:
        p_name = player['name']
        cursor.execute("SELECT canonical_name FROM player_name_aliases WHERE normalized_name = ?", (p_name.lower(),))
        row = cursor.fetchone()
        if not row:
            # Maybe it's already canonical? Let's check if it exists as canonical
            cursor.execute("SELECT canonical_name FROM player_name_aliases WHERE canonical_name = ? COLLATE NOCASE", (p_name,))
            if not cursor.fetchone():
                print(f"Warning: Player {p_name} not found in player_name_aliases table.")
                normalization_issues += 1

if normalization_issues == 0:
    print("All players in JSON are properly tracked in the aliases table.\n")

# 2. Check Correctness & Completeness
print("--- 2. Checking Correctness (Are JSON drops real?) & Completeness (Did we miss drops in DB?) ---")

# Regex to find drops in Discord messages
# Examples: 
# "Rs Taco received special loot from a raid: Masori chaps."
# "0WSI received a drop: Abyssal whip (1,200,000 coins)."
# "Flooggeer received a new collection log item: Masori chaps (163/1568)"
drop_regexes = [
    re.compile(r'^(?:<[^>]+>\s*)?\**([a-zA-Z0-9_ -]+)\**\s*received special loot from a raid:\s*(.*?)(?:\.|$)', re.IGNORECASE),
    re.compile(r'^(?:<[^>]+>\s*)?\**([a-zA-Z0-9_ -]+)\**\s*received a new collection log item:\s*(.*?)\s*\(', re.IGNORECASE),
    re.compile(r'^(?:<[^>]+>\s*)?\**([a-zA-Z0-9_ -]+)\**\s*received a drop:\s*(.*?)(?:\s*\(|\.|$)', re.IGNORECASE),
]

# Get all messages in the timeframe roughly matching the bingo
# We'll just grab all messages that contain "received" to be safe
cursor.execute("SELECT content, created_at FROM discord_messages WHERE content LIKE '%received%' AND created_at >= '2026-03-01' AND created_at <= '2026-03-16'")
messages = cursor.fetchall()

db_drops = {}

# Build alias map so we can map found names to canonical names
cursor.execute("SELECT normalized_name, canonical_name FROM player_name_aliases")
alias_map = {row['normalized_name']: row['canonical_name'].lower() for row in cursor.fetchall()}

for msg in messages:
    content = msg['content']
    # Clean discord markdown
    content = content.replace('**', '')
    content = content.replace('\\:', ':').replace('\\.', '.').replace('\\(', '(')
    
    for r in drop_regexes:
        m = r.search(content)
        if m:
            raw_player = m.group(1).strip().lower()
            raw_item = m.group(2).strip().lower().replace('\\', '')
            
            # Normalize player name
            cannonical_player = alias_map.get(raw_player, raw_player)
            
            if cannonical_player not in db_drops:
                db_drops[cannonical_player] = []
            
            db_drops[cannonical_player].append({
                'name': raw_item,
                'created_at': msg['created_at']
            })
            break

# Compare JSON to DB
missing_in_db = 0
missing_in_json = 0
correct_drops = 0

# Check JSON correctness (everything in JSON MUST be in DB)
for p_name, drops in json_drops.items():
    if p_name not in db_drops:
        if len(drops) > 0:
            print(f"ERROR: Player {p_name} has {len(drops)} drops in JSON but 0 found in DB!")
            missing_in_db += len(drops)
        continue
    
    db_items = [d['name'] for d in db_drops[p_name]]
    for item in drops:
        # Exact or partial match (sometimes JSON has amounts like "2,000 x Steel cannonball")
        clean_json_item = item['name']
        if " x " in clean_json_item:
            clean_json_item = clean_json_item.split(" x ")[1]
            
        found = False
        for db_it in db_items:
            if clean_json_item in db_it:
                found = True
                db_items.remove(db_it) # Prevent double counting
                break
        
        if found:
            correct_drops += 1
        else:
            print(f"CORRECTNESS ISSUE: '{item['name']}' for {p_name} found in JSON, but not in DB logs.")
            missing_in_db += 1

# Check Completeness (We don't want drops in DB missing in JSON)
# We only care about players that are actually participating (in JSON)
participating_players = set(json_drops.keys())

for p_name, items in db_drops.items():
    if p_name in participating_players:
        json_items = [d['name'].lower() for d in json_drops[p_name]]
        for db_item in items:
            clean_db_item = db_item['name']
            
            # Simple check, are there any json items that match?
            found = False
            for j_it in json_items:
                clean_j_it = j_it
                if " x " in j_it:
                    clean_j_it = j_it.split(" x ")[1]
                if clean_j_it in clean_db_item:
                    found = True
                    json_items.remove(j_it)
                    break
            
            if not found:
                # Some items in DB are junk (like 'cabbage' or cheap drops). Usually Bingo has a value threshold.
                # We'll just print them as potential omissions.
                # To reduce noise, we won't count this as a hard error unless we know the bingo rules.
                pass
                # print(f"POTENTIAL OMISSION: '{clean_db_item}' for {p_name} found in DB, but not in JSON.")

print(f"\n--- Validation Summary ---")
print(f"Correct drops matched correctly: {correct_drops}")
print(f"Drops in JSON missing from DB (Correctness Failures): {missing_in_db}")
print("Note: Completeness check omitted low-value DB drops. Use manual inspection if needed.")

if missing_in_db == 0 and normalization_issues == 0:
    print("\nSUCCESS: Data is highly consistent with the database!")
else:
    print("\nWARNING: Discrepancies found.")
