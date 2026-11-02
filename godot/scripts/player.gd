class_name Player
extends Node3D
## Pelaajan liikkuminen: kävely, juoksu, kyykky, hyppy, jyrkät seinät,
## kestävyys, terveys ja kameran heilunta.
## Käännös tiedostosta src/player/player.js (sama järjestys ja samat kaavat,
## jotta niitä voi verrata rivi riviltä).
##
## Solmun position = jalkojen kohta (JS: player.position).
## Kamera on lapsisolmu; sen paikka ja kierto lasketaan kuten JS:ssä.
## three.js ja Godot käyttävät samaa koordinaatistoa (oikeakätinen, Y ylös,
## eteen -Z) ja samaa kiertojärjestystä (YXZ), joten kulmat siirtyvät suoraan.
##
## Tarkkuus: simulaatio lasketaan 64-bittisillä luvuilla (_px, _vx …), kuten
## JS:ssä. Godotin Vector3 on 32-bittinen; sillä laskettuna jyrkän seinän
## "saako nousta" -päätös kääntyi välillä toisin päin ja reitti erkani
## alkuperäisestä (vertailutesti, ruutu 418). Solmun position ja velocity
## päivitetään 64-bittisistä arvoista.
##
## Ei vielä siirretty (tulevat myöhemmissä vaiheissa):
##  - uinti, vesi ja hukkuminen (vaatii oikean maaston ja aallot),
##  - törmäykset puihin ja kiviin (world.collidersNear) ja rakennetut lattiat,
##  - maailman reuna (edgeFactor), lentäminen [F3] ja veneet.

signal hurt(amount: float, cause: String)
signal died(cause: String)
signal footstep(strength: float)

const MAX_CLIMB := 1.25  # jyrkin käveltävä rinne (nousu / matka, n. 51°)

@export var camera: Camera3D

var terrain  # olio, jolla height_at(x, z) ja water_at(x, z) (TestTerrain nyt)

## Nopeus (m/s), luku 32-bittisenä. Simulaatio käyttää muuttujia _vx, _vy, _vz.
var velocity: Vector3:
	get:
		return Vector3(_vx, _vy, _vz)
	set(v):
		_vx = v.x
		_vy = v.y
		_vz = v.z

var yaw := 0.0
var pitch := 0.0
var on_ground := false
var in_water := 0  # 0 = kuiva, 1 = kahlaa, 2 = ui (vesi siirretään myöhemmin)
var stamina := Config.STAMINA_MAX
var stamina_delay := 0.0
var sprinting := false
var bob_phase := 0.0
var bob_amount := 0.0
var land_dip := 0.0
var speed_now := 0.0
var speed_mul := 1.0  # esim. sademetsän tiheä aluskasvillisuus hidastaa
# Terveys ja taistelu
var health := Config.HEALTH_MAX
var health_delay := 0.0
var max_health := Config.HEALTH_MAX
var max_stamina := Config.STAMINA_MAX
var dead := false
var death_cause := ""
var death_t := 0.0
var move_mul := 1.0        # taistelu: torjunta ja isku hidastavat
var stamina_regen_mul := 1.0
var survival_health_mul := 1.0
var survival_stamina_mul := 1.0
var hurt_kick := 0.0       # kameran nytkähdys osumasta
var hurt_roll := 0.0
# Kyykky
var crouching := false
var crouch_blend := 0.0
# Kehittäjätyökalut
var god := false
var speed_boost := 1.0

# 64-bittinen tila: paikka (jalat), nopeus ja tönäisy (vaimenee itsestään).
var _px := 0.0
var _py := 0.0
var _pz := 0.0
var _vx := 0.0
var _vy := 0.0
var _vz := 0.0
var _kx := 0.0
var _kz := 0.0
# Katseen suunta vaakatasossa (eteen ja oikealle).
var _fx := 0.0
var _fz := -1.0
var _rx := 1.0
var _rz := 0.0
var _ground_prev = null  # float tai null (JS: undefined)
var _step_n = null


func use_stamina(amount: float) -> bool:
	if god:
		return true
	amount *= 0.88  # sessio 18: kaikki kertakulutus (iskut, hypyt) hieman pienempi
	if stamina < amount * 0.5:
		return false
	stamina = maxf(0.0, stamina - amount)
	stamina_delay = Config.STAMINA_REGEN_DELAY
	return true


## Vahinko. opts: { cause, from_x, from_z, knock, up }
func take_hurt(amount: float, opts := {}) -> void:
	if dead or amount <= 0.0 or god:
		return
	health = maxf(0.0, health - amount)
	health_delay = Config.HEALTH_REGEN_DELAY
	hurt_kick = minf(0.09, 0.025 + amount * 0.003)
	hurt_roll = (-1.0 if randf() < 0.5 else 1.0) * hurt_kick * 0.8
	if opts.has("from_x") and opts.get("knock", 0.0):
		push(_px - opts.from_x, _pz - opts.from_z, opts.knock, opts.get("up", 0.0))
	var cause: String = opts.get("cause", "")
	hurt.emit(amount, cause)
	if health <= 0.0:
		die(cause)


