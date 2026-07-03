import type { Character, ActionChoice, ActionResult, MagicType } from '../types/game';
import { MAGIC_TYPES, OPPONENT_SPECIAL_CHANCE } from '../types/game';
import { ABILITY_HANDLERS } from './abilities';
import { pick, roll } from './random';

export function getActionChoices(character: Character): ActionChoice[] {
  const choices: ActionChoice[] = [];

  for (const magicType of MAGIC_TYPES) {
    const deal = character.magicInfo.deals[magicType];
    if (deal.amount > 0 && deal.spells.length > 0) {
      choices.push({
        key: `spell_${magicType}`,
        label: pick(deal.spells),
        magicType,
        damage: deal.amount,
        isSpecial: false,
      });
    }
  }

  const specials = character.isDrunk ? character.drunkSpecialAbilities : character.specialAbilities;
  for (const [name, ability] of Object.entries(specials)) {
    choices.push({
      key: `special_${ability.effect}`,
      label: name,
      description: ability.description,
      isSpecial: true,
    });
  }

  return choices;
}

export async function executeAction(
  actionKey: string,
  actor: Character,
  target: Character,
): Promise<ActionResult> {
  if (actionKey.startsWith('special_')) {
    const effect = actionKey.slice('special_'.length);
    const handler = ABILITY_HANDLERS[effect];
    if (!handler) throw new Error(`Unknown ability effect: ${effect}`);
    return handler(actor, target);
  }

  const magicType = actionKey.slice('spell_'.length) as MagicType;
  const deal = actor.magicInfo.deals[magicType];
  const actualDamage = Math.min(deal.amount, target.magicInfo.takes[magicType].amount);

  return {
    updatedActor: actor,
    updatedTarget: { ...target, life: target.life - actualDamage },
    damage: actualDamage,
    message: `${actor.displayName} — "${pick(deal.spells)}" [${magicType}] — ${actualDamage} damage!`,
  };
}

export function pickOpponentAction(opponent: Character): string {
  const choices = getActionChoices(opponent);
  const spellChoices = choices.filter(c => !c.isSpecial);
  const specialChoices = choices.filter(c => c.isSpecial);

  if (specialChoices.length > 0 && roll(OPPONENT_SPECIAL_CHANCE)) {
    return pick(specialChoices).key;
  }
  return pick(spellChoices.length > 0 ? spellChoices : choices).key;
}

export function wearDownEffects(character: Character): Character {
  if (Object.keys(character.affectedBy).length === 0) return character;

  const newAffectedBy: Record<string, number> = {};
  let expired = false;

  for (const [attacker, turns] of Object.entries(character.affectedBy)) {
    if (turns > 1) {
      newAffectedBy[attacker] = turns - 1;
    } else {
      expired = true;
    }
  }

  if (expired && character.savedMagicInfo) {
    return {
      ...character,
      magicInfo: character.savedMagicInfo,
      tauntsInfo: character.savedTauntsInfo,
      savedMagicInfo: null,
      savedTauntsInfo: null,
      affectedBy: newAffectedBy,
      isDrunk: false,
    };
  }

  return { ...character, affectedBy: newAffectedBy };
}

export function pickReaction(character: Character): string | null {
  if (!character.reactionsInfo) return null;
  if (roll(character.reactionsInfo.chance)) {
    return pick(character.reactionsInfo.reactions);
  }
  return null;
}
