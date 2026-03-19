import json
with open('all_teams.json') as f:
    teams_data = json.load(f)
min_v = 999999999
for t in teams_data:
    for p in t['players']:
        for i in p['items_obtained']:
            min_v = min(min_v, i['value_gp'])
print("Min value in JSON:", min_v)
