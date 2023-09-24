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
import { Sound } from 'arx-level-generator/scripting/classes'
import { useDelay } from 'arx-level-generator/scripting/hooks'
import { PlayerControls, Variable } from 'arx-level-generator/scripting/properties'
import { point, levelUp, levelDown } from '@/sounds.js'

type WeaponData = {
  weapon: string
  damage: number
  killsNeededForNextLevel: number
}

export const tiers: WeaponData[] = [
  {
    weapon: 'bone_weap',
    damage: 1,
    killsNeededForNextLevel: 2,
  },
  {
    weapon: 'dagger',
    damage: 2,
    killsNeededForNextLevel: 2,
  },
  {
    weapon: 'club',
    damage: 3,
    killsNeededForNextLevel: 2,
  },
  {
    weapon: 'short_sword',
    damage: 4,
    killsNeededForNextLevel: 2,
  },
  {
    weapon: 'long_sword',
    damage: 5,
    killsNeededForNextLevel: 2,
  },
  {
    weapon: 'sabre',
    damage: 6,
    killsNeededForNextLevel: 2,
  },
  {
    weapon: 'long_sword_ciprian',
    damage: 7,
    killsNeededForNextLevel: 2,
  },
  {
    weapon: 'bow',
    damage: 6,
    killsNeededForNextLevel: 2,
  },
  {
    weapon: 'none',
    damage: 0,
    killsNeededForNextLevel: 1,
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

    this.otherDependencies.push(levelUp, levelDown, point)

    const levelUpSound = new Sound(levelUp.filename)
    const levelDownSound = new Sound(levelDown.filename)
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
          set ${playerKillsPerLevel.name} 0
          set ${playerLevel.name} 0
          ${playerLevelChanged.invoke()}

          sendevent -g bot change_weapon "${weapon} ${damage}"
        `
      },
      'goto',
    )

    const playerLevelChanged = new ScriptSubroutine(
      'player_level_changed',
      () => {
        return `
          ${tiers
            .map(({ weapon, damage }, i) => {
              return `
                if (${playerLevel.name} == ${i}) {
                  sendevent change_weapon player "${weapon} ${damage}"
                }
              `
            })
            .join('\n')}
        `
      },
      'goto',
    )

    this.script?.subroutines.push(resetWeapons, playerLevelChanged)

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
          set £killerWeapon ^$param3

          if (£killerID == "player") {
            if (£killerWeapon == "bare") {
              set ${playerKillsPerLevel.name} 0
              inc ${playerLevel.name} 1
              
              if (${playerLevel.name} < ${tiers.length}) {
                sendevent play ${soundEmitterForPlayer.ref} level_up
                ${playerLevelChanged.invoke()}
              } else {
                sendevent victory self player
              }
            } else {
              inc ${playerTotalKills.name} 1
              inc ${playerKillsPerLevel.name} 1

              ${tiers
                .map(({ killsNeededForNextLevel }, i) => {
                  return `
                    if (${playerLevel.name} == ${i}) {
                      set §killsNeededForNextLevel ${killsNeededForNextLevel}
                    }
                  `
                })
                .join('\n')}

              if (${playerKillsPerLevel.name} < §killsNeededForNextLevel) {
                sendevent play ${soundEmitterForPlayer.ref} point
              } else {
                set ${playerKillsPerLevel.name} 0
                inc ${playerLevel.name} 1
                
                if (${playerLevel.name} < ${tiers.length}) {
                  sendevent play ${soundEmitterForPlayer.ref} level_up
                  ${playerLevelChanged.invoke()}
                } else {
                  sendevent victory self player
                }
              }
            }
          }

          if (£killerID == "none") {
            if (£victimID == "player") {
              set ${playerKillsPerLevel.name} 0
              if (${playerLevel.name} > 0) {
                sendevent play ${soundEmitterForPlayer.ref} level_down
                dec ${playerLevel.name} 1
              }
            }
            if (£victimID isgroup "bot") {
              // TODO: a bot died via falling from too high
            }
          }

          if (£killerID isgroup "bot") {
            // TODO: a bot killed someone
          }
        `
      })
      .on('respawn', () => {
        const { weapon, damage } = tiers[0]

        return `
          if (^$param1 == "player") {
            ${playerLevelChanged.invoke()}
          } else {
            sendevent change_weapon ^$param1 "${weapon} ${damage}"
          }
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
          if (^$param1 == "level_down") {
            ${levelDownSound.play()}
          }
        `
    })
  }
}
