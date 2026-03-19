/**
 * OSRS-Styled Icon Component
 * Provides Old School RuneScape themed icons for the dashboard
 * Falls back to lucide-react icons if image fails to load
 */

import React, { useState } from 'react';
import {
  Trophy,
  Skull,
  Swords,
  TrendingUp,
  Coins,
  Package,
  Star,
  Zap,
  Shield,
  Heart,
} from 'lucide-react';

// Mapping of icon keys to OSRS wiki image paths
export const OSRS_ICON_MAP = {
  trophy: { name: 'Trophy', wikiPath: 'Trophy_icon', fallback: Trophy },
  skull: { name: 'Skull', wikiPath: 'Skull_icon', fallback: Skull },
  swords: { name: 'Swords', wikiPath: 'Abyssal_whip_icon', fallback: Swords },
  trending_up: { name: 'Trending Up', wikiPath: 'Experience_icon', fallback: TrendingUp },
  coins: { name: 'Coins', wikiPath: 'Coins_icon', fallback: Coins },
  loot: { name: 'Loot', wikiPath: 'Uncut_emerald_icon', fallback: Package },
  achievement: { name: 'Achievement', wikiPath: 'Achievement_diary_icon', fallback: Star },
  power: { name: 'Power', wikiPath: 'Rune_energy_icon', fallback: Zap },
  defense: { name: 'Defense', wikiPath: 'Defence_icon', fallback: Shield },
  hitpoints: { name: 'Hitpoints', wikiPath: 'Hitpoints_icon', fallback: Heart },
};

/**
 * Formats a raw item name by removing quantity prefixes and spaces.
 */
const formatItemName = (name) => {
  if (!name) return '';
  let cleanName = name.replace(/^[0-9,]+\s*x\s+/, '').trim();
  cleanName = cleanName.replace(/\\/g, ''); // Remove backslashes used for escaping
  return cleanName.toLowerCase().replace(/ /g, '_').replace(/'/g, "");
};

/**
 * OsrsIcon Component
 * Renders OSRS-themed icon with fallback to lucide-react
 * 
 * First tries to load from local assets, then from OSRS wiki, 
 * finally falls back to lucide-react icons
 *
 * @param {string} iconKey - Key from OSRS_ICON_MAP
 * @param {string} itemName - Raw item name (e.g., "5x Dragon platelegs") for dynamic drops
 * @param {number} size - Icon size in pixels (default: 24)
 * @param {string} className - Additional CSS classes
 * @param {string} style - Inline styles
 */
export function OsrsIcon({ iconKey, itemName, size = 24, className = '', style = {} }) {
  const [imageError, setImageError] = useState(false);
  const [triedWiki, setTriedWiki] = useState(false);

  let config = null;
  let isDynamic = false;
  
  if (itemName) {
    isDynamic = true;
    let cleanItemName = itemName.replace(/^[0-9,]+\s*x\s+/, '').trim();
    cleanItemName = cleanItemName.replace(/\\/g, '');
    config = {
      name: cleanItemName,
      wikiPath: cleanItemName.replace(/ /g, '_'),
      fallback: Package
    };
  } else if (iconKey && OSRS_ICON_MAP[iconKey]) {
    config = OSRS_ICON_MAP[iconKey];
  }

  if (!config) {
    return null; // Both iconKey and itemName missing or invalid
  }

  const FallbackIcon = config.fallback;

  // If image failed to load, use fallback icon
  if (imageError) {
    return (
      <FallbackIcon
        size={size}
        className={className}
        style={style}
        title={config.name}
      />
    );
  }

  // Determine URLs
  let localImageUrl = '';
  if (isDynamic) {
    localImageUrl = `/assets/icons/${formatItemName(itemName)}.png`;
  } else {
    localImageUrl = `/assets/icons/${iconKey}.png`;
  }
  
  const wikiImageUrl = `https://oldschool.runescape.wiki/images/${config.wikiPath}.png`;
  const imageSrc = triedWiki ? wikiImageUrl : localImageUrl;

  return (
    <img
      src={imageSrc}
      alt={config.name}
      width={size}
      height={size}
      className={`osrs-icon ${className}`}
      style={{
        imageRendering: 'pixelated',
        ...style,
      }}
      onError={() => {
        if (!triedWiki) {
          setTriedWiki(true);
        } else {
          setImageError(true);
        }
      }}
      title={config.name}
    />
  );
}

export default OsrsIcon;
