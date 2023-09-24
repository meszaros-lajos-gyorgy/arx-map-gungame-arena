import { Expand } from 'arx-convert/utils'
import { Entity, EntityConstructorPropsWithoutSrc } from 'arx-level-generator'
import { ScriptSubroutine } from 'arx-level-generator/scripting'
import { useDelay } from 'arx-level-generator/scripting/hooks'
import { PlayerControls, Variable } from 'arx-level-generator/scripting/properties'
import { times } from 'arx-level-generator/utils/faux-ramda'

const SPAWN_PROTECTION_TIME = 3000

// this has to be <= 7000 otherwise the player will fade out to the main menu after dying
// TODO: find a way to fake player's death animation without triggering the fadeout (immediately respawn him)
const DEATHCAM_TIME = 5000

type RespawnControllerConstructorProps = Expand<
  EntityConstructorPropsWithoutSrc & {
    numberOfBots: number
    gameController: Entity
  }
>

export class RespawnController extends Entity {
  protected propIgnoreNextKillEvent: Variable<boolean>
  protected propRespawnQueueSize: Variable<number>
  protected propSpawnProtectionQueueSize: Variable<number>
  protected propRespawnQueueEntries: Variable<string>[]
  protected propSpawnProtectionQueueEntries: Variable<string>[]

  constructor({ numberOfBots, gameController, ...props }: RespawnControllerConstructorProps) {
    super({
      src: 'system/marker',
      ...props,
    })

    this.withScript()

    this.propIgnoreNextKillEvent = new Variable('bool', 'ignore_next_kill_event', false)
    this.propRespawnQueueSize = new Variable('int', 'respawn_queue_size', 0)
    this.propSpawnProtectionQueueSize = new Variable('int', 'spawn_protection_queue_size', 0)
    this.propRespawnQueueEntries = times((i) => new Variable('string', `respawn_queue_entry_${i}`, ''), numberOfBots)
    this.propSpawnProtectionQueueEntries = times(
      (i) => new Variable('string', `spawn_protection_queue_entry_${i}`, ''),
      numberOfBots,
    )

    this.script?.properties.push(
      this.propIgnoreNextKillEvent,
      this.propRespawnQueueSize,
      this.propSpawnProtectionQueueSize,
      ...this.propRespawnQueueEntries,
      ...this.propSpawnProtectionQueueEntries,
    )

    const resurrectNpc = new ScriptSubroutine(
      'resurrect_npc',
      () => {
        const { uniqueDelay } = useDelay()

        return `
          if (${this.propRespawnQueueSize.name} > 0) {
            sendevent respawn ${this.propRespawnQueueEntries[0].name} nop
            sendevent respawn ${gameController.ref} ~${this.propRespawnQueueEntries[0].name}~

            set £spawn_protection_queue_entry_~${this.propSpawnProtectionQueueSize.name}~ ${
              this.propRespawnQueueEntries[0].name
            }
            inc ${this.propSpawnProtectionQueueSize.name} 1

            // move respawn queue entries to the left
            ${times((i) => {
              const currentEntry = this.propRespawnQueueEntries[i]
              const nextEntry = this.propRespawnQueueEntries[i + 1]

              if (i === numberOfBots - 1) {
                return `    set ${currentEntry.name} ""`
              } else {
                return `    set ${currentEntry.name} ${nextEntry.name}`
              }
            }, numberOfBots).join('\n')}

            dec ${this.propRespawnQueueSize.name} 1

            ${uniqueDelay(SPAWN_PROTECTION_TIME)} ${spawnProtectOffNpc.invoke()}
          }
        `
      },
      'goto',
    )

    const spawnProtectOffNpc = new ScriptSubroutine(
      'spawn_protect_off_npc',
      () => {
        return `
          if (${this.propSpawnProtectionQueueSize.name} > 0) {
            sendevent spawn_protect_off ${this.propSpawnProtectionQueueEntries[0].name} nop

            // move spawn protection queue to the left
            ${times((i) => {
              const currentEntry = this.propSpawnProtectionQueueEntries[i]
              const nextEntry = this.propSpawnProtectionQueueEntries[i + 1]
              if (i === numberOfBots - 1) {
                return `    set ${currentEntry.name} ""`
              } else {
                return `    set ${currentEntry.name} ${nextEntry.name}`
              }
            }, numberOfBots).join('\n')}

            dec ${this.propSpawnProtectionQueueSize.name} 1
          }
        `
      },
      'goto',
    )

    const spawnProtectOn = new ScriptSubroutine('spawn_protect_on', () => {
      return `
          sendevent glow player on
          invulnerability -p on // [p] = player
        `
    })

    const spawnProtectOff = new ScriptSubroutine(
      'spawn_protect_off',
      () => {
        return `
          sendevent glow player off
          invulnerability -p off // [p] = player
        `
      },
      'goto',
    )

    const respawn = new ScriptSubroutine('respawn', () => {
      return `
        ${PlayerControls.on} specialfx heal 1
        set ${this.propIgnoreNextKillEvent.name} 1
        dodamage player 1
        ${PlayerControls.on} specialfx heal ^player_maxlife
      `
    })

    const resurrect = new ScriptSubroutine(
      'resurrect',
      () => {
        const { delay } = useDelay()

        return `
          sendevent respawn ${gameController.ref} "player"
          ${respawn.invoke()}
          ${spawnProtectOn.invoke()}
          ${delay(SPAWN_PROTECTION_TIME)} ${spawnProtectOff.invoke()}
        `
      },
      'goto',
    )

    this.script?.subroutines.push(resurrectNpc, spawnProtectOffNpc, spawnProtectOn, spawnProtectOff, respawn, resurrect)

    this.script?.on('killed', () => {
      const { delay, uniqueDelay } = useDelay()

      return `
        set £victimID ^$param1
        set £killerID ^$param2
        set £killerWeapon ^$param3

        if (£victimID == "player") {
          if (${this.propIgnoreNextKillEvent.name} == 1) {
            set ${this.propIgnoreNextKillEvent.name} 0
          } else {
            sendevent died ${gameController.ref} "~£victimID~ ~£killerID~ ~£killerWeapon~"
            ${delay(DEATHCAM_TIME)} ${resurrect.invoke()}
          }
        } else {
          sendevent died ${gameController.ref} "~£victimID~ ~£killerID~ ~£killerWeapon~"

          set £respawn_queue_entry_~${this.propRespawnQueueSize.name}~ £victimID
          inc ${this.propRespawnQueueSize.name} 1

          ${uniqueDelay(DEATHCAM_TIME)} ${resurrectNpc.invoke()}
        }
      `
    })
  }
}
