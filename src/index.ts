import { ArxMap, Color, HudElements, Rotation, Settings, Texture, Vector3 } from 'arx-level-generator'
import { createPlaneMesh } from 'arx-level-generator/prefabs/mesh'
import { Variable } from 'arx-level-generator/scripting/properties'
import { applyTransformations } from 'arx-level-generator/utils'
import { times } from 'arx-level-generator/utils/faux-ramda'
import { pickRandom } from 'arx-level-generator/utils/random'
import { MathUtils, Vector2 } from 'three'
import { GungameEngine } from '@/entities/GungameEngine.js'
import { NPC } from '@/entities/NPC.js'
import { RespawnController } from '@/entities/RespawnController.js'

const settings = new Settings()

const map = new ArxMap()
map.config.offset = new Vector3(6000, 0, 6000)
map.player.position.adjustToPlayerHeight()
map.player.withScript()
map.hud.hide(HudElements.Minimap)

// -------------------------------------

const playerLastEquippedWeaponID = new Variable('string', 'last_equipped_weapon_id', 'none')
map.player.script?.properties.push(playerLastEquippedWeaponID)

map.player.script
  ?.on('ouch', () => {
    return `
      set @hp ^life
      dec @hp ^&param1
      if (@hp <= 0) {
        sendevent change_weapon self "none"
      }

      IF (^#PARAM1 > 20) {
        SPEAK [Player_ouch_strong] NOP
        ACCEPT
      } ELSE IF (^#PARAM1 > 8) {
        SPEAK [Player_ouch_medium] NOP
        ACCEPT
      } ELSE IF (^#PARAM1 > 2) {
        SPEAK [Player_ouch] NOP
        ACCEPT
      }
    `
  })
  .on('die', () => {
    return `
      sendevent killed ${respawnController.ref} "player ~^sender~"
    `
  })
  .on('critical', () => {
    return `
      HEROSAY [player_dbldmg]
      SPEAK [player_attack_1handed_weap] NOP
    `
  })
  .on('glow', () => {
    const glowColor = Color.fromCSS('#ccffff')
    const glowRadius = 30

    return `
      if (^$param1 == "on") {
        halo -ocs ${glowColor.toScriptColor()} ${glowRadius} // [o] = active, [c] = color, [s] = radius
      } else {
        halo -f // [f] = inactive
      }
    `
  })
  .on('change_weapon', () => {
    return `
      if (${playerLastEquippedWeaponID.name} != "") {
        destroy ${playerLastEquippedWeaponID.name}
      }

      if (^$param1 == "none") {
        sendevent equipout player ~${playerLastEquippedWeaponID.name}~
        set ${playerLastEquippedWeaponID.name} ""
      } else {
        spawn item "weapons/~^$param1~/~^$param1~" player
        sendevent inventoryuse ~^last_spawned~ nop
        set ${playerLastEquippedWeaponID.name} ~^last_spawned~
      }
    `
  })

// -------------------------------------

const floor = createPlaneMesh({
  size: new Vector2(1000, 1000),
  texture: Texture.l2TrollStoneGround04,
})

applyTransformations(floor)
floor.translateX(map.config.offset.x)
floor.translateY(map.config.offset.y)
floor.translateZ(map.config.offset.z)
applyTransformations(floor)
map.polygons.addThreeJsMesh(floor)

// -------------------------------------

const gungameEngine = new GungameEngine()
map.entities.push(gungameEngine)

const numberOfBots = 3

const respawnController = new RespawnController({
  numberOfBots,
  gameController: gungameEngine,
})
map.entities.push(respawnController)

const rootNpc = new NPC()
rootNpc.script?.makeIntoRoot()
rootNpc.script?.on('die', () => `sendevent killed ${respawnController.ref} "~^me~ ~^sender~"`)
map.entities.push(rootNpc)

const npcs = times((i) => {
  return new NPC({
    position: new Vector3(50 + -100 * (numberOfBots / 2) + i * 100, 0, 300),
    orientation: new Rotation(0, MathUtils.degToRad(180), 0),
    type: pickRandom(['arx guard', 'rebel guard']),
  })
}, numberOfBots)

map.entities.push(...npcs)

// -------------------------------------

// TODO: add different spawn/respawn points - respawnCtrl should handle it?
// TODO: give NPCs random names

// -------------------------------------

map.finalize()
await map.saveToDisk(settings)

console.log('done')
