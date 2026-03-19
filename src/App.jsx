import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, TrendingUp, Clock, Search, ChevronLeft, User, Menu, LayoutDashboard, Grid, Search as SearchIcon, Skull, Swords
} from 'lucide-react';
import OsrsIcon from './components/OsrsIcon';
import './App.css';
import allTeamsData from '../all_teams.json';

const formatGP = (value) => {
  if (value >= 1000000000) return (value / 1000000000).toFixed(2) + 'B';
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return value.toString();
};

const getTeamColorClass = (teamName) => {
  return teamName ? teamName.split(' ')[1].toLowerCase() : 'astral';
};

const TeamLogo = ({ teamName, size = 32, style = {} }) => {
  const colorClass = getTeamColorClass(teamName);
  return (
    <img 
      src={`${import.meta.env.BASE_URL}assets/teams/${colorClass}.png`} 
      style={{ width: size, height: size, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))', ...style }} 
      alt={teamName} 
    />
  );
};

const getDropClass = (val) => {
  if (val >= 100000000) return 'drop-insane';
  if (val >= 10000000) return 'drop-mega';
  if (val >= 1000000) return 'drop-high';
  return 'drop-normal';
};

const cleanDisplayName = (name) => {
  if (!name) return '';
  return name.replace(/\\/g, '');
};

// ===== ANIMATED COUNTER COMPONENT =====
const AnimatedCounter = ({ value, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let animationFrame;
    let startTime = Date.now();
    const duration = 1500; // 1.5 seconds

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuad = 1 - Math.pow(1 - progress, 2);
      setDisplayValue(Math.floor(value * easeOutQuad));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return <>{formatGP(displayValue)}{suffix}</>;
};

// ===== STAT CARD COMPONENT =====
const StatCard = ({ label, value, icon: Icon, iconKey, colorClass = 'astral' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`glass stat-card ${colorClass}`}
    >
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        <AnimatedCounter value={value} />
      </div>
      <div className="stat-icon">
        {iconKey ? (
          <OsrsIcon iconKey={iconKey} size={40} />
        ) : Icon ? (
          <Icon size={40} />
        ) : null}
      </div>
    </motion.div>
  );
};

// ===== ACHIEVEMENT CARD COMPONENT =====
// ===== ACHIEVEMENT CARD COMPONENT =====
const AchievementCard = ({ title, description, value, icon: Icon, iconKey }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="achievement-card"
    >
      <div className="achievement-icon">
        {iconKey ? (
          <OsrsIcon iconKey={iconKey} size={24} style={{ filter: 'drop-shadow(0 0 4px #facc15)' }} />
        ) : Icon ? (
          <Icon size={24} style={{ color: '#facc15' }} />
        ) : null}
      </div>
      <div style={{ flex: 1 }}>
        <div className="achievement-content">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="achievement-value">{value}</div>
    </motion.div>
  );
};

// ===== DATA CALCULATION FUNCTIONS =====
const calculateTopDrop = (data) => {
  let topDrop = null;
  let topPlayer = '';

  data.forEach(team => {
    team.players.forEach(player => {
      player.items_obtained.forEach(item => {
        if (!topDrop || item.value_gp > topDrop.value_gp) {
          topDrop = item;
          topPlayer = player.name;
        }
      });
    });
  });

  return { drop: topDrop, player: topPlayer };
};

const calculateMostActivePlayers = (data) => {
  const players = [];

  data.forEach(team => {
    team.players.forEach(player => {
      if (player.items_obtained.length > 0) {
        players.push({
          name: player.name,
          drops: player.items_obtained.length,
          value: player.total_loot_value_gp
        });
      }
    });
  });

  return players.sort((a, b) => b.drops - a.drops)[0];
};

const calculateTeamStats = (data) => {
  return data.map(team => {
    const totalGP = team.players.reduce((acc, p) => acc + p.total_loot_value_gp, 0);
    const dropCount = team.players.reduce((acc, p) => acc + p.items_obtained.length, 0);
    const avgDropValue = dropCount > 0 ? Math.floor(totalGP / dropCount) : 0;

    return { ...team, totalGP, dropCount, avgDropValue };
  }).sort((a, b) => b.totalGP - a.totalGP);
};

