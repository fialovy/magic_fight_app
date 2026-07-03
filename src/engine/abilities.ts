import type { Character, MagicInfo } from '../types/game';
import { DEFAULT_EFFECT_TURNS, MAGIC_TYPES } from '../types/game';
import { loadCharacter } from './loader';

export interface AbilityResult {
  updatedActor: Character;
  updatedTarget: Character;
  damage: number;
  message: string;
  transformation?: { newCharacter: Character; message: string };
}

type AbilityFn = (actor: Character, target: Character) => Promise<AbilityResult>;

export const ABILITY_HANDLERS: Record<string, AbilityFn> = {
  potionify,
  attempt_sobering,
  orbs_of_disorderify,
  change_to_norm:          (a, t) => shapeshift(a, t, 'nora/norm'),
  change_to_nora:          (a, t) => shapeshift(a, t, 'nora'),
  change_to_meadow_sprite: (a, t) => shapeshift(a, t, 'nora/meadow_sprite'),
};

async function shapeshift(actor: Character, target: Character, targetPath: string): Promise<AbilityResult> {
  const newLife = Math.max(1, actor.life - 1); // don't die
  const newForm = await loadCharacter(targetPath, newLife);
  return {
    updatedActor: newForm,
    updatedTarget: target,
    damage: 0,
    message: `${actor.displayName} shapeshifts into ${newForm.displayName}! (-1 life)`,
    transformation: { newCharacter: newForm, message: `${actor.displayName} became ${newForm.displayName}!` },
  };
}

async function orbs_of_disorderify(actor: Character, target: Character): Promise<AbilityResult> {
  // scramble the amount of magic dealt by the opponent's spells
  const amounts = MAGIC_TYPES.map(t => target.magicInfo.deals[t].amount);
  for (let i = amounts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [amounts[i], amounts[j]] = [amounts[j], amounts[i]];
  }

  const newDeals = Object.fromEntries(
    MAGIC_TYPES.map((t, i) => [t, { ...target.magicInfo.deals[t], amount: amounts[i] }])
  ) as MagicInfo['deals'];

  const scrambled: Character = {
    ...target,
    magicInfo: { ...target.magicInfo, deals: newDeals },
    savedMagicInfo: target.savedMagicInfo ?? target.magicInfo,
    savedTauntsInfo: target.savedTauntsInfo ?? target.tauntsInfo,
    affectedBy: { ...target.affectedBy, [actor.namePath]: DEFAULT_EFFECT_TURNS },
  };

  return {
    updatedActor: actor,
    updatedTarget: scrambled,
    damage: 0,
    message: `${actor.displayName} releases the Orbs of Disorder! ${target.displayName}'s spell power is scrambled for ${DEFAULT_EFFECT_TURNS} turns!`,
  };
}

async function potionify(actor: Character, target: Character): Promise<AbilityResult> {
  const delta = (Math.random() < 0.5 ? 1 : -1) * (Math.floor(Math.random() * 5) + 1);

  const reversedDeals = Object.fromEntries(
    MAGIC_TYPES.map(t => [t, {
      ...actor.magicInfo.deals[t],
      spells: actor.magicInfo.deals[t].spells.map(s => s.split('').reverse().join('')),
    }])
  ) as MagicInfo['deals'];

  const drunk: Character = {
    ...actor,
    life: actor.life + delta,
    isDrunk: true,
    magicInfo: { ...actor.magicInfo, deals: reversedDeals },
    savedMagicInfo: actor.savedMagicInfo ?? actor.magicInfo,
    savedTauntsInfo: actor.savedTauntsInfo ?? actor.tauntsInfo,
  };

  const sign = delta > 0 ? '+' : '';
  return {
    updatedActor: drunk,
    updatedTarget: target,
    damage: 0,
    message: `${actor.displayName} drinks a potion! Life ${sign}${delta}. Everything feels... wobbly.`,
  };
}

async function attempt_sobering(actor: Character, target: Character): Promise<AbilityResult> {
  if (Math.random() < 0.5) {
    return {
      updatedActor: {
        ...actor,
        life: actor.life + 1,
        isDrunk: false,
        magicInfo: actor.savedMagicInfo ?? actor.magicInfo,
        tauntsInfo: actor.savedTauntsInfo ?? actor.tauntsInfo,
        savedMagicInfo: null,
        savedTauntsInfo: null,
      },
      updatedTarget: target,
      damage: 0,
      message: `${actor.displayName} drinks the sobering potion — clarity returns! (+1 life)`,
    };
  }
  return {
    updatedActor: { ...actor, life: actor.life - 1 },
    updatedTarget: target,
    damage: 0,
    message: `${actor.displayName} tries the sobering potion and fails miserably. (-1 life)`,
  };
}