## Tönäisy suuntaan (dx, dz) voimalla (m/s); up = pieni hypähdys.
func push(dx: float, dz: float, strength: float, up := 0.0) -> void:
	var length := sqrt(dx * dx + dz * dz)
	if length == 0.0:
		length = 1.0
	_kx += (dx / length) * strength
	_kz += (dz / length) * strength
	if up > 0.0 and in_water < 2:
		_vy = maxf(_vy, up)
		on_ground = false


func die(cause: String) -> void:
	if dead:
		return
	dead = true
	death_cause = cause
	death_t = 0.0
	crouching = false
	died.emit(cause)


func respawn(x: float, z: float) -> void:
	dead = false
	death_t = 0.0
	health = Config.HEALTH_MAX
	stamina = Config.STAMINA_MAX
	health_delay = 0.0
	_kx = 0.0
	_kz = 0.0
	teleport(x, z)


func update(dt: float, input: PlayerInput) -> void:
	var alive := not dead
	# --- Katse
	if input.locked and input.enabled and alive:
		yaw -= input.mouse_dx * input.sensitivity
		pitch -= input.mouse_dy * input.sensitivity * (-1.0 if input.invert_y else 1.0)
		pitch = clampf(pitch, -1.55, 1.55)

	# --- Liikkumissuunta
	_fx = -sin(yaw)
	_fz = -cos(yaw)
	_rx = cos(yaw)
	_rz = -sin(yaw)
	var wx := 0.0
	var wz := 0.0
	if alive and input.enabled:
		if input.forward:
			wx += _fx
			wz += _fz
		if input.back:
			wx -= _fx
			wz -= _fz
		if input.right:
			wx += _rx
			wz += _rz
		if input.left:
			wx -= _rx
			wz -= _rz
	var wl2 := wx * wx + wz * wz
	var moving := wl2 > 0.0
	if moving:
		var wl := sqrt(wl2)
		wx /= wl
		wz /= wl

	# Kyykky [Ctrl] tai [C] (päälle/pois). Juoksu tai hyppy nostaa ylös.
	if alive and input.enabled and input.crouch_pressed:
		crouching = not crouching and in_water < 2
	if in_water == 2:
		crouching = false

	var want_sprint := input.sprint and input.enabled and moving and alive
	sprinting = want_sprint and stamina > 1.0 and in_water < 2 and move_mul > 0.9
	if sprinting:
		crouching = false
		stamina = maxf(0.0, stamina - Config.STAMINA_SPRINT_PER_SEC * dt)
		stamina_delay = Config.STAMINA_REGEN_DELAY

	var speed := Config.SPRINT_SPEED if sprinting else Config.WALK_SPEED
	speed *= speed_mul * move_mul * speed_boost
	if crouching: speed *= Config.CROUCH_SPEED
	if in_water == 1: speed *= 0.7
	if in_water == 2: speed *= 0.5 if stamina > 0.0 else 0.35

	# --- Kiihtyvyys
	var accel := 14.0 if (on_ground or in_water) else 2.5
	var tvx := wx * speed
	var tvz := wz * speed
	var k := 1.0 - exp(-accel * dt)
	_vx += (tvx - _vx) * k
	_vz += (tvz - _vz) * k

	# --- Hyppy ja painovoima
	if input.jump_pressed and input.enabled and alive and on_ground and in_water < 2:
		if crouching:
			crouching = false
		elif use_stamina(Config.STAMINA_JUMP):
			_vy = Config.JUMP_SPEED
			on_ground = false
	if in_water < 2:
		_vy -= Config.GRAVITY * dt

	# --- Liike (törmäykset puihin ja kiviin siirretään myöhemmin)
	var ox := _px
	var oz := _pz
	_px += (_vx + _kx) * dt
	_pz += (_vz + _kz) * dt
	_py += _vy * dt
	var kd := exp(-dt * (9.0 if in_water else 6.0))
	_kx *= kd
	_kz *= kd

	# --- Maa
	var wq: Dictionary = terrain.water_at(_px, _pz)
	# Sessio 58: jyrkkä kallioseinä pysäyttää. Yli n. 51° nousu seinää päin
	# perutaan, ja pelaaja liukuu seinän suuntaisesti; loivat rinteet käyvät.
	var run := sqrt((_px - ox) * (_px - ox) + (_pz - oz) * (_pz - oz))
	if _ground_prev != null and run > 1e-5 and run < 3.0 and wq.h > _py + 0.02 and wq.h - _ground_prev > run * MAX_CLIMB:
		var e := 0.4
		var gx: float = terrain.height_at(_px + e, _pz) - terrain.height_at(_px - e, _pz)
		var gz: float = terrain.height_at(_px, _pz + e) - terrain.height_at(_px, _pz - e)
		var gl := sqrt(gx * gx + gz * gz)
		if gl == 0.0:
			gl = 1.0
		var nx := gx / gl
		var nz := gz / gl
		var dx := _px - ox
		var dz := _pz - oz
		var into := dx * nx + dz * nz
		if into > 0.0:
			dx -= nx * into
			dz -= nz * into
		_px = ox + dx
		_pz = oz + dz
		var vin := _vx * nx + _vz * nz
		if vin > 0.0:
			_vx -= nx * vin
			_vz -= nz * vin
		wq = terrain.water_at(_px, _pz)
		if wq.h > _py + 0.02 and wq.h - _ground_prev > sqrt(dx * dx + dz * dz) * MAX_CLIMB + 0.01:
			_px = ox
			_pz = oz
			wq = terrain.water_at(_px, _pz)
	_ground_prev = wq.h
	var ground: float = wq.h

	if _py <= ground:
		if not on_ground and _vy < -6.0:
			land_dip = minf(0.18, -_vy * 0.015)
		# Alastulo hypystä tai pudotuksesta: askeleen ääni (voimakkaampi).
		if not on_ground and _vy < -3.5:
			footstep.emit(minf(1.6, -_vy / 6.0))
		_py = ground
		_vy = 0.0
		on_ground = true
	else:
		# Pysy kiinni maassa alamäessä.
		on_ground = on_ground and _py - ground < 0.35 and _vy <= 0.0
		if on_ground:
			_py = ground

	_post(dt, alive)


