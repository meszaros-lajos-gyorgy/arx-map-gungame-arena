// everyone is against everyone
// we have a list of weapons with increasing damage
// 2 kills will level you up and you get the next tier weapon
// killing with bare fists result in stealing a level from the enemy (same as knife in gungame)
// the last level will be fists only (same as knife in gungame)
// score board?
// whoever kills 2 with bare hands will win
import { Entity, EntityConstructorPropsWithoutSrc } from 'arx-level-generator'
import { ScriptSubroutine } from 'arx-level-generator/scripting'
import { useDelay } from 'arx-level-generator/scripting/hooks'

type WeaponData = {
  weapon: string
  damage: number
}

export const tiers: WeaponData[] = [
  {
    weapon: 'bone_weap',
    damage: 1,
  },
  {
    weapon: 'dagger',
    damage: 2,
  },
  {
    weapon: 'club',
    damage: 3,
  },
  {
    weapon: 'short_sword',
    damage: 4,
  },
  {
    weapon: 'long_sword',
    damage: 5,
  },
  {
    weapon: 'sabre',
    damage: 6,
  },
  {
    weapon: 'long_sword_ciprian',
    damage: 7,
  },
  {
    // TODO: need quiver (weapons/arrows/arrows)
    weapon: 'bow',
    damage: 6,
  },
]

export class GungameEngine extends Entity {
  constructor({ ...props }: EntityConstructorPropsWithoutSrc = {}) {
    super({
      src: 'system/marker',
      ...props,
    })

    this.withScript()

    const { weapon, damage } = tiers[3]

    // TODO: if the player does not have enough stats then equipping higher tier weapons fail

    const resetWeapons = new ScriptSubroutine(
      'reset_weapons',
      () => {
        return `
          sendevent change_weapon player "${weapon} ${damage}"
          sendevent -g bot change_weapon "${weapon} ${damage}"
        `
      },
      'goto',
    )

    this.script?.subroutines.push(resetWeapons)

    this.script?.on('initend', () => {
      const { delay } = useDelay()

      return `
        ${delay(1000)} ${resetWeapons.invoke()}
      `
    })

    // https://wiki.arx-libertatis.org/Script:setweapon
  }
}
