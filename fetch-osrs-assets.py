#!/usr/bin/env python3
"""
OSRS Asset Downloader
Fetches item icons from the Old School RuneScape wiki and saves them locally.
Uses multiple URL patterns and includes error handling with fallbacks.
Now parses all_teams.json for dynamic items.
"""

import os
import urllib.request
import urllib.error
from pathlib import Path
import json
import time
import re
from urllib.parse import quote

class OSRSAssetFetcher:
    def __init__(self, output_dir="public/assets/icons"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.success_count = 0
        self.failed_count = 0
        self.downloaded = []
        
    def fetch_asset(self, asset_name, wiki_paths):
        """Try to fetch an asset from multiple wiki URL patterns."""
        # Sanitize asset name for local file
        safe_name = asset_name.lower().replace(' ', '_').replace("'", "")
        filepath = self.output_dir / f"{safe_name}.png"
        
        # Skip if already exists
        if filepath.exists() and filepath.stat().st_size > 100:
            print(f"  ⏭️  Skipping {asset_name} (already exists)")
            self.success_count += 1
            return True

        for wiki_path in wiki_paths:
            # wiki_path typically might have spaces or underscores. OSRS wiki uses underscores
            formatted_wiki_path = wiki_path.replace(' ', '_')
            url = f"https://oldschool.runescape.wiki/images/{quote(formatted_wiki_path)}.png"
            try:
                print(f"  ⏳ Trying {formatted_wiki_path}...", end=" ", flush=True)
                req = urllib.request.Request(
                    url,
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OSRSBingo/1.0'}
                )
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = response.read()
                    if len(data) > 100:  # Validate it's a real image
                        with open(filepath, 'wb') as f:
                            f.write(data)
                        print(f"✅ ({len(data)} bytes)")
                        self.success_count += 1
                        self.downloaded.append(safe_name)
                        return True
            except (urllib.error.HTTPError, urllib.error.URLError, Exception):
                pass
            time.sleep(0.1)  # Rate limiting
        
        print(f"❌ Failed to find {asset_name}")
        self.failed_count += 1
        return False

    def fetch_all(self, assets):
        """Fetch all assets with their alternative paths."""
        print(f"\n🎮 OSRS Asset Downloader")
        print(f"📁 Output: {self.output_dir.absolute()}\n")
        
        for asset_name, wiki_paths in assets.items():
            self.fetch_asset(asset_name, wiki_paths)
        
        print(f"\n✅ Fetched/Exists: {self.success_count}/{len(assets)} assets")
        print(f"❌ Failed: {self.failed_count}/{len(assets)} assets")
        
        if self.downloaded:
            print(f"\n📦 Downloaded {len(self.downloaded)} new assets.")
        
        return self.success_count > 0

# OSRS Items and their wiki page variations (Base system assets)
OSRS_ASSETS = {
    "trophy": ["Trophy_icon", "Trophy_(item)", "Achievement_Trophy"],
    "coins": ["Coins", "Coins_icon", "Coins_25", "Coins_(item)"],
    "skull": ["Skull", "Skull_icon", "Skull_(item)"],
    "swords": ["Abyssal_whip", "Abyssal_whip_(item)", "Abyssal_whip_icon"],
    "experience": ["Experience", "Experience_icon", "Experience_(item)"],
    "defense": ["Defence_icon", "Defence_icon_(item)", "Defence"],
    "hitpoints": ["Hitpoints_icon", "Hitpoints_icon_(item)", "Hitpoints"],
    "attack": ["Attack_icon", "Attack_icon_(item)", "Attack"],
    "loot": ["Uncut_emerald", "Uncut_emerald_(item)", "Uncut_emerald_icon"],
    "achievement": ["Achievement_diary_icon", "Achievement_Diary_icon", "Achievement"],
    "rune_essence": ["Rune_essence", "Rune_essence_(item)", "Pure_essence"],
}

def load_dynamic_items(filepath="all_teams.json"):
    """Reads all_teams.json and extracts unique drop items to add to fetch list."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"⚠️ Could not find {filepath}. Skipping dynamic item loading.")
        return
    
    unique_items = set()
    prefix_pattern = re.compile(r'^[0-9,]+\s*x\s+')
    
    for team in data:
        for player in team.get('players', []):
            for item in player.get('items_obtained', []):
                name = item.get('name', '')
                if name:
                    # Strip leading quantities like "250 x " or "5x "
                    clean_name = prefix_pattern.sub('', name).strip().replace('\\', '')
                    unique_items.add(clean_name)
                    
    print(f"🔍 Found {len(unique_items)} unique items in {filepath}. Including new fallback variants.")
    
    for item in unique_items:
        # e.g., "Dragon platelegs"
        wiki_variants = [
            f"{item}_detail",
            f"{item}",
            f"{item}_icon",
            f"{item}_(item)",
            f"{item}_5",
            f"{item}_100",
            f"{item}_1000",
            f"{item}_10000",
            f"{item}_4_detail",
            f"{item}_5_detail",
        ]
        
        # Add singular variants if it ends with 's'
        if item.endswith('s'):
            singular = item[:-1]
            wiki_variants.extend([
                f"{singular}",
                f"{singular}_detail",
                f"{singular}_icon",
                f"{singular}_(item)",
                f"{singular}_5"
            ])

        cap_item = item.capitalize()
        if cap_item != item:
            wiki_variants.extend([
                f"{cap_item}_detail",
                f"{cap_item}",
                f"{cap_item}_icon",
                f"{cap_item}_(item)",
                f"{cap_item}_5",
                f"{cap_item}_100",
                f"{cap_item}_1000",
                f"{cap_item}_4_detail",
            ])
            if cap_item.endswith('s'):
                singular_cap = cap_item[:-1]
                wiki_variants.extend([
                    f"{singular_cap}",
                    f"{singular_cap}_detail",
                    f"{singular_cap}_icon",
                    f"{singular_cap}_(item)"
                ])
            
        OSRS_ASSETS[item] = wiki_variants

if __name__ == "__main__":
    load_dynamic_items()
    
    fetcher = OSRSAssetFetcher()
    success = fetcher.fetch_all(OSRS_ASSETS)
    
    if success:
        print("\n✨ Asset download complete! Update your components to use the local images.")
    else:
        print("\n⚠️  No assets were downloaded. Check your internet connection and try again.")
        print("    Note: The OSRS wiki may require browser automation to access images.")