const generateAchievements = (data, globalTotalGP) => {
  const topDrop = calculateTopDrop(data);
  const mostActive = calculateMostActivePlayers(data);

  // Most drops team
  let mostDropsTeam = null;
  let maxDrops = 0;
  data.forEach(team => {
    const drops = team.players.reduce((acc, p) => acc + p.items_obtained.length, 0);
    if (drops > maxDrops) {
      maxDrops = drops;
      mostDropsTeam = team;
    }
  });

  return [
    {
      title: '🏆 Legendary Drop',
      description: `${topDrop.player} claimed the highest single drop`,
      value: formatGP(topDrop.drop?.value_gp || 0),
      iconKey: 'trophy',
      icon: Trophy
    },
    {
      title: '⚔️ Most Active',
      description: `${mostActive?.name || 'N/A'} has been slaying`,
      value: `${mostActive?.drops || 0} drops`,
      iconKey: 'skull',
      icon: Skull
    },
    {
      title: '🎯 Top Grinders',
      description: `${mostDropsTeam?.team_name || 'N/A'} leading drop count`,
      value: `${maxDrops} items`,
      iconKey: 'trending_up',
      icon: TrendingUp
    },
    {
      title: '💰 Event Wealth',
      description: 'Total value accumulated so far',
      value: formatGP(globalTotalGP),
      icon: Trophy
    }
  ];
};

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
};

const detailVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

const Sidebar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={20} /> },
    { id: 'feed', label: 'Loot Feed', icon: <Grid size={20} /> },
  ];

  return (
    <div className="sidebar glass-panel">
      <div className="logo-section">
        <div className="logo-icon"><Swords size={24} color="#fff" /></div>
        <div className="logo-text">OSRS<br/><span className="text-secondary" style={{fontSize: '0.875rem'}}>Bingo '26</span></div>
      </div>
      <div className="nav-menu">
        {navItems.map(item => (
          <div 
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
        Event ends March 15th
      </div>
    </div>
  );
};

const OverviewTab = ({ globalTotalGP, sortedTeams, setDetailedTeam, recentLoot, data }) => {
  // Calculate all players
  const allPlayers = [];
  data.forEach(team => {
    team.players.forEach(player => {
      allPlayers.push({
        name: player.name,
        teamName: team.team_name,
        totalGP: player.total_loot_value_gp,
        drops: player.items_obtained.length
      });
    });
  });
  const topPlayers = allPlayers.sort((a, b) => b.totalGP - a.totalGP).slice(0, 15);
  const maxPlayerGP = topPlayers[0]?.totalGP || 1;
  const maxTeamGP = sortedTeams[0]?.totalGP || 1;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="view-container" style={{ paddingBottom: '3rem' }}>
      {/* ===== HERO SECTION ===== */}
      <div style={{
        marginBottom: '4rem',
        padding: '3rem',
        borderRadius: '24px',
        background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(59,130,246,0.1))',
        border: '2px solid rgba(168,85,247,0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: 700 }}>
            EVENT TOTAL WEALTH
          </div>
          <motion.h1
            style={{
              fontSize: '5rem',
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1,
              marginBottom: '1rem',
              fontFamily: "'JetBrains Mono', monospace"
            }}
          >
            <AnimatedCounter value={globalTotalGP} />
          </motion.h1>
          <div style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
            {sortedTeams.length} teams · {allPlayers.length} players · {data.reduce((acc, team) => acc + team.players.reduce((pAcc, p) => pAcc + p.items_obtained.length, 0), 0)} drops
          </div>
        </div>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '400px',
          height: '100%',
          background: 'radial-gradient(circle at right, rgba(168,85,247,0.1), transparent)',
          pointerEvents: 'none'
        }}></div>
      </div>

      {/* ===== TEAM WEALTH VISUALIZATION ===== */}
      <div style={{ marginBottom: '4rem' }}>
        <h2 style={{
          fontSize: '1.4rem',
          fontWeight: 800,
          marginBottom: '2rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#fff'
        }}>
          ⚔️ TEAM WEALTH COMPARISON
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {sortedTeams.map((team, idx) => {
            const percentage = (team.totalGP / globalTotalGP) * 100;
            const colorClass = getTeamColorClass(team.team_name);
            const teamColors = {
              astral: '#a855f7',
              blood: '#ef4444',
              death: '#10b981',
              law: '#3b82f6',
              nature: '#22c55e',
              wrath: '#f59e0b'
            };
            const barColor = teamColors[colorClass] || '#a855f7';

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => setDetailedTeam(team)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <span style={{ fontSize: '1.5rem', opacity: 0.7 }}>#{idx + 1}</span>
                    <TeamLogo teamName={team.team_name} size={32} />
                    <span className={`neon-text-${colorClass}`}>{team.team_name}</span>
                  </div>
                  <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: barColor }}>
                    {formatGP(team.totalGP)}
                  </div>
                </div>

                {/* BAR CHART */}
                <div style={{
                  width: '100%',
                  height: '48px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: `1px solid rgba(255,255,255,0.05)`
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut', delay: idx * 0.1 }}
                    style={{
                      height: '100%',
                      background: `linear-gradient(90deg, ${barColor}40, ${barColor}80)`,
                      borderRadius: '12px',
                      position: 'relative',
                      boxShadow: `0 0 20px ${barColor}40`
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      fontFamily: "'JetBrains Mono'"
                    }}>
                      {percentage.toFixed(0)}%
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ===== PLAYER RANKING WITH WEALTH FILLS ===== */}
      <div>
        <h2 style={{
          fontSize: '1.4rem',
          fontWeight: 800,
          marginBottom: '2rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#fff'
        }}>
          👤 TOP PLAYERS
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {topPlayers.map((player, idx) => {
            const percentage = (player.totalGP / maxPlayerGP) * 100;
            const colorClass = getTeamColorClass(player.teamName);
            const teamColors = {
              astral: '#a855f7',
              blood: '#ef4444',
              death: '#10b981',
              law: '#3b82f6',
              nature: '#22c55e',
              wrath: '#f59e0b'
            };
            const barColor = teamColors[colorClass] || '#a855f7';
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 140px',
                  gap: '1rem',
                  alignItems: 'center'
                }}
              >
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  textAlign: 'center'
                }}>
                  {medal}
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: '#fff'
                  }}>
                    {player.name}
                  </div>

                  {/* WEALTH FILL BAR */}
                  <div style={{
                    width: '100%',
                    height: '32px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: `1px solid rgba(255,255,255,0.05)`,
                    position: 'relative'
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: idx * 0.05 }}
                      style={{
                        height: '100%',
                        background: `linear-gradient(90deg, ${barColor}50, ${barColor}90)`,
                        borderRadius: '8px',
                        position: 'relative',
                        boxShadow: `inset 0 0 12px ${barColor}40, 0 0 15px ${barColor}30`
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      zIndex: 1
                    }}>
                      <span className={`neon-text-${colorClass}`}>{player.teamName.split(' ')[1]}</span>
                      {' '} • {player.drops} drops
                    </div>
                  </div>
                </div>

                <div style={{
                  textAlign: 'right'
                }}>
                  <div className="font-mono" style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#4ade80'
                  }}>
                    {formatGP(player.totalGP)}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)'
                  }}>
                    {percentage.toFixed(0)}% of top
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

