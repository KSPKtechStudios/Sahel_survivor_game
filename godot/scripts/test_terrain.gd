class_name TestTerrain
extends RefCounted
## VÄLIAIKAINEN koemaasto Godot-siirron ensimmäiseen vaiheeseen.
## Tämä EI ole pelin oikea maasto (src/world/terrain.js); se siirretään omana
## askeleenaan. Rajapinta on sama kuin oikeassa: height_at(x, z) ja
## water_at(x, z), jotta pelaajan koodi ei muutu, kun maasto vaihtuu.
##
## Koemaastossa on loivia kumpuja (siirretyllä kohinalla) ja yksi jyrkkä
## kalliotasanne pohjoisessa, jolla testataan, ettei jyrkkää seinää voi
## kävellä ylös (pelaajan MAX_CLIMB).

const MESA_X := 0.0
const MESA_Z := -40.0   # -z = pohjoinen (kuten JS-pelissä)
const MESA_R := 12.0
const MESA_H := 5.0

var _n1: SahelNoise.Noise2D
var _n2: SahelNoise.Noise2D


func _init(seed: int = Config.SEED) -> void:
	_n1 = SahelNoise.create_noise_2d(seed)
	_n2 = SahelNoise.create_noise_2d(seed + 1)


func height_at(x: float, z: float) -> float:
	var h := SahelNoise.fbm(_n1, x / 220.0, z / 220.0, 4) * 6.0
	h += SahelNoise.fbm(_n2, x / 45.0, z / 45.0, 2) * 0.5
	# Jyrkkäreunainen tasanne: seinä noin 1,2 m leveä (kaltevuus yli 4:1).
	var d := sqrt((x - MESA_X) * (x - MESA_X) + (z - MESA_Z) * (z - MESA_Z))  # double-tarkkuus (Vector2 on 32-bittinen)
	h += SahelNoise.smoothstep_js(MESA_R + 0.6, MESA_R - 0.6, d) * MESA_H
	return h


## Värin vaihtelu 0..1 (kuiva heinä / lateriitti); vain koemaaston ulkoasuun.
func tint_at(x: float, z: float) -> float:
	return clampf(0.5 + SahelNoise.fbm(_n2, x / 14.0 + 300.0, z / 14.0, 3) * 0.9, 0.0, 1.0)


## Sama muoto kuin terrain.js:n waterAt: koemaastossa ei ole vettä.
func water_at(x: float, z: float) -> Dictionary:
	return {"h": height_at(x, z), "wl": -INF, "type": 0}
