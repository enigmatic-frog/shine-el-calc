import { CharacterStats } from '../types';

export const calculateCombatPower = (stats: CharacterStats, includeErda: boolean = false): number => {
  const {
    baseMainStat,
    baseSecondaryStat,
    flatMainStat,
    flatSecondaryStat,
    attack,
    attackPercent,
    critDamage,
    damage,
    bossDamage,
    weaponTotalMagicAtt,
    bowEquivalentTotalAtt,
    baseIntPercent,
    baseLukPercent,
    erdaMainStat,
    erdaSecondaryStat,
    erdaStatPercent,
    erdaAttack,
    erdaDamage,
    erdaBossDamage,
    erdaCritDamage,
  } = stats;

  // Total Stat % = Base Stat % + (Erda Stat % if included)
  const totalIntPercent = baseIntPercent + (includeErda ? erdaStatPercent : 0);
  const totalLukPercent = baseLukPercent + (includeErda ? erdaStatPercent : 0);
  
  // New Formula: Total INT = Base INT * (1 + Total INT% / 100) + Flat INT + (Erda INT if included)
  const totalMainStat = Math.floor((baseMainStat * (1 + totalIntPercent / 100))) + flatMainStat + (includeErda ? erdaMainStat : 0);
  const totalSecondaryStat = Math.floor((baseSecondaryStat * (1 + totalLukPercent / 100))) + flatSecondaryStat + (includeErda ? erdaSecondaryStat : 0);

  // Stat Factor: (4 * TOTAL INT + TOTAL LUK)
  const statFactor = ((4 * totalMainStat) + totalSecondaryStat);
  
  // Apply Erda Link additions to other factors if included
  const currentAttack = attack + (includeErda ? erdaAttack : 0);
  const currentDamage = damage + (includeErda ? erdaDamage : 0);
  const currentBossDamage = bossDamage + (includeErda ? erdaBossDamage : 0);
  const currentCritDamage = critDamage + (includeErda ? erdaCritDamage : 0);

  // Attack Factor: (Magic attack - Weapon Total Magic Attack + Bow Equivalent Total Attack) * (1 + Magic Attack% / 100)
  const attackFactor = 
    Math.floor(((currentAttack - weaponTotalMagicAtt + bowEquivalentTotalAtt) * (1 + (attackPercent / 100))))
  ;
  
  const critFactor = (135 + currentCritDamage) / 100;
  const damageFactor = (100 + currentDamage + currentBossDamage) / 100;
  
  // Final Damage Factor: (1 + baseFD/100) * (Genesis ? 1.1 : 1)
  const baseFD = stats.finalDamageFactor;
  const totalFinalDamageFactor = (1 + baseFD / 100) * (stats.weaponType === 'genesis' ? 1.1 : 1);

  const combatPower = 0.01 * statFactor * attackFactor * critFactor * damageFactor * totalFinalDamageFactor;

  return Math.floor(combatPower);
};

export const calculateErdaLinkCombatPower = (stats: CharacterStats): number => {
  return calculateCombatPower(stats, true);
};

export const calculateStatGain = (stats: CharacterStats, statKey: keyof CharacterStats, amount: number): number => {
  const currentCombatPower = calculateCombatPower(stats);
  const newStats = { ...stats, [statKey]: (stats[statKey] as number) + amount };
  const newCombatPower = calculateCombatPower(newStats);
  return newCombatPower - currentCombatPower;
};
