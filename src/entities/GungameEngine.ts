// everyone is against everyone
// we have a list of weapons with increasing damage
// 2 kills will level you up and you get the next tier weapon
// killing with bare fists result in stealing a level from the enemy (same as knife in gungame)
// the last level will be fists only (same as knife in gungame)
// score board?
// whoever kills 2 with bare hands will win
import { Expand } from 'arx-convert/utils'
import { Entity, EntityConstructorPropsWithoutSrc } from 'arx-level-generator'
import { ScriptSubroutine } from 'arx-level-generator/scripting'
import { Sound, SoundFlags } from 'arx-level-generator/scripting/classes'
import { useDelay } from 'arx-level-generator/scripting/hooks'
import { PlayerControls, Variable } from 'arx-level-generator/scripting/properties'
import { point, levelUp } from '@/sounds.js'

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
    weapon: 'bow',
    damage: 6,
  },
]

type GungameEngineConstructorProps = Expand<
  EntityConstructorPropsWithoutSrc & {
    numberOfBots: number
    soundEmitterForPlayer: Entity
  }
>

export class GungameEngine extends Entity {
  constructor({ numberOfBots, soundEmitterForPlayer, ...props }: GungameEngineConstructorProps) {
    super({
      src: 'system/marker',
      ...props,
    })

    this.otherDependencies.push(levelUp, point)

    const levelUpSound = new Sound(levelUp.filename)
    const pointSound = new Sound(point.filename)

    this.withScript()

    const playerLevel = new Variable('int', 'player_level', 0)
    const playerKillsPerLevel = new Variable('int', 'player_kills_per_level', 0)
    const playerTotalKills = new Variable('int', 'player_total_kills', 0)

    this.script?.properties.push(playerLevel, playerKillsPerLevel, playerTotalKills)

    const { weapon, damage } = tiers[0]

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

    this.script
      ?.on('initend', () => {
        const { delay } = useDelay()

        return `
          ${delay(1000)} ${resetWeapons.invoke()}
        `
      })
      .on('died', () => {
        return `
          set £victimID ^$param1
          set £killerID ^$param2

          if (£killerID == "player") {
            int ${playerTotalKills.name} 1
            inc ${playerKillsPerLevel.name} 1
            if (${playerKillsPerLevel.name} < 2) {
              sendevent play ${soundEmitterForPlayer.ref} point
            } else {
              set ${playerKillsPerLevel.name} 0
              inc ${playerLevel.name} 1
              
              if (${playerLevel.name} < ${tiers.length}) {
                sendevent play ${soundEmitterForPlayer.ref} level_up

                ${tiers
                  .map(({ weapon, damage }, i) => {
                    return `
                      if (${playerLevel.name} == ${i}) {
                        sendevent change_weapon player "${weapon} ${damage}"
                      }
                    `
                  })
                  .join('\n')}
              } else {
                sendevent victory self player
              }
            }
          }
        `
      })
      .on('respawn', () => {
        const { weapon, damage } = tiers[0]

        return `
          sendevent change_weapon ^$param1 "${weapon} ${damage}"
        `
      })
      .on('victory', () => {
        return `
          if (^$param1 == "player") {
            herosay "~^$param1~ won the match with ~${playerTotalKills.name}~ kills!"
          } else {
            herosay "~^$param1~ won the match!"
          }
          ${PlayerControls.off}

          // TODO: stop bots
        `
      })

    soundEmitterForPlayer.script?.on('play', () => {
      return `
          teleport player

          if (^$param1 == "point") {
            ${pointSound.play()}
          }
          if (^$param1 == "level_up") {
            ${levelUpSound.play()}
          }
          
        `
    })
  }
}
