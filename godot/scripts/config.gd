class_name Config
extends RefCounted
## Pelin säädettävät perusarvot yhdessä paikassa (käännös: src/config.js).
## Vain ne arvot, joita Godot-versio jo käyttää; loput siirretään sitä mukaa
## kuin järjestelmät siirtyvät. Yksiköt: metrit, sekunnit.

const SEED := 20261006

# Maailma
const CHUNK_SIZE := 64.0
const CHUNK_SEGMENTS := 48
const WATER_LEVEL := -0.6

# Aika
const DAY_LENGTH_SEC := 20.0 * 60.0
const START_HOUR := 7.5

# Pelaaja
const EYE_HEIGHT := 1.65
const PLAYER_RADIUS := 0.35
const WALK_SPEED := 4.2
const SPRINT_SPEED := 7.2
const JUMP_SPEED := 6.0
const GRAVITY := 20.0
const REACH := 3.2

# Kestävyys (stamina)
const STAMINA_MAX := 100.0
const STAMINA_SPRINT_PER_SEC := 12.0
const STAMINA_JUMP := 10.0
const STAMINA_REGEN_PER_SEC := 18.0
const STAMINA_REGEN_DELAY := 1.0

# Terveys
const HEALTH_MAX := 100.0
const HEALTH_REGEN_PER_SEC := 1.5
const HEALTH_REGEN_DELAY := 6.0

# Kyykky
const CROUCH_EYE_HEIGHT := 1.08
const CROUCH_SPEED := 0.5

# Hiiri (src/player/input.js)
const MOUSE_SENSITIVITY := 0.0022
