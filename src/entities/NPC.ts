import { Expand } from 'arx-convert/utils'
import { Color, Entity, EntityConstructorPropsWithoutSrc, EntityModel } from 'arx-level-generator'
import { ScriptSubroutine } from 'arx-level-generator/scripting'
import { LoadAnim } from 'arx-level-generator/scripting/commands'
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
  public propLastHitGotFrom: Variable<string>

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
    this.propLastHitGotFrom = new Variable('string', 'last_hit_got_from', '')

    this.script?.properties.push(
      this.propType,
      this.propPainTolerance,
      this.propLastTimeSayingOuch,
      this.propIsRespawning,
      this.propLastHitGotFrom,
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

    this.script?.subroutines.push(setType)

    this.script
      ?.whenRoot()
      .on('init', () => {
        return `
          setgroup "bot"
          setgore off
          ${Material.flesh}
        `
      })
      .on('init', new LoadAnim('walk_sneak', 'human_walk_sneak'))
      .on('init', new LoadAnim('cast_start', 'human_npc_cast_start'))
      .on('init', new LoadAnim('cast_cycle', 'human_npc_cast_cycle'))
      .on('init', new LoadAnim('cast', 'human_npc_cast_cast'))
      .on('init', new LoadAnim('cast_end', 'human_npc_cast_end'))
      .on('init', new LoadAnim('walk', 'human_normal_walk_guard'))
      .on('init', new LoadAnim('run', 'Human_normal_run'))
      .on('init', new LoadAnim('wait', 'Human_normal_wait'))
      .on('init', new LoadAnim('hit', 'Human_fight_receive_damage'))
      .on('init', new LoadAnim('hit_short', 'human_hit_short'))
      .on('init', new LoadAnim('die', 'Human_death'))
      .on('init', new LoadAnim('TALK_NEUTRAL', 'human_talk_neutral_headonly'))
      .on('init', new LoadAnim('TALK_ANGRY', 'human_talk_angry_headonly'))
      .on('init', new LoadAnim('TALK_HAPPY', 'human_talk_happy_headonly'))
      .on('init', new LoadAnim('grunt', 'human_fight_grunt'))
      .on('init', new LoadAnim('FIGHT_WAIT', 'human_fight_wait'))
      .on('init', new LoadAnim('FIGHT_WALK_FORWARD', 'human_fight_walk'))
      .on('init', new LoadAnim('FIGHT_WALK_BACKWARD', 'human_fight_walk_backward'))
      .on('init', new LoadAnim('FIGHT_STRAFE_RIGHT', 'human_fight_strafe_right'))
      .on('init', new LoadAnim('FIGHT_STRAFE_LEFT', 'human_fight_strafe_left'))
      .on('init', new LoadAnim('BARE_READY', 'human_fight_ready_noweap'))
      .on('init', new LoadAnim('BARE_UNREADY', 'human_fight_unready_noweap'))
      .on('init', new LoadAnim('BARE_WAIT', 'human_fight_wait_noweap'))
      .on('init', new LoadAnim('BARE_STRIKE_LEFT_START', 'human_fight_attack_noweap_left_start'))
      .on('init', new LoadAnim('BARE_STRIKE_LEFT_CYCLE', 'human_fight_attack_noweap_left_cycle'))
      .on('init', new LoadAnim('BARE_STRIKE_LEFT', 'human_fight_attack_noweap_left_strike'))
      .on('init', new LoadAnim('BARE_STRIKE_RIGHT_START', 'human_fight_attack_noweap_right_start'))
      .on('init', new LoadAnim('BARE_STRIKE_RIGHT_CYCLE', 'human_fight_attack_noweap_right_cycle'))
      .on('init', new LoadAnim('BARE_STRIKE_RIGHT', 'human_fight_attack_noweap_right_strike'))
      .on('init', new LoadAnim('BARE_STRIKE_TOP_START', 'human_fight_attack_noweap_top_start'))
      .on('init', new LoadAnim('BARE_STRIKE_TOP_CYCLE', 'human_fight_attack_noweap_top_cycle'))
      .on('init', new LoadAnim('BARE_STRIKE_TOP', 'human_fight_attack_noweap_top_strike'))
      .on('init', new LoadAnim('BARE_STRIKE_BOTTOM_START', 'human_fight_attack_noweap_bottom_start'))
      .on('init', new LoadAnim('BARE_STRIKE_BOTTOM_CYCLE', 'human_fight_attack_noweap_bottom_cycle'))
      .on('init', new LoadAnim('BARE_STRIKE_BOTTOM', 'human_fight_attack_noweap_bottom_strike'))
      .on('init', new LoadAnim('1H_WAIT', 'human_fight_wait_1handed'))
      .on('init', new LoadAnim('1H_READY_PART_1', 'human_fight_ready_1handed_start'))
      .on('init', new LoadAnim('1H_READY_PART_2', 'human_fight_ready_1handed_end'))
      .on('init', new LoadAnim('1H_UNREADY_PART_1', 'human_fight_unready_1handed_start'))
      .on('init', new LoadAnim('1H_UNREADY_PART_2', 'human_fight_unready_1handed_end'))
      .on('init', new LoadAnim('1H_STRIKE_LEFT_START', 'human_fight_attack_1handed_left_start'))
      .on('init', new LoadAnim('1H_STRIKE_LEFT_CYCLE', 'human_fight_attack_1handed_left_cycle'))
      .on('init', new LoadAnim('1H_STRIKE_LEFT', 'human_fight_attack_1handed_left_strike'))
      .on('init', new LoadAnim('1H_STRIKE_RIGHT_START', 'human_fight_attack_1handed_right_start'))
      .on('init', new LoadAnim('1H_STRIKE_RIGHT_CYCLE', 'human_fight_attack_1handed_right_cycle'))
      .on('init', new LoadAnim('1H_STRIKE_RIGHT', 'human_fight_attack_1handed_right_strike'))
      .on('init', new LoadAnim('1H_STRIKE_TOP_START', 'human_fight_attack_1handed_top_start'))
      .on('init', new LoadAnim('1H_STRIKE_TOP_CYCLE', 'human_fight_attack_1handed_top_cycle'))
      .on('init', new LoadAnim('1H_STRIKE_TOP', 'human_fight_attack_1handed_top_strike'))
      .on('init', new LoadAnim('1H_STRIKE_BOTTOM_START', 'human_fight_attack_1handed_bottom_start'))
      .on('init', new LoadAnim('1H_STRIKE_BOTTOM_CYCLE', 'human_fight_attack_1handed_bottom_cycle'))
      .on('init', new LoadAnim('1H_STRIKE_BOTTOM', 'human_fight_attack_1handed_bottom_strike'))
      .on('init', new LoadAnim('2H_READY_PART_1', 'human_fight_ready_2handed_start'))
      .on('init', new LoadAnim('2H_READY_PART_2', 'human_fight_ready_2handed_end'))
      .on('init', new LoadAnim('2H_UNREADY_PART_1', 'human_fight_unready_2handed_start'))
      .on('init', new LoadAnim('2H_UNREADY_PART_2', 'human_fight_unready_2handed_end'))
      .on('init', new LoadAnim('2H_WAIT', 'human_fight_wait_2handed'))
      .on('init', new LoadAnim('2H_STRIKE_LEFT_START', 'human_fight_attack_2handed_left_start'))
      .on('init', new LoadAnim('2H_STRIKE_LEFT_CYCLE', 'human_fight_attack_2handed_left_cycle'))
      .on('init', new LoadAnim('2H_STRIKE_LEFT', 'human_fight_attack_2handed_left_strike'))
      .on('init', new LoadAnim('2H_STRIKE_RIGHT_START', 'human_fight_attack_2handed_right_start'))
      .on('init', new LoadAnim('2H_STRIKE_RIGHT_CYCLE', 'human_fight_attack_2handed_right_cycle'))
      .on('init', new LoadAnim('2H_STRIKE_RIGHT', 'human_fight_attack_2handed_right_strike'))
      .on('init', new LoadAnim('2H_STRIKE_TOP_START', 'human_fight_attack_2handed_top_start'))
      .on('init', new LoadAnim('2H_STRIKE_TOP_CYCLE', 'human_fight_attack_2handed_top_cycle'))
      .on('init', new LoadAnim('2H_STRIKE_TOP', 'human_fight_attack_2handed_top_strike'))
      .on('init', new LoadAnim('2H_STRIKE_BOTTOM_START', 'human_fight_attack_2handed_bottom_start'))
      .on('init', new LoadAnim('2H_STRIKE_BOTTOM_CYCLE', 'human_fight_attack_2handed_bottom_cycle'))
      .on('init', new LoadAnim('2H_STRIKE_BOTTOM', 'human_fight_attack_2handed_bottom_strike'))
      .on('init', new LoadAnim('DAGGER_READY_PART_1', 'human_fight_ready_dagger_start'))
      .on('init', new LoadAnim('DAGGER_READY_PART_2', 'human_fight_ready_dagger_end'))
      .on('init', new LoadAnim('DAGGER_UNREADY_PART_1', 'human_fight_unready_dagger_start'))
      .on('init', new LoadAnim('DAGGER_UNREADY_PART_2', 'human_fight_unready_dagger_end'))
      .on('init', new LoadAnim('DAGGER_WAIT', 'human_fight_attack_dagger_wait'))
      .on('init', new LoadAnim('DAGGER_STRIKE_LEFT_START', 'human_fight_attack_dagger_left_start'))
      .on('init', new LoadAnim('DAGGER_STRIKE_LEFT_CYCLE', 'human_fight_attack_dagger_left_cycle'))
      .on('init', new LoadAnim('DAGGER_STRIKE_LEFT', 'human_fight_attack_dagger_left_strike'))
      .on('init', new LoadAnim('DAGGER_STRIKE_RIGHT_START', 'human_fight_attack_dagger_right_start'))
      .on('init', new LoadAnim('DAGGER_STRIKE_RIGHT_CYCLE', 'human_fight_attack_dagger_right_cycle'))
      .on('init', new LoadAnim('DAGGER_STRIKE_RIGHT', 'human_fight_attack_dagger_right_strike'))
      .on('init', new LoadAnim('DAGGER_STRIKE_TOP_START', 'human_fight_attack_dagger_top_start'))
      .on('init', new LoadAnim('DAGGER_STRIKE_TOP_CYCLE', 'human_fight_attack_dagger_top_cycle'))
      .on('init', new LoadAnim('DAGGER_STRIKE_TOP', 'human_fight_attack_dagger_top_strike'))
      .on('init', new LoadAnim('DAGGER_STRIKE_BOTTOM_START', 'human_fight_attack_dagger_bottom_start'))
      .on('init', new LoadAnim('DAGGER_STRIKE_BOTTOM_CYCLE', 'human_fight_attack_dagger_bottom_cycle'))
      .on('init', new LoadAnim('DAGGER_STRIKE_BOTTOM', 'human_fight_attack_dagger_bottom_strike'))
      .on('init', new LoadAnim('MISSILE_READY_PART_1', 'human_fight_ready_bow_start'))
      .on('init', new LoadAnim('MISSILE_READY_PART_2', 'human_fight_ready_bow_end'))
      .on('init', new LoadAnim('MISSILE_UNREADY_PART_1', 'human_fight_unready_bow_start'))
      .on('init', new LoadAnim('MISSILE_UNREADY_PART_2', 'human_fight_unready_bow_end'))
      .on('init', new LoadAnim('MISSILE_WAIT', 'human_fight_wait_bow'))
      .on('init', new LoadAnim('MISSILE_STRIKE_PART_1', 'human_fight_attack_bow_start_part1'))
      .on('init', new LoadAnim('MISSILE_STRIKE_PART_2', 'human_fight_attack_bow_start_part2'))
      .on('init', new LoadAnim('MISSILE_STRIKE_CYCLE', 'human_fight_attack_bow_cycle'))
      .on('init', new LoadAnim('MISSILE_STRIKE', 'human_fight_attack_bow_strike'))
      .on('init', new LoadAnim('action1', 'human_misc_kick_rat'))
      .on('initend', () => {
        return `
          ${setType.invoke()}

          if (${this.propIsRespawning.name} == 1) {
            set ${this.propIsRespawning.name} 0
            playanim -12 die
            ${Invulnerability.on}
            ${Collision.off}
          }
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
      .on('respawn', () => {
        return `
          ${Collision.on}
          playanim -12 none
          sendevent glow self on
        `
      })
      .on('hit', () => {
        return `set ${this.propLastHitGotFrom.name} ^$param2`
      })
      .on('die', () => {
        const { delay } = useDelay()

        return `
          set ${this.propIsRespawning.name} 1
          speak ~£dying~ nop
          ${delay(100)} revive -i
        `
      })
      .on('ouch', () => {
        return `
          set @hp ^life
          dec @hp ^&param1
          if (@hp <= 0) {
            setweapon "none"
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
      .on('spawn_protect_off', () => {
        return `
          sendevent glow self off
          ${Invulnerability.off}
        `
      })
      .on('change_weapon', () => {
        return `
          setweapon ~^$param1~
          set_npc_stat damages ^#param2
        `
      })
  }
}
