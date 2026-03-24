export interface CharacterStats {
  baseMainStat: number;
  baseSecondaryStat: number;
  flatMainStat: number;
  flatSecondaryStat: number;
  attack: number;
  attackPercent: number;
  critDamage: number;
  damage: number;
  bossDamage: number;
  weaponTotalMagicAtt: number;
  bowEquivalentTotalAtt: number;
  baseIntPercent: number;
  baseLukPercent: number;
  // Erda Link Stats
  erdaDamage: number;
  erdaMainStat: number;
  erdaSecondaryStat: number;
  erdaAttack: number;
  erdaBossDamage: number;
  erdaCritDamage: number;
  erdaStatPercent: number;
  weaponType: 'arcane' | 'genesis';
  weaponLevel: number;
  flameTier: number;
  starForce: number;
  characterLevel: number;
  finalDamageFactor: number;
  serverType: 'heroic' | 'interactive';
  weaponScrollingAttack: number;
}

export const INITIAL_STATS: CharacterStats = {
  baseMainStat: 5972,
  baseSecondaryStat: 3739,
  flatMainStat: 28940,
  flatSecondaryStat: 460,
  attack: 3464,
  attackPercent: 113,
  critDamage: 89,
  damage: 54,
  bossDamage: 464,
  weaponTotalMagicAtt: 896,
  bowEquivalentTotalAtt: 735,
  baseIntPercent: 535,
  baseLukPercent: 200,
  // Erda Link Defaults
  erdaDamage: 10,
  erdaMainStat: 3250,
  erdaSecondaryStat: 200,
  erdaAttack: 136,
  erdaBossDamage: 56,
  erdaCritDamage: 9,
  erdaStatPercent: 6,
  weaponType: 'genesis',
  weaponLevel: 200,
  flameTier: 7,
  starForce: 22,
  characterLevel: 290,
  finalDamageFactor: 45,
  serverType: 'heroic',
  weaponScrollingAttack: 72,
};