## Kestävyys, terveys ja kamera (joka ruudulla lopuksi).
func _post(dt: float, alive: bool) -> void:
	# --- Kestävyyden ja terveyden palautuminen
	if god and alive:
		stamina = max_stamina
		health = max_health
	if stamina_delay > 0.0:
		stamina_delay -= dt
	else:
		stamina = minf(max_stamina, stamina + Config.STAMINA_REGEN_PER_SEC * stamina_regen_mul * survival_stamina_mul * dt)
	if alive:
		if health_delay > 0.0:
			health_delay -= dt
		elif health < max_health:
			health = minf(max_health, health + Config.HEALTH_REGEN_PER_SEC * survival_health_mul * dt)
	else:
		death_t += dt

	# --- Pään heilunta
	var hs := sqrt(_vx * _vx + _vz * _vz)
	speed_now = hs
	var bob_target := minf(1.0, hs / Config.WALK_SPEED) if (on_ground and hs > 0.5) else 0.0
	bob_amount += (bob_target - bob_amount) * minf(1.0, dt * 8.0)
	bob_phase += hs * dt * 1.9
	# Askel joka puolikkaalla heiluntajaksolla (pää alimmillaan = jalka maahan).
	var step_n := int(floor((bob_phase + PI * 0.75) / PI))
	if step_n != _step_n:
		_step_n = step_n
		if (on_ground or in_water == 1) and hs > 1.0 and not dead:
			footstep.emit(1.25 if sprinting else (0.35 if crouching else 0.8))
	land_dip *= exp(-dt * 8.0)

	# Kyykky laskee silmien korkeutta pehmeästi; kuollessa kamera kaatuu maahan.
	crouch_blend += ((1.0 if crouching else 0.0) - crouch_blend) * minf(1.0, dt * 10.0)
	var eye_h := Config.EYE_HEIGHT + (Config.CROUCH_EYE_HEIGHT - Config.EYE_HEIGHT) * crouch_blend
	var roll := 0.0
	if dead:
		var k := 1.0 - exp(-death_t * 3.0)
		eye_h += (0.32 - eye_h) * (0.25 if in_water == 2 else k)
		roll = 0.55 * k
	var bob_k := 0.6 if crouching else 1.0
	var bob_y := sin(bob_phase * 2.0) * 0.045 * bob_amount * bob_k
	var bob_x := cos(bob_phase) * 0.03 * bob_amount * bob_k
	hurt_kick *= exp(-dt * 9.0)
	hurt_roll *= exp(-dt * 7.0)

	position = Vector3(_px, _py, _pz)
	if camera:
		# Kamera on pelaajan lapsi, joten paikka on suhteessa jalkoihin.
		camera.position = Vector3(_rx * bob_x, eye_h + bob_y - land_dip, _rz * bob_x)
		camera.rotation = Vector3(pitch + hurt_kick, yaw, roll + hurt_roll)


## Jalkojen paikka 64-bittisenä (testit ja tallennus).
func feet() -> Array[float]:
	return [_px, _py, _pz]


## Silmien paikka maailmassa (JS: player.eye = kameran paikka).
func eye() -> Vector3:
	return camera.global_position if camera else position + Vector3(0, Config.EYE_HEIGHT, 0)


func teleport(x: float, z: float) -> void:
	var w: Dictionary = terrain.water_at(x, z)
	# Syvään veteen siirtyessä ollaan heti pinnalla.
	var y: float = w.wl - 1.25 if w.wl - w.h > 1.25 else w.h + 0.1
	_px = x
	_py = y
	_pz = z
	_vx = 0.0
	_vy = 0.0
	_vz = 0.0
	position = Vector3(_px, _py, _pz)


func serialize() -> Dictionary:
	return {"x": _px, "y": _py, "z": _pz, "yaw": yaw, "pitch": pitch, "hp": round(health * 10.0) / 10.0}
