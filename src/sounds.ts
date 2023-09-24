import { Audio } from 'arx-level-generator'

export const levelUp = Audio.fromCustomFile({
  filename: 'smb3_powerup',
  sourcePath: './sfx/gungame',
})

export const levelDown = Audio.fromCustomFile({
  filename: 'smb3_powerdown',
  sourcePath: './sfx/gungame',
})

export const point = Audio.fromCustomFile({
  filename: 'bell1',
  sourcePath: './sfx/half-life/valve/sound/buttons',
})
