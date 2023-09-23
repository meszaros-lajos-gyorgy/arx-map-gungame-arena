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
        const delay = useDelay()

        return `
        if (${this.propRespawnQueueSize.name} > 0) {
          sendevent respawn ${this.propRespawnQueueEntries[0].name} nop

          inc ${this.propSpawnProtectionQueueSize.name} 1
          set £spawn_protection_queue_entry_~${this.propSpawnProtectionQueueSize.name}~ ${
            this.propRespawnQueueEntries[0].name
          }

          herosay "ok"

          // move respawn queue entries to the left
          ${times((i) => {
            if (i === numberOfBots - 1) {
              return `    set ${this.propRespawnQueueEntries[i].name} ""`
            } else {
              return `    set ${this.propRespawnQueueEntries[i].name} ${this.propRespawnQueueEntries[i + 1].name}`
            }
          }, numberOfBots).join('\n')}

          herosay "ok2"

          dec ${this.propRespawnQueueSize.name} 1

          herosay "ok3"


          ${delay(SPAWN_PROTECTION_TIME)} ${spawnProtectOffNpc.invoke()}
        }
      `
      },
      'goto',
    )

    const spawnProtectOffNpc = new ScriptSubroutine(
      'spawn_protect_off_npc',
      () => {
        return `
        herosay "ok4"

        if (${this.propSpawnProtectionQueueSize.name} > 0) {
          sendevent spawn_protect_off ${this.propSpawnProtectionQueueEntries[0].name} nop


          ${times((i) => {
            if (i === numberOfBots - 1) {
              return `    set ${this.propSpawnProtectionQueueEntries[i].name} ""`
            } else {
              return `    set ${this.propSpawnProtectionQueueEntries[i].name} ${
                this.propSpawnProtectionQueueEntries[i + 1].name
              }`
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
        invulnerability -p on // [p] = ?
      `
    })

    const spawnProtectOff = new ScriptSubroutine(
      'spawn_protect_off',
      () => {
        return `
        sendevent glow player off
        invulnerability -p off // [p] = ?
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
        const delay = useDelay()

        return `
        ${respawn.invoke()}
        ${spawnProtectOn.invoke()}
        ${delay(SPAWN_PROTECTION_TIME)} ${spawnProtectOff.invoke()}
      `
      },
      'goto',
    )

    this.script?.subroutines.push(resurrectNpc, spawnProtectOffNpc, spawnProtectOn, spawnProtectOff, respawn, resurrect)

    this.script?.on('killed', () => {
      const delay = useDelay()

      return `
        set £victimID ^$param1
        set £killerID ^$param2

        if (£victimID == "player") {
          if (${this.propIgnoreNextKillEvent.name} == 1) {
            set ${this.propIgnoreNextKillEvent.name} 0
          } else {
            sendevent died ${gameController.ref} "~£victimID~ ~£killerID~"
            ${delay(DEATHCAM_TIME)} ${resurrect.invoke()}
          }
        } else {
          sendevent died ${gameController.ref} "~£victimID~ ~£killerID~"

          inc ${this.propRespawnQueueSize.name} 1
          set "£respawnQueueItem~${this.propRespawnQueueSize.name}~" £victimID
          ${delay(DEATHCAM_TIME)} ${resurrectNpc.invoke()}
        }
      `
    })
  }
}
