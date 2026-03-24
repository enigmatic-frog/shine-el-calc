import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, RefreshCcw, Save, Check, HelpCircle, Share2, X } from 'lucide-react';
import { StatInput } from './components/StatInput';
import { CharacterStats, INITIAL_STATS } from './types';
import { calculateCombatPower, calculateErdaLinkCombatPower } from './utils/calculator';

export default function App() {
  const [stats, setStats] = useState<CharacterStats>(INITIAL_STATS);
  const [showSaved, setShowSaved] = useState(false);
  const [showShared, setShowShared] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Load stats from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sia_astelle_stats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with INITIAL_STATS to handle potential schema updates
        setStats({ ...INITIAL_STATS, ...parsed });
      } catch (e) {
        console.error('Failed to load saved stats', e);
      }
    }
  }, []);

  const saveStats = () => {
    localStorage.setItem('sia_astelle_stats', JSON.stringify(stats));
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const shareStats = () => {
    const summary = `Sia Astelle Combat Power:
Base Combat Power: ${formatNumber(combatPower)}
Erda Link Combat Power: ${formatNumber(erdaLinkCombatPower)}
Increase: +${formatNumber(erdaLinkCombatPower - combatPower)} (${((erdaLinkCombatPower / combatPower - 1) * 100).toFixed(2)}%)`;
    
    navigator.clipboard.writeText(summary);
    setShowShared(true);
    setTimeout(() => setShowShared(false), 2000);
  };

  const combatPower = useMemo(() => calculateCombatPower(stats), [stats]);
  const erdaLinkCombatPower = useMemo(() => calculateErdaLinkCombatPower(stats), [stats]);

  const weaponBaseMA = stats.weaponType === 'genesis' ? 400 : 347;
  const bowBaseAtt = stats.weaponType === 'genesis' ? 318 : 276;

  const calculateFlameAtt = (base: number, level: number, tier: number) => {
    if (tier < 3) return 0;
    // Formula: weapon base attack * (ceiling(weapon level / 40) + 1) * tier * 1.1 ^ (tier - 3)
    const multiplier = (Math.ceil(level / 40) + 1) * tier * Math.pow(1.1, tier - 3);
    return Math.ceil(base * multiplier / 100);
  };

  const calculateStarForceAtt = (base: number, stars: number, scrollingAtt: number = 0) => {
    let sfAtt = 0;
    // 0-15 stars: floor(((base attack + star force attack + scrolling attack)*.02)+1)
    for (let i = 1; i <= Math.min(stars, 15); i++) {
      sfAtt += Math.floor(((base + sfAtt + scrollingAtt) * 0.02) + 1);
    }
    // 16-25 stars: specific flat increases
    if (stars >= 16) sfAtt += 13;
    if (stars >= 17) sfAtt += 13;
    if (stars >= 18) sfAtt += 14;
    if (stars >= 19) sfAtt += 14;
    if (stars >= 20) sfAtt += 15;
    if (stars >= 21) sfAtt += 16;
    if (stars >= 22) sfAtt += 17;
    if (stars >= 23) sfAtt += 34;
    if (stars >= 24) sfAtt += 35;
    if (stars >= 25) sfAtt += 36;
    return sfAtt;
  };

  const flameMA = calculateFlameAtt(weaponBaseMA, stats.weaponLevel, stats.flameTier);
  const flameBowAtt = calculateFlameAtt(bowBaseAtt, stats.weaponLevel, stats.flameTier);

  const sfMA = calculateStarForceAtt(
    weaponBaseMA, 
    stats.starForce, 
    stats.serverType === 'interactive' ? stats.weaponScrollingAttack : 0
  );
  const sfBowAtt = calculateStarForceAtt(
    bowBaseAtt, 
    stats.starForce, 
    stats.serverType === 'interactive' ? stats.weaponScrollingAttack : 0
  );

  const calculatedWeaponMA = weaponBaseMA + sfMA + flameMA + (stats.serverType === 'interactive' ? stats.weaponScrollingAttack : 0);
  const calculatedBowAtt = bowBaseAtt + sfBowAtt + flameBowAtt + (stats.serverType === 'interactive' ? stats.weaponScrollingAttack : 0);

  // Sync calculated weapon stats to the stats object for the calculator
  // Also update the main Magic Attack stat to reflect weapon changes
  React.useEffect(() => {
    setStats(prev => {
      const maDiff = calculatedWeaponMA - prev.weaponTotalMagicAtt;
      return {
        ...prev,
        attack: Math.max(calculatedWeaponMA, prev.attack + maDiff),
        weaponTotalMagicAtt: calculatedWeaponMA,
        bowEquivalentTotalAtt: calculatedBowAtt
      };
    });
  }, [calculatedWeaponMA, calculatedBowAtt]);

  const totalIntPercent = stats.baseIntPercent + stats.erdaStatPercent;
  const totalLukPercent = stats.baseLukPercent + stats.erdaStatPercent;
  const totalMainStat = (stats.baseMainStat * (1 + totalIntPercent / 100)) + stats.flatMainStat + stats.erdaMainStat;
  const totalSecondaryStat = (stats.baseSecondaryStat * (1 + totalLukPercent / 100)) + stats.flatSecondaryStat + stats.erdaSecondaryStat;

  // Update final damage factor based on level
  React.useEffect(() => {
    let newFactor = 0;
    if (stats.serverType === 'heroic') {
      if (stats.characterLevel >= 200 && stats.characterLevel <= 249) {
        newFactor = 35;
      } else if (stats.characterLevel >= 250 && stats.characterLevel <= 300) {
        newFactor = 45;
      }
    }
    if (newFactor !== stats.finalDamageFactor) {
      setStats(prev => ({ ...prev, finalDamageFactor: newFactor }));
    }
  }, [stats.characterLevel, stats.serverType]);

  const handleStatChange = (key: keyof CharacterStats, value: number) => {
    let newValue = value;
    const nonNegativeStats: (keyof CharacterStats)[] = [
      'attack', 'baseMainStat', 'baseSecondaryStat', 'baseIntPercent', 'baseLukPercent',
      'flatMainStat', 'flatSecondaryStat', 'erdaMainStat', 'erdaSecondaryStat',
      'erdaStatPercent', 'attackPercent', 'erdaAttack', 'damage', 'bossDamage',
      'critDamage', 'erdaDamage', 'erdaBossDamage', 'erdaCritDamage', 'weaponScrollingAttack'
    ];

    if (nonNegativeStats.includes(key)) {
      newValue = Math.max(0, value);
    }
    setStats((prev) => ({ ...prev, [key]: newValue }));

    const maxCharacterLevel: (keyof CharacterStats)[] = [
      'characterLevel'
    ];

    if (maxCharacterLevel.includes(key)) {
      if (value < 0) {newValue = 0;}
      else if (value > 300) {newValue = 300;}
    }
    setStats((prev) => ({ ...prev, [key]: newValue }));
  };

  const resetStats = () => {
    setStats(INITIAL_STATS);
  };

  const setWeaponType = (type: 'arcane' | 'genesis') => {
    setStats(prev => ({
      ...prev,
      weaponType: type,
      weaponLevel: 200, // Both Arcane and Genesis are level 200
      starForce: type === 'genesis' ? 22 : prev.starForce
    }));
  };

  const setServerType = (type: 'heroic' | 'interactive') => {
    setStats(prev => ({ ...prev, serverType: type }));
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="min-h-screen bg-brand-bg text-zinc-100 font-sans selection:bg-brand-accent/30 relative overflow-hidden">
      {/* Cosmic Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Central Nebula Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-brand-purple/20 blur-[120px] rounded-full opacity-60" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-brand-accent/20 blur-[80px] rounded-full opacity-40" />
        
        {/* Distant Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-accent/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-purple/20 blur-[120px] rounded-full" />

        {/* Stars */}
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full blur-[0.3px]"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 1.5 + 0.5}px`,
              height: `${Math.random() * 1.5 + 0.5}px`,
              opacity: Math.random() * 0.5 + 0.2,
              animation: `pulse ${Math.random() * 3 + 2}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="border-b border-white/20 bg-white/10 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center border border-brand-accent/20">
              <Calculator className="w-5 h-5 text-brand-accent" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight uppercase">Sia Astelle</h1>
              <p className="text-[10px] font-mono text-zinc-100 uppercase tracking-widest">Combat Power Calculator</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-100 hover:bg-white/10 border border-transparent hover:border-white/20 transition-all"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              HELP
            </button>
            <button
              onClick={resetStats}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-100 hover:text-zinc-100 hover:bg-white/10 transition-all border border-transparent hover:border-white/20"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              RESET
            </button>
            <button
              onClick={saveStats}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                showSaved 
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                  : 'text-zinc-100 hover:bg-white/10 border-transparent hover:border-white/20'
              }`}
            >
              {showSaved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  SAVED!
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  SAVE
                </>
              )}
            </button>
            <button
              onClick={shareStats}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                showShared 
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                  : 'text-zinc-100 hover:bg-white/10 border-transparent hover:border-white/20'
              }`}
            >
              {showShared ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  COPIED!
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  SHARE
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-7 space-y-10">
            {/* Stats Section */}
            <section>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-l font-mono uppercase tracking-widest text-zinc-100 font-bold">APPLIED STATS</h2>
              </div>
              
              {/* Total Stats Display */}
              <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase text-white">Total INT</span>
                  <div className="text-xl font-mono font-bold text-white">{formatNumber(Math.floor(totalMainStat))}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase text-white">Total LUK</span>
                  <div className="text-xl font-mono font-bold text-white">{formatNumber(Math.floor(totalSecondaryStat))}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase text-white">Total INT %</span>
                  <div className="text-xl font-mono font-bold text-white">{totalIntPercent.toFixed(0)}%</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase text-white">Total LUK %</span>
                  <div className="text-xl font-mono font-bold text-white">{totalLukPercent.toFixed(0)}%</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                {/* Row 1: INT Stats */}
                <div className="sm:col-span-1">
                  <StatInput
                    id="baseMainStat"
                    label="BASE INT"
                    value={stats.baseMainStat}
                    min={0}
                    onChange={(v) => handleStatChange('baseMainStat', v)}
                    labelClassName="text-zinc-100"
                    tooltip={
                      <div className="group relative">
                        <HelpCircle className="w-3.5 h-3.5 text-white cursor-help hover:text-brand-accent transition-colors" />
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-64 p-3 bg-brand-bg/95 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                          <p className="text-xs text-zinc-300 font-sans leading-relaxed normal-case tracking-normal">
                            <strong className="text-brand-accent block mb-1">How to enter stats:</strong>
                            <span className="text-white">
                            • For Base INT: Hover over INT in your stat window and look for [Applied Value]. Input (Base Value - Skills + Event All Stats).<br/><br/>
                            • <span className="text-brand-secondary">Example: Total Base Value (6332) - Skills (400) + Event All Stats (40) = 5972.</span><br/><br/>
                            • For Base INT %: Hover over INT in your stat window and look for [% Value]. Input only the Equipment Item value.<br/><br/>
                            • For Flat INT: Hover over INT in your stat window and look for [Applied Value]. Input % Value Not Applied, excluding the Erda Link value.<br/><br/>
                            • <span className="text-brand-secondary">Example: % Value Not Applied (32190) - Erda Link (3250) = 28940.</span><br/><br/>
                            • Repeat the steps for LUK. </span>
                          </p>
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="sm:col-span-1">
                  <StatInput
                    id="baseIntPercent"
                    label="BASE INT %"
                    value={stats.baseIntPercent}
                    min={0}
                    onChange={(v) => handleStatChange('baseIntPercent', v)}
                    suffix="%"
                    labelClassName="text-zinc-100"
                  />
                </div>
                <div className="sm:col-span-1">
                  <StatInput
                    id="flatMainStat"
                    label="FLAT INT"
                    value={stats.flatMainStat}
                    min={0}
                    onChange={(v) => handleStatChange('flatMainStat', v)}
                    labelClassName="text-zinc-100"
                  />
                </div>
                <div className="sm:col-span-1">
                  <StatInput
                    id="erdaMainStat"
                    label="ERDA LINK INT"
                    value={stats.erdaMainStat}
                    min={0}
                    onChange={(v) => handleStatChange('erdaMainStat', v)}
                    labelClassName="text-brand-accent font-bold"
                  />
                </div>

                {/* Row 2: LUK Stats */}
                <div className="sm:col-span-1">
                  <StatInput
                    id="baseSecondaryStat"
                    label="BASE LUK"
                    value={stats.baseSecondaryStat}
                    min={0}
                    onChange={(v) => handleStatChange('baseSecondaryStat', v)}
                    labelClassName="text-zinc-100"
                  />
                </div>
                <div className="sm:col-span-1">
                  <StatInput
                    id="baseLukPercent"
                    label="BASE LUK %"
                    value={stats.baseLukPercent}
                    min={0}
                    onChange={(v) => handleStatChange('baseLukPercent', v)}
                    suffix="%"
                    labelClassName="text-zinc-100"
                  />
                </div>
                <div className="sm:col-span-1">
                  <StatInput
                    id="flatSecondaryStat"
                    label="FLAT LUK"
                    value={stats.flatSecondaryStat}
                    min={0}
                    onChange={(v) => handleStatChange('flatSecondaryStat', v)}
                    labelClassName="text-zinc-100"
                  />
                </div>
                <div className="sm:col-span-1">
                  <StatInput
                    id="erdaSecondaryStat"
                    label="ERDA LINK LUK"
                    value={stats.erdaSecondaryStat}
                    min={0}
                    onChange={(v) => handleStatChange('erdaSecondaryStat', v)}
                    labelClassName="text-brand-accent font-bold"
                  />
                </div>

                {/* Row 3: Erda Link Stat % */}
                <div className="sm:col-span-3" />
                <div className="sm:col-span-1">
                  <StatInput
                    id="erdaStatPercent"
                    label="ERDA LINK STAT %"
                    value={stats.erdaStatPercent}
                    min={0}
                    onChange={(v) => handleStatChange('erdaStatPercent', v)}
                    suffix="%"
                    labelClassName="text-brand-accent font-bold"
                  />
                </div>
              </div>
            </section>

            {/* Attack Details */}
            <section>
              <div className="mb-4">
                <h2 className="text-l font-mono uppercase tracking-widest text-zinc-100 font-bold">Weapon Magic Attack Normalization</h2>
              </div>

              {/* Weapon Stats Display */}
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm">
                <div className="space-y-1">
                  <span className="text-[14px] font-mono uppercase text-white">Weapon Total Magic Attack</span>
                  <div className="text-xl font-mono font-bold text-white">
                    {formatNumber(stats.weaponTotalMagicAtt)}
                    <span className="ml-2 text-xl font-normal text-white">
                      ({weaponBaseMA} <span className="text-yellow-400">+{sfMA}</span> {stats.serverType === 'interactive' && <span className="text-brand-secondary">+{stats.weaponScrollingAttack}</span>} <span className="text-teal-300">+{flameMA}</span>)
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[14px] font-mono uppercase text-white">Bow Equivalent Total Attack</span>
                  <div className="text-xl font-mono font-bold text-white">
                    {formatNumber(stats.bowEquivalentTotalAtt)}
                    <span className="ml-2 text-xl font-normal text-white">
                      ({bowBaseAtt} <span className="text-yellow-400">+{sfBowAtt}</span> {stats.serverType === 'interactive' && <span className="text-brand-secondary">+{stats.weaponScrollingAttack}</span>} <span className="text-teal-300">+{flameBowAtt}</span>)
                    </span>
                  </div>
                </div>
              </div>

              {/* Weapon Selection Buttons */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  onClick={() => setWeaponType('arcane')}
                  className={`py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all border ${
                    stats.weaponType === 'arcane' 
                      ? 'bg-brand-secondary/20 border-brand-secondary/50 text-brand-secondary shadow-[0_0_15px_rgba(196,181,253,0.1)]' 
                      : 'bg-white/10 border-white/20 text-zinc-500 hover:border-white/30 hover:text-zinc-300'
                  }`}
                >
                  Arcane
                </button>
                <button
                  onClick={() => setWeaponType('genesis')}
                  className={`py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all border ${
                    stats.weaponType === 'genesis' 
                      ? 'bg-brand-neon-red/20 border-brand-neon-red/50 text-brand-neon-red shadow-[0_0_20px_rgba(255,0,51,0.2)]' 
                      : 'bg-white/10 border-white/20 text-zinc-500 hover:border-white/30 hover:text-zinc-300'
                  }`}
                >
                  Genesis
                </button>
              </div>

              {/* Server Selection Buttons */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setServerType('heroic')}
                  className={`py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all border ${
                    stats.serverType === 'heroic' 
                      ? 'bg-brand-emerald/20 border-brand-emerald/50 text-brand-emerald shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                      : 'bg-white/10 border-white/20 text-zinc-500 hover:border-white/30 hover:text-zinc-300'
                  }`}
                >
                  Heroic
                </button>
                <button
                  onClick={() => setServerType('interactive')}
                  className={`py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all border ${
                    stats.serverType === 'interactive' 
                      ? 'bg-brand-emerald/20 border-brand-emerald/50 text-brand-emerald shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                      : 'bg-white/10 border-white/20 text-zinc-500 hover:border-white/30 hover:text-zinc-300'
                  }`}
                >
                  Interactive
                </button>
              </div>

              {/* Star Force Slider */}
              <div className="mb-6 p-4 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[13px] font-mono uppercase tracking-widest text-yellow-400 font-bold">
                    Star Force {stats.weaponType === 'genesis' && <span className="text-brand-neon-red ml-2">(LOCKED)</span>}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="25"
                      value={stats.starForce}
                      disabled={stats.weaponType === 'genesis'}
                      onChange={(e) => handleStatChange('starForce', Math.min(25, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-12 bg-white/10 border border-white/20 rounded px-2 py-1 text-m font-mono text-yellow-400 text-center focus:outline-none focus:border-yellow-400/50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="relative h-6 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value={stats.starForce}
                    disabled={stats.weaponType === 'genesis'}
                    onChange={(e) => handleStatChange('starForce', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-400 disabled:cursor-not-allowed disabled:accent-zinc-600"
                  />
                  <div className="absolute -bottom-4 left-0 right-0 px-1">
                    {[0, 5, 10, 15, 17, 20, 22, 25].map((sf) => (
                      <span 
                        key={sf} 
                        className={`absolute text-[12px] font-mono -translate-x-1/2 ${stats.starForce === sf ? 'text-yellow-400 font-bold' : 'text-zinc-500'}`}
                        style={{ left: `${(sf / 25) * 100}%` }}
                      >
                        {sf}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Flame Tier Slider */}
              <div className="mb-6 p-4 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[13px] font-mono uppercase tracking-widest text-teal-300 font-bold">Attack Flame Tier</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="7"
                      value={stats.flameTier}
                      onChange={(e) => handleStatChange('flameTier', Math.min(7, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-12 bg-white/10 border border-white/20 rounded px-2 py-1 text-m font-mono text-teal-300 text-center focus:outline-none focus:border-teal-300/50"
                    />
                  </div>
                </div>
                <div className="relative h-6 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="7"
                    step="1"
                    value={stats.flameTier}
                    onChange={(e) => handleStatChange('flameTier', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-teal-300"
                  />
                  <div className="absolute -bottom-4 left-0 right-0 px-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((tier) => (
                      <span 
                        key={tier} 
                        className={`absolute text-[12px] font-mono -translate-x-1/2 ${stats.flameTier === tier ? 'text-teal-300 font-bold' : 'text-zinc-500'}`}
                        style={{ left: `${(tier / 7) * 100}%` }}
                      >
                        {tier}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatInput
                  id="attack"
                  label="Magic Attack"
                  value={stats.attack}
                  min={0}
                  onChange={(v) => handleStatChange('attack', v)}
                  labelClassName="text-zinc-100"
                  tooltip={
                    <div className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-white cursor-help hover:text-brand-accent transition-colors" />
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-64 p-3 bg-brand-bg/95 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                        <p className="text-xs text-zinc-300 font-sans leading-relaxed normal-case tracking-normal">
                          <strong className="text-brand-accent block mb-1">Magic Attack Info:</strong>
                            • <span className="text-white">Default values are for a Genesis Weapon with a Tier 7 Attack Flame.<br/><br/>
                            • Select your weapon and server type, and input the <span className="text-yellow-400">Star Force</span> and <span className="text-teal-300">Attack Flame Tier</span> of your current weapon before inputting Magic Attack. If Interactive, input the <span className="text-brand-secondary">Weapon Scrolling Attack</span> value before inputting Magic Attack.<br/><br/>
                            • For Magic Attack: Hover over MAGIC ATT in your stat window and look for [Applied Value]. Input (Base Value - Skills - Usable Item (This is the attack from the Soul Weapon gauge.) + Event Magic ATT + Empress's Blessing - Erda Link).<br/><br/>
                            • <span className="text-brand-secondary">Example: Total Base Value (3820) - Skills (270) - Usable Item (20) + Event Magic ATT (40) + Empress's Blessing (30) - Erda Link (136) = 3464.</span><br/><br/>
                            • For Magic Attack %: Hover over MAGIC ATT in your stat window and look for [% Value]. Input only the Equipment Item value.<br/><br/></span>
                        </p>
                      </div>
                    </div>
                  }
                />
                <StatInput
                  id="attackPercent"
                  label="Magic Attack %"
                  value={stats.attackPercent}
                  min={0}
                  onChange={(v) => handleStatChange('attackPercent', v)}
                  suffix="%"
                  labelClassName="text-zinc-100"
                />
                <StatInput
                  id="erdaAttack"
                  label="ERDA LINK Magic Attack"
                  value={stats.erdaAttack}
                  min={0}
                  onChange={(v) => handleStatChange('erdaAttack', v)}
                  labelClassName="text-brand-accent font-bold"
                />
                {stats.serverType === 'interactive' && (
                  <StatInput
                    id="weaponScrollingAttack"
                    label="WEAPON SCROLLING ATTACK"
                    value={stats.weaponScrollingAttack}
                    min={0}
                    onChange={(v) => handleStatChange('weaponScrollingAttack', v)}
                    labelClassName="text-brand-secondary font-bold"
                  />
                )}
              </div>
            </section>

            {/* Multipliers Section */}
            <section>
              <div className="mb-4">
                <h2 className="text-l font-mono uppercase tracking-widest text-zinc-100 font-bold">Damage Multipliers</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatInput
                  id="damage"
                  label="Damage %"
                  value={stats.damage}
                  min={0}
                  onChange={(v) => handleStatChange('damage', v)}
                  suffix="%"
                  labelClassName="text-zinc-100"
                  tooltip={
                    <div className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-white cursor-help hover:text-brand-accent transition-colors" />
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-64 p-3 bg-brand-bg/95 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                        <p className="text-xs text-zinc-300 font-sans leading-relaxed normal-case tracking-normal">
                          <strong className="text-brand-accent block mb-1">Damage Info:</strong>
                          <span className="text-white">
                          • For Damage %: Hover over DAMAGE in your stat window and look for [Applied Value]. Input (Damage - Skills - Erda Link).<br/><br/>
                          • <span className="text-brand-secondary">Example: Total Damage % (127) - Skills (63) - Erda Link (10) = 54.</span><br/><br/>
                          • For Boss Damage %: Hover over BOSS DAMAGE in your stat window and look for [Applied Value]. Input (Boss Damage - Skills + Event Boss Damage - Erda Link).<br/><br/>
                          • <span className="text-brand-secondary">Example: Total Boss Damage (568) - Skills (88) + Event Boss Damage (40) - Erda Link (56) = 464.</span><br/><br/>
                          • For Critical Damage %: Hover over CRITICAL DAMAGE in your stat window and look for [Applied Value]. Input (Critical Damage - Skills - Erda Link).<br/><br/>
                          • <span className="text-brand-secondary">Example: Total Critical Damage (128) - Skills (30) - Erda Link (9) = 89.</span></span>
                        </p>
                      </div>
                    </div>
                  }
                />
                <StatInput
                  id="bossDamage"
                  label="Boss Damage %"
                  value={stats.bossDamage}
                  min={0}
                  onChange={(v) => handleStatChange('bossDamage', v)}
                  suffix="%"
                  labelClassName="text-zinc-100"
                />
                <StatInput
                  id="critDamage"
                  label="Critical Damage %"
                  value={stats.critDamage}
                  min={0}
                  onChange={(v) => handleStatChange('critDamage', v)}
                  suffix="%"
                  labelClassName="text-zinc-100"
                />
                <StatInput
                  id="erdaDamage"
                  label="ERDA LINK Damage %"
                  value={stats.erdaDamage}
                  min={0}
                  onChange={(v) => handleStatChange('erdaDamage', v)}
                  suffix="%"
                  labelClassName="text-brand-accent font-bold"
                />
                <StatInput
                  id="erdaBossDamage"
                  label="ERDA LINK Boss Damage %"
                  value={stats.erdaBossDamage}
                  min={0}
                  onChange={(v) => handleStatChange('erdaBossDamage', v)}
                  suffix="%"
                  labelClassName="text-brand-accent font-bold"
                />
                <StatInput
                  id="erdaCritDamage"
                  label="ERDA LINK Critical Damage %"
                  value={stats.erdaCritDamage}
                  min={0}
                  onChange={(v) => handleStatChange('erdaCritDamage', v)}
                  suffix="%"
                  labelClassName="text-brand-accent font-bold"
                />
                <StatInput
                  id="characterLevel"
                  label="Character Level"
                  value={stats.characterLevel}
                  min={200}
                  max={300}
                  onChange={(v) => handleStatChange('characterLevel', v)}
                  labelClassName="text-zinc-100"
                />
              </div>
            </section>

          </div>

          {/* Right Column: Result */}
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <motion.div
                layout
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl shadow-brand-accent/5 relative overflow-hidden"
              >
                {/* Background Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-accent/10 blur-[100px] rounded-full" />
                
                <div className="relative z-10 text-center">
                  <div className="flex flex-col gap-6">
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-100">
                        APPROXIMATE Base Combat Power
                      </h3>
                      <div className="mt-2 flex items-baseline justify-center gap-2">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={combatPower}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-4xl md:text-5xl font-mono font-bold tracking-tighter text-zinc-100"
                          >
                            {formatNumber(combatPower)}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/10">
                      <div className="mb-1">
                        <h3 className="text-xs font-mono uppercase tracking-widest text-brand-accent font-bold">
                          APPROXIMATE Erda Link Combat Power
                        </h3>
                      </div>
                      <div className="mt-2 flex items-baseline justify-center gap-2">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={erdaLinkCombatPower}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-4xl md:text-5xl font-mono font-bold tracking-tighter text-brand-accent"
                          >
                            {formatNumber(erdaLinkCombatPower)}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                      <p className="text-[14px] font-mono text-zinc-100 mt-2 uppercase tracking-tight">
                        Increase: <span className="text-brand-accent">+{formatNumber(erdaLinkCombatPower - combatPower)} ({((erdaLinkCombatPower / combatPower - 1) * 100).toFixed(2)}%)</span>
                      </p>
                      <div className="mt-6 pt-6 border-t border-white/10 text-left">
                        <p className="text-[12px] font-mono text-white uppercase leading-relaxed tracking-wider">
                          <strong className="block mb-1">Note:</strong>
                          The Combat Power values shown may be slightly different from your Combat Power value in game.<br/><br/>
                          The Official Combat Power formula converts weapons to their Bow equivalents and uses a hidden value for the attack calculation.<br/><br/>
                          The Weapon Normalization value derived and used in the calculator may differ from the actual hidden value used in the game.<br/><br/>
                          Regardless, the Combat Power values shown should be close enough to serve as a good estimate of your Combat Power.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="mt-6 space-y-3">
                <div className="p-3 bg-white/10 border border-white/20 rounded-xl flex justify-between items-center backdrop-blur-sm">
                  <span className="text-[11px] font-mono text-zinc-100 uppercase">Stat Factor (INT & LUK)</span>
                  <span className="text-xs font-mono text-zinc-100">
                    {((4 * totalMainStat + totalSecondaryStat) / 100)}
                  </span>
                </div>
                <div className="p-3 bg-white/10 border border-white/20 rounded-xl flex justify-between items-center backdrop-blur-sm">
                  <span className="text-[11px] font-mono text-zinc-100 uppercase">Magic Attack Factor</span>
                  <span className="text-xs font-mono text-zinc-100">
                    {(stats.attack + stats.erdaAttack - stats.weaponTotalMagicAtt + stats.bowEquivalentTotalAtt - 25.0751278) * (1 + stats.attackPercent / 100)}
                  </span>
                </div>
                <div className="p-3 bg-white/10 border border-white/20 rounded-xl flex justify-between items-center backdrop-blur-sm">
                  <span className="text-[11px] font-mono text-zinc-100 uppercase">Damage Factor</span>
                  <span className="text-xs font-mono text-zinc-100">{((100 + stats.damage + stats.bossDamage + stats.erdaDamage + stats.erdaBossDamage) / 100).toFixed(2)}x</span>
                </div>
                <div className="p-3 bg-white/10 border border-white/20 rounded-xl flex justify-between items-center backdrop-blur-sm">
                  <span className="text-[11px] font-mono text-zinc-100 uppercase">Critical Damage Factor</span>
                  <span className="text-xs font-mono text-zinc-100">{((135 + stats.critDamage + stats.erdaCritDamage) / 100).toFixed(4)}x</span>
                </div>
                <div className="p-3 bg-white/10 border border-white/20 rounded-xl flex justify-between items-center backdrop-blur-sm">
                  <span className="text-[11px] font-mono text-zinc-100 uppercase">Final Damage Factor</span>
                  <span className="text-xs font-mono text-zinc-100">
                    {((1 + stats.finalDamageFactor / 100) * (stats.weaponType === 'genesis' ? 1.1 : 1)).toFixed(4)}x
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelp(false)}
              className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-mono font-bold uppercase tracking-widest">How to use the calculator</h2>
                <button 
                  onClick={() => setShowHelp(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 text-sm text-zinc-300 leading-relaxed">
                <section>
                  <h3 className="text-brand-accent font-bold uppercase text-xs mb-2 tracking-wider">General Setup</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <p className="text-white">Turn off all temporary buffs (potions, active skills).</p>
                    <p className="text-white">Summon your bossing familiars.</p>
                  </ul>
                </section>

                <section>
                  <h3 className="text-brand-accent font-bold uppercase text-xs mb-2 tracking-wider">Entering Stats</h3>
                  <div className="space-y-4">
                    <div>
                    <ul className="list-disc list-inside space-y-2">
                      <p className="text-white">General rule when inputting stats: <strong className="text-brand-secondary">Total Base Value - Skills + Event Stats - Erda Link.</strong></p>
                      <p className="text-white">More detailed instructions are provided in the tooltips above the input fields.</p>
                    </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-brand-accent font-bold uppercase text-xs mb-2 tracking-wider">Weapon Magic Attack Normalization</h3>
                  <p className="text-white">Select your weapon type (Arcane/Genesis) and server (Heroic/Interactive). Adjust Star Force and Flame Tier to match your current weapon before inputting Magic Attack.</p>
                </section>
              </div>
              <div className="p-6 border-t border-white/10 bg-white/5">
                <button
                  onClick={() => setShowHelp(false)}
                  className="w-full py-3 bg-brand-accent text-brand-bg font-bold rounded-xl hover:bg-brand-accent/90 transition-colors uppercase tracking-widest text-xs"
                >
                  Got it!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-zinc-900">
      </footer>
    </div>
  );
}
