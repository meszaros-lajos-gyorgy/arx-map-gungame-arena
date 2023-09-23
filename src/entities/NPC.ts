import { Expand } from 'arx-convert/utils'
import { Color, Entity, EntityConstructorPropsWithoutSrc, EntityModel } from 'arx-level-generator'
import { ScriptSubroutine } from 'arx-level-generator/scripting'
import { useDelay } from 'arx-level-generator/scripting/hooks'
import { Collision, Invulnerability, Material, Variable } from 'arx-level-generator/scripting/properties'

export type NPC_TYPE = 'arx guard' | 'rebel guard'

type NPCConstructorProps = Expand<
  EntityConstructorPropsWithoutSrc & {
    type: NPC_TYPE
  }
>

export class NPC extends Entity {
  protected propType: Variable<string>
  protected propPainTolerance: Variable<number>
  protected propLastTimeSayingOuch: Variable<number>
  protected propIsRespawning: Variable<boolean>

  constructor({ type, ...props }: NPCConstructorProps = { type: 'arx guard' }) {
    super({
      src: 'npc/human_base',
      ...props,
    })

    this.withScript()

    this.propType = new Variable('string', 'type', type)
    this.propPainTolerance = new Variable('int', 'pain_tolerance', 1)
    this.propLastTimeSayingOuch = new Variable('int', 'last_time_saying_ouch', 0)
    this.propIsRespawning = new Variable('bool', 'is_respawning', false, true)

    this.script?.properties.push(
      this.propType,
      this.propPainTolerance,
      this.propLastTimeSayingOuch,
      this.propIsRespawning,
    )

    const setType = new ScriptSubroutine('set_type', () => {
      if (!this.script?.isRoot) {
        return ''
      }

      return `
        if (${this.propType.name} == "arx guard") {
          TWEAK ALL "human_chainmail"
          TWEAK SKIN "npc_human_chainmail_body" "npc_human_chainmail_guard_body"
          TWEAK SKIN "npc_human_chainmail_hero_head" "npc_human_chainmail_guard_head"
          SET_ARMOR_MATERIAL METAL_CHAIN
          SET_STEP_MATERIAL Foot_metal_chain
          SET ${this.propPainTolerance.name} 4
          
          SET £dying [human_male_dying]
          SET £ouch [Human_guard_ouch]
          SET £ouch_medium [Human_guard_ouch_medium]
          SET £ouch_strong [Human_guard_ouch_strong]
      
          SETNAME [description_guard]
      
          SET_NPC_STAT armor_class 18
          SET_NPC_STAT absorb 40
          SET_NPC_STAT tohit 70
          SET_NPC_STAT aimtime 1000
          SET_NPC_STAT life 10
        }

        if (${this.propType.name} == "rebel guard") {
          TWEAK ALL "human_chainmail"
          TWEAK SKIN "npc_human_chainmail_body" "npc_human_chainmail_sacred_body"
          TWEAK SKIN "npc_human_chainmail_hero_head" "npc_human_chainmail_sacred_head"
          SET_ARMOR_MATERIAL METAL_CHAIN
          SET_STEP_MATERIAL Foot_metal_chain
          SET ${this.propPainTolerance.name} 4
      
          SET £dying [human_male_dying]
          SET £ouch [Human_guard_ouch]
          SET £ouch_medium [Human_guard_ouch_medium]
          SET £ouch_strong [Human_guard_ouch_strong]
      
          SETNAME [description_guard]
      
          SET_NPC_STAT armor_class 18
          SET_NPC_STAT absorb 40
          SET_NPC_STAT tohit 70
          SET_NPC_STAT aimtime 1000
          SET_NPC_STAT life 10
        }
      `
    })

    // TODO: add this only when isRoot -> isRoot can only be determined at compile time
    this.script?.subroutines.push(setType)

    this.script?.on('init', () => {
      if (!this.script?.isRoot) {
        return ''
      }

      return `
        setgroup "bot"
        setgore off
      `
    })

    this.script?.on('initend', () => {
      if (!this.script?.isRoot) {
        return ''
      }

      return `
        loadanim WALK_SNEAK                 "human_walk_sneak"
        loadanim CAST_START                 "human_npc_cast_start"
        loadanim CAST_CYCLE                 "human_npc_cast_cycle"
        loadanim CAST                       "human_npc_cast_cast"
        loadanim CAST_END                   "human_npc_cast_end"
        loadanim WALK                       "human_normal_walk_guard"
        loadanim RUN                        "Human_normal_run"
        loadanim WAIT                       "Human_normal_wait"
        loadanim HIT                        "Human_fight_receive_damage"
        loadanim HIT_SHORT                  "human_hit_short"
        loadanim DIE                        "Human_death"
        loadanim TALK_NEUTRAL               "human_talk_neutral_headonly"
        loadanim TALK_ANGRY                 "human_talk_angry_headonly"
        loadanim TALK_HAPPY                 "human_talk_happy_headonly"
        loadanim GRUNT                      "human_fight_grunt"
        loadanim FIGHT_WAIT                 "human_fight_wait"
        loadanim FIGHT_WALK_FORWARD         "human_fight_walk"
        loadanim FIGHT_WALK_BACKWARD        "human_fight_walk_backward"
        loadanim FIGHT_STRAFE_RIGHT         "human_fight_strafe_right"
        loadanim FIGHT_STRAFE_LEFT          "human_fight_strafe_left"
        loadanim BARE_READY                 "human_fight_ready_noweap"
        loadanim BARE_UNREADY               "human_fight_unready_noweap"
        loadanim BARE_WAIT                  "human_fight_wait_noweap"
        loadanim BARE_STRIKE_LEFT_START     "human_fight_attack_noweap_left_start"
        loadanim BARE_STRIKE_LEFT_CYCLE     "human_fight_attack_noweap_left_cycle"
        loadanim BARE_STRIKE_LEFT           "human_fight_attack_noweap_left_strike"
        loadanim BARE_STRIKE_RIGHT_START    "human_fight_attack_noweap_right_start"
        loadanim BARE_STRIKE_RIGHT_CYCLE    "human_fight_attack_noweap_right_cycle"
        loadanim BARE_STRIKE_RIGHT          "human_fight_attack_noweap_right_strike"
        loadanim BARE_STRIKE_TOP_START      "human_fight_attack_noweap_top_start"
        loadanim BARE_STRIKE_TOP_CYCLE      "human_fight_attack_noweap_top_cycle"
        loadanim BARE_STRIKE_TOP            "human_fight_attack_noweap_top_strike"
        loadanim BARE_STRIKE_BOTTOM_START   "human_fight_attack_noweap_bottom_start"
        loadanim BARE_STRIKE_BOTTOM_CYCLE   "human_fight_attack_noweap_bottom_cycle"
        loadanim BARE_STRIKE_BOTTOM         "human_fight_attack_noweap_bottom_strike"
        loadanim 1H_WAIT                    "human_fight_wait_1handed"
        loadanim 1H_READY_PART_1            "human_fight_ready_1handed_start"
        loadanim 1H_READY_PART_2            "human_fight_ready_1handed_end"
        loadanim 1H_UNREADY_PART_1          "human_fight_unready_1handed_start"
        loadanim 1H_UNREADY_PART_2          "human_fight_unready_1handed_end"
        loadanim 1H_STRIKE_LEFT_START       "human_fight_attack_1handed_left_start"
        loadanim 1H_STRIKE_LEFT_CYCLE       "human_fight_attack_1handed_left_cycle"
        loadanim 1H_STRIKE_LEFT             "human_fight_attack_1handed_left_strike"
        loadanim 1H_STRIKE_RIGHT_START      "human_fight_attack_1handed_right_start"
        loadanim 1H_STRIKE_RIGHT_CYCLE      "human_fight_attack_1handed_right_cycle"
        loadanim 1H_STRIKE_RIGHT            "human_fight_attack_1handed_right_strike"
        loadanim 1H_STRIKE_TOP_START        "human_fight_attack_1handed_top_start"
        loadanim 1H_STRIKE_TOP_CYCLE        "human_fight_attack_1handed_top_cycle"
        loadanim 1H_STRIKE_TOP              "human_fight_attack_1handed_top_strike"
        loadanim 1H_STRIKE_BOTTOM_START     "human_fight_attack_1handed_bottom_start"
        loadanim 1H_STRIKE_BOTTOM_CYCLE     "human_fight_attack_1handed_bottom_cycle"
        loadanim 1H_STRIKE_BOTTOM           "human_fight_attack_1handed_bottom_strike"
        loadanim 2H_READY_PART_1            "human_fight_ready_2handed_start"
        loadanim 2H_READY_PART_2            "human_fight_ready_2handed_end"
        loadanim 2H_UNREADY_PART_1          "human_fight_unready_2handed_start"
        loadanim 2H_UNREADY_PART_2          "human_fight_unready_2handed_end"
        loadanim 2H_WAIT                    "human_fight_wait_2handed"
        loadanim 2H_STRIKE_LEFT_START       "human_fight_attack_2handed_left_start"
        loadanim 2H_STRIKE_LEFT_CYCLE       "human_fight_attack_2handed_left_cycle"
        loadanim 2H_STRIKE_LEFT             "human_fight_attack_2handed_left_strike"
        loadanim 2H_STRIKE_RIGHT_START      "human_fight_attack_2handed_right_start"
        loadanim 2H_STRIKE_RIGHT_CYCLE      "human_fight_attack_2handed_right_cycle"
        loadanim 2H_STRIKE_RIGHT            "human_fight_attack_2handed_right_strike"
        loadanim 2H_STRIKE_TOP_START        "human_fight_attack_2handed_top_start"
        loadanim 2H_STRIKE_TOP_CYCLE        "human_fight_attack_2handed_top_cycle"
        loadanim 2H_STRIKE_TOP              "human_fight_attack_2handed_top_strike"
        loadanim 2H_STRIKE_BOTTOM_START     "human_fight_attack_2handed_bottom_start"
        loadanim 2H_STRIKE_BOTTOM_CYCLE     "human_fight_attack_2handed_bottom_cycle"
        loadanim 2H_STRIKE_BOTTOM           "human_fight_attack_2handed_bottom_strike"
        loadanim DAGGER_READY_PART_1        "human_fight_ready_dagger_start"
        loadanim DAGGER_READY_PART_2        "human_fight_ready_dagger_end"
        loadanim DAGGER_UNREADY_PART_1      "human_fight_unready_dagger_start"
        loadanim DAGGER_UNREADY_PART_2      "human_fight_unready_dagger_end"
        loadanim DAGGER_WAIT                "human_fight_attack_dagger_wait"
        loadanim DAGGER_STRIKE_LEFT_START   "human_fight_attack_dagger_left_start"
        loadanim DAGGER_STRIKE_LEFT_CYCLE   "human_fight_attack_dagger_left_cycle"
        loadanim DAGGER_STRIKE_LEFT         "human_fight_attack_dagger_left_strike"
        loadanim DAGGER_STRIKE_RIGHT_START  "human_fight_attack_dagger_right_start"
        loadanim DAGGER_STRIKE_RIGHT_CYCLE  "human_fight_attack_dagger_right_cycle"
        loadanim DAGGER_STRIKE_RIGHT        "human_fight_attack_dagger_right_strike"
        loadanim DAGGER_STRIKE_TOP_START    "human_fight_attack_dagger_top_start"
        loadanim DAGGER_STRIKE_TOP_CYCLE    "human_fight_attack_dagger_top_cycle"
        loadanim DAGGER_STRIKE_TOP          "human_fight_attack_dagger_top_strike"
        loadanim DAGGER_STRIKE_BOTTOM_START "human_fight_attack_dagger_bottom_start"
        loadanim DAGGER_STRIKE_BOTTOM_CYCLE "human_fight_attack_dagger_bottom_cycle"
        loadanim DAGGER_STRIKE_BOTTOM       "human_fight_attack_dagger_bottom_strike"
        loadanim MISSILE_READY_PART_1       "human_fight_ready_bow_start"
        loadanim MISSILE_READY_PART_2       "human_fight_ready_bow_end"
        loadanim MISSILE_UNREADY_PART_1     "human_fight_unready_bow_start"
        loadanim MISSILE_UNREADY_PART_2     "human_fight_unready_bow_end"
        loadanim MISSILE_WAIT               "human_fight_wait_bow"
        loadanim MISSILE_STRIKE_PART_1      "human_fight_attack_bow_start_part1"
        loadanim MISSILE_STRIKE_PART_2      "human_fight_attack_bow_start_part2"
        loadanim MISSILE_STRIKE_CYCLE       "human_fight_attack_bow_cycle"
        loadanim MISSILE_STRIKE             "human_fight_attack_bow_strike"
        loadanim ACTION1                    "human_misc_kick_rat"

        ${Material.flesh}

        ${setType.invoke()}

        if (${this.propIsRespawning.name} == 1) {
          set ${this.propIsRespawning.name} 0
          playanim -12 die
          ${Invulnerability.on}
          ${Collision.off}
        }
      `
    })

    this.script?.on('glow', () => {
      if (!this.script?.isRoot) {
        return ''
      }

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

    this.script?.on('respawn', () => {
      if (!this.script?.isRoot) {
        return ''
      }

      return `
        ${Collision.on}
        playanim -12 none
        sendevent glow self on
      `
    })

    this.script?.on('die', () => {
      if (!this.script?.isRoot) {
        return ''
      }

      const { delay } = useDelay()

      return `
        set ${this.propIsRespawning.name} 1
        speak ~£dying~ nop
        ${delay(100)} revive -i
      `
    })

    this.script?.on('ouch', () => {
      if (!this.script?.isRoot) {
        return ''
      }

      return `
        set @hp ^life
        dec @hp ^&param1
        if (@hp <= 0) {
          sendevent change_weapon self "none 0"
        }

        if (^&param1 < ${this.propPainTolerance.name}) {
          forceanim hit_short
        } else {
          set #tmp ^gameseconds
          dec #tmp ${this.propLastTimeSayingOuch.name}
          if (#tmp > 4) {
            forceanim hit
            set ${this.propLastTimeSayingOuch.name} ^gameseconds
          }
          
          set &tmp ${this.propPainTolerance.name}
          mul &tmp 3
      
          if (^#param1 >= &tmp) {
            random 50 {
              speak -a ~£ouch_strong~ nop
            }
          } else {
            set &tmp ${this.propPainTolerance.name}
            mul &tmp 2
            if (^#param1 >= &tmp) {
              random 50 { 
                speak -a ~£ouch_medium~ nop
              }
            } else {
              random 50 {
                speak -a ~£ouch~ nop
              }
            }
          }
        }
      `
    })

    this.script?.on('spawn_protect_off', () => {
      if (!this.script?.isRoot) {
        return ''
      }

      return `
        sendevent glow self off
        ${Invulnerability.off}
      `
    })

    this.script?.on('change_weapon', () => {
      if (!this.script?.isRoot) {
        return ''
      }

      return `
        setweapon ~^$param1~
        set_npc_stat damages ^#param2
      `
    })
  }
}