const LeaderboardTab = ({ sortedTeams, setDetailedTeam, setDetailedPlayer }) => {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="view-container">
      <div className="view-header">
        <div>
          <h1 className="view-title">Team Leaderboard</h1>
          <p className="view-subtitle">Rankings and detailed team composition</p>
        </div>
      </div>

      <div className="teams-grid">
        {sortedTeams.map((team, index) => {
          const colorClass = getTeamColorClass(team.team_name);
          const topPlayer = [...team.players].sort((a,b) => b.total_loot_value_gp - a.total_loot_value_gp)[0];
          
          return (
            <motion.div 
              key={team.team_name}
              whileHover={{ y: -5, scale: 1.02 }}
              onClick={() => setDetailedTeam(team)}
              className={`glass team-card border-${colorClass}`}
              style={{borderWidth: '1px', borderStyle: 'solid'}}
            >
              <div className="team-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <TeamLogo teamName={team.team_name} size={36} />
                  <h3 className={`neon-text-${colorClass}`}>{team.team_name}</h3>
                </div>
                <span className="team-card-rank">#{index + 1}</span>
              </div>
              <div className="team-gp font-mono">{formatGP(team.totalGP)} <span className="team-gp-lbl">GP</span></div>
              
              <div className="top-earner-sec">
                <div className="top-earner-lbl">Top Earner</div>
                <div 
                  className="top-earner-row"
                  onClick={(e) => { e.stopPropagation(); setDetailedPlayer({...topPlayer, teamName: team.team_name}); }}
                >
                  <span className="top-earner-name"><User size={14}/> {topPlayer.name}</span>
                  <span className="font-mono top-earner-val">{formatGP(topPlayer.total_loot_value_gp)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

const FeedTab = ({ filteredLoot, search, setSearch, filterTeam, setFilterTeam, data, setDetailedPlayer }) => {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="view-container" style={{display: 'flex', flexDirection: 'column'}}>
      <div className="view-header" style={{marginBottom: '1.5rem'}}>
        <div>
          <h1 className="view-title">Loot Feed</h1>
          <p className="view-subtitle">Real-time log of all items obtained during the event</p>
        </div>
      </div>

      <div className="feed-filters glass">
        <div className="search-input-wrapper">
          <SearchIcon size={18} className="search-input-icon" />
          <input 
            className="feed-input with-icon"
            placeholder="Search by item or player name..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="feed-input feed-select" value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
          <option value="All">All Teams</option>
          {data.map(t => <option key={t.team_name} value={t.team_name}>{t.team_name}</option>)}
        </select>
      </div>

      <div className="feed-grid">
        <AnimatePresence>
          {filteredLoot.map((item) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={`${item.timestamp}-${item.playerName}`}
              className={`glass loot-item-card ${getDropClass(item.value_gp)}`}
              onClick={() => {
                const team = data.find(t => t.team_name === item.teamName);
                const player = team.players.find(p => p.name === item.playerName);
                setDetailedPlayer({...player, teamName: item.teamName});
              }}
            >
              <div className="loot-icon-box">
                <OsrsIcon itemName={item.name} size={32} />
              </div>
              <div className="loot-details">
                <div className="loot-name">{cleanDisplayName(item.name)}</div>
                <div className="loot-meta">
                  <span>{item.playerName}</span>
                  <span className={`neon-text-${getTeamColorClass(item.teamName)}`} style={{fontSize: '10px'}}>• {item.teamName}</span>
                </div>
              </div>
              <div className="loot-value-col">
                <div className="loot-val font-mono">{formatGP(item.value_gp)}</div>
                <div className="loot-date">{new Date(item.timestamp).toLocaleDateString()}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const TeamDetailView = ({ team, onBack, setDetailedPlayer }) => {
  const colorClass = getTeamColorClass(team.team_name);
  const totalGP = team.players.reduce((acc, p) => acc + p.total_loot_value_gp, 0);
  const dropCount = team.players.reduce((acc, p) => acc + p.items_obtained.length, 0);

  return (
    <motion.div variants={detailVariants} initial="initial" animate="animate" exit="exit" className="detail-view">
      <button className="back-btn" onClick={onBack}><ChevronLeft size={20}/> Back to Dashboard</button>
      
      <div className="team-hero-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 360px) 1fr', gap: '2rem', marginBottom: '3rem' }}>
        
        {/* Left Side: Giant Logo Box (Red in Mockup) */}
        <div className="glass" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <TeamLogo teamName={team.team_name} size={300} style={{ filter: 'drop-shadow(0 8px 30px rgba(0,0,0,0.8))' }} />
        </div>

        {/* Right Side: Name & Stats (Orange and Yellow in Mockup) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'space-between' }}>
          
          <div className="glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h1 className={`view-title neon-text-${colorClass}`} style={{ margin: 0, fontSize: '4.5rem', letterSpacing: '2px' }}>
              {team.team_name}
            </h1>
          </div>
          
          <div className="glass" style={{ display: 'flex', gap: '2rem', justifyContent: 'space-around', alignItems: 'center', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Total Contribution</div>
              <div className="font-mono text-gradient" style={{ fontSize: '2.5rem', fontWeight: 800 }}>{formatGP(totalGP)} <span style={{fontSize: '1.2rem'}}>GP</span></div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Total Drops</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{dropCount}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Active Members</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{team.players.length}</div>
            </div>
          </div>
          
        </div>
      </div>


      <h2 className="detail-section-title">Player Roster</h2>
      <div className="roster-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {[...team.players].sort((a,b) => b.total_loot_value_gp - a.total_loot_value_gp).map(p => (
          <div key={p.name} className="glass roster-card" style={{ padding: '1.5rem', alignItems: 'center' }} onClick={() => setDetailedPlayer({...p, teamName: team.team_name})}>
            <div>
              <div className="roster-name" style={{ fontSize: '1.4rem', fontWeight: 800 }}>{p.name}</div>
              <div className="roster-drops" style={{ fontSize: '1rem', color: '#a1a1aa' }}>{p.items_obtained.length} items logged</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="font-mono roster-gp" style={{ fontSize: '1.4rem' }}>{formatGP(p.total_loot_value_gp)}</div>
              <div className="roster-gp-lbl" style={{ opacity: 0.6, fontSize: '0.9rem' }}>GP</div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const PlayerDetailView = ({ player, onBack }) => {
  const colorClass = getTeamColorClass(player.teamName);
  
  return (
    <motion.div variants={detailVariants} initial="initial" animate="animate" exit="exit" className="detail-view">
      <button className="back-btn" onClick={onBack}><ChevronLeft size={20}/> Back</button>
      
      <div className="detail-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <TeamLogo teamName={player.teamName} size={24} />
          <div className={`player-team-lbl neon-text-${colorClass}`} style={{ margin: 0 }}>{player.teamName}</div>
        </div>
        <h1 className="view-title player-title"><User size={40}/> {player.name}</h1>
        <div className="detail-pills">
          <div className="stat-pill-lg stat-pill-green">
            <span className="lbl">Total Loot Value</span>
            <span className="val font-mono">{formatGP(player.total_loot_value_gp)} GP</span>
          </div>
          <div className="stat-pill-lg">
            <span className="lbl">Items Obtained</span>
            <span className="val">{player.items_obtained.length}</span>
          </div>
        </div>
      </div>

      <h2 className="detail-section-title">Drop History <Trophy size={20} style={{color: '#facc15'}}/></h2>
      <div className="glass table-container">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Date / Time</th>
              <th className="table-right">Value (GP)</th>
            </tr>
          </thead>
          <tbody>
            {[...player.items_obtained].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map((item, i) => (
              <tr key={i} className={getDropClass(item.value_gp)}>
                <td style={{fontWeight: 600}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                    <OsrsIcon itemName={item.name} size={24} />
                    <span>{cleanDisplayName(item.name)}</span>
                  </div>
                </td>
                <td className="table-date">{new Date(item.timestamp).toLocaleString()}</td>
                <td className="table-right font-mono table-val">{formatGP(item.value_gp)}</td>
              </tr>
            ))}
            {player.items_obtained.length === 0 && (
              <tr><td colSpan="3" className="table-empty">No recorded drops yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

function App() {
  const [data] = useState(allTeamsData);
  const [activeTab, setActiveTab] = useState('overview');
  const [detailedTeam, setDetailedTeam] = useState(null);
  const [detailedPlayer, setDetailedPlayer] = useState(null);
  
  // Feed state
  const [search, setSearch] = useState('');
  const [filterTeam, setFilterTeam] = useState('All');

  const globalTotalGP = useMemo(() => {
    return data.reduce((acc, team) => 
      acc + team.players.reduce((pAcc, p) => pAcc + p.total_loot_value_gp, 0)
    , 0);
  }, [data]);

  const sortedTeams = useMemo(() => {
    return data.map(team => {
      const totalGP = team.players.reduce((acc, p) => acc + p.total_loot_value_gp, 0);
      const dropCount = team.players.reduce((acc, p) => acc + p.items_obtained.length, 0);
      return { ...team, totalGP, dropCount };
    }).sort((a, b) => b.totalGP - a.totalGP);
  }, [data]);

  const allLoot = useMemo(() => {
    return data.flatMap(team => 
      team.players.flatMap(player => 
        player.items_obtained.map(item => ({
          ...item,
          teamName: team.team_name,
          playerName: player.name
        }))
      )
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [data]);

  const filteredLoot = useMemo(() => {
    return allLoot.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                           item.playerName.toLowerCase().includes(search.toLowerCase());
      const matchesTeam = filterTeam === 'All' || item.teamName === filterTeam;
      return matchesSearch && matchesTeam;
    });
  }, [allLoot, search, filterTeam]);

  // Handle routing within the single-page view using conditionals and AnimatePresence
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab globalTotalGP={globalTotalGP} sortedTeams={sortedTeams} setDetailedTeam={setDetailedTeam} recentLoot={allLoot} data={data} />;
      case 'leaderboard': return <LeaderboardTab sortedTeams={sortedTeams} setDetailedTeam={setDetailedTeam} setDetailedPlayer={setDetailedPlayer}/>;
      case 'feed': return <FeedTab filteredLoot={filteredLoot} search={search} setSearch={setSearch} filterTeam={filterTeam} setFilterTeam={setFilterTeam} data={data} setDetailedPlayer={setDetailedPlayer}  />;
      default: return null;
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setDetailedTeam(null);
    setDetailedPlayer(null);
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
      
      <main className="main-content">
        <AnimatePresence mode="wait">
          {renderTabContent()}
        </AnimatePresence>

        <AnimatePresence>
          {detailedTeam && !detailedPlayer && (
            <TeamDetailView key="team-detail" team={detailedTeam} onBack={() => setDetailedTeam(null)} setDetailedPlayer={setDetailedPlayer} />
          )}
          {detailedPlayer && (
            <PlayerDetailView key="player-detail" player={detailedPlayer} onBack={() => setDetailedPlayer(null)} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
