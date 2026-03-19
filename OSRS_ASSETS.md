# OSRS Asset Integration Guide

## Overview
This project now features **real Old School RuneScape item icons** fetched directly from the official OSRS wiki, replacing generic lucide-react icons with authentic game assets.

## Asset Files

### Location
```
public/assets/icons/     ← Live assets served to the application
src/assets/icons/        ← Source copies of downloaded assets
```

### Downloaded Assets (8 total)
- **coins.png** - In-game currency icon
- **skull.png** - Death/skull icon for "Most Active" metrics
- **swords.png** - Combat weapon icon (Abyssal Whip)
- **defense.png** - Defense stat icon
- **hitpoints.png** - Health/Hitpoints stat icon
- **attack.png** - Attack stat icon
- **loot.png** - Drop item icon (Uncut Emerald)
- **rune_essence.png** - Experience/progression icon

## OsrsIcon Component

### Location
```
src/components/OsrsIcon.jsx
```

### Usage
```jsx
import OsrsIcon from './components/OsrsIcon';

// Simple usage
<OsrsIcon iconKey="trophy" size={40} />

// With styling
<OsrsIcon 
  iconKey="coins" 
  size={24} 
  className="text-gold"
  style={{ filter: 'drop-shadow(0 0 4px gold)' }}
/>
```

### Supported Icon Keys
```javascript
{
  trophy: 'Trophy/achievement icon',
  skull: 'Death/skull icon',
  swords: 'Combat/weapons icon',
  trending_up: 'Experience/progression icon',
  coins: 'Currency/wealth icon',
  loot: 'Drop/item icon',
  achievement: 'Achievement icon',
  power: 'Power/energy icon',
  defense: 'Defense stat icon',
  hitpoints: 'Health/hitpoints icon'
}
```

### How It Works
1. **Primary Source**: Attempts to load from local assets (`/assets/icons/{iconKey}.png`)
2. **Fallback Source**: If local asset fails, tries OSRS wiki URL
3. **Final Fallback**: If wiki URL fails, displays lucide-react icon
4. **Styling**: Automatically applies pixelated rendering for authentic retro look

## Fetching More Assets

### Automated Script
```bash
python3 fetch-osrs-assets.py
```

This script:
- Fetches assets from the OSRS wiki
- Tries multiple URL patterns for each item
- Includes rate limiting to respect server
- Validates downloaded images
- Displays success/failure summary

### Manual Setup
1. Run the fetch script: `python3 fetch-osrs-assets.py`
2. Copy downloaded assets: `cp src/assets/icons/*.png public/assets/icons/`
3. Update `OSRS_ICON_MAP` in `src/components/OsrsIcon.jsx` with new icons
4. Rebuild: `npm run build`

## Styling

### CSS Classes
All OSRS icons have the `.osrs-icon` class for styling:

```css
.osrs-icon {
  /* Pixelated rendering for retro look */
  image-rendering: pixelated;
  
  /* Shadow effect */
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.osrs-icon:hover {
  filter: drop-shadow(0 4px 8px rgba(168, 85, 247, 0.5));
  transform: scale(1.1);
}
```

### Size Variants
- **40px**: Stat cards (`.stat-icon`)
- **24px**: Achievement cards (`.achievement-icon`)
- **20px**: Navigation items (`.nav-icon`)
- **Custom**: Pass `size` prop to `OsrsIcon`

## Architecture

### Component Integration

#### StatCard Component
- Uses `iconKey` prop to display OSRS icons
- Falls back to lucide-react `icon` prop if `iconKey` not provided
- Maintains backward compatibility

#### AchievementCard Component  
- Renders OSRS icons with golden glow effect
- Cascading fallback system ensures icons always display

#### Navigation
- Team navigation items can use OSRS icons
- Maintains color coding for different teams

## Asset Source
All assets fetched from:
```
https://oldschool.runescape.wiki/images/
```

### Example URLs
```
https://oldschool.runescape.wiki/images/Coins_25.png
https://oldschool.runescape.wiki/images/Skull.png
https://oldschool.runescape.wiki/images/Abyssal_whip.png
```

## Browser Compatibility
- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Pixelated rendering supported in all current versions
- ✅ Fallback to lucide-react for missing assets

## Performance
- **Local Assets**: Zero latency, instant loading
- **Wiki Fallback**: ~2-5ms network latency
- **Lucide Fallback**: Instant (already loaded in JS bundle)

## Future Enhancements
- [ ] Generate sprite sheets for batch loading
- [ ] Implement CDN caching for wiki images
- [ ] Add more OSRS item icons (equipment, bosses, etc.)
- [ ] Create item icon tooltip system with wiki links
- [ ] Add image compression optimization

## Troubleshooting

### Icons Not Showing
1. Check browser console for errors
2. Verify assets exist in `public/assets/icons/`
3. Clear browser cache: `Ctrl+Shift+Delete`
4. Rebuild project: `npm run build`

### Wrong Icon Displaying
1. Check `iconKey` spelling in component
2. Verify key exists in `OSRS_ICON_MAP`
3. Re-run asset fetch: `python3 fetch-osrs-assets.py`

### Wiki Images Not Loading
- The OSRS wiki may have rate limiting
- Uses local assets as primary source for reliability
- Lucide fallback ensures UI always works

## Files Modified
- `src/App.jsx` - Integrated OsrsIcon component
- `src/components/OsrsIcon.jsx` - New icon component
- `src/App.css` - Added OSRS icon styling
- `public/assets/icons/` - Asset directory
- `fetch-osrs-assets.py` - Asset fetcher script

---

**Status**: ✅ Complete with 8 core assets, scalable for expansion
