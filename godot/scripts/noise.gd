class_name SahelNoise
extends RefCounted
## Siemennetty satunnaisuus ja 2D-simplex-kohina.
## Käännös tiedostosta src/noise.js; tulosten pitää olla bitilleen samat kuin
## JS-versiossa, jotta sama siemen tuottaa saman maailman
## (testi: tests/run_tests.gd, vertailuarvot: tests/make_golden.mjs).
##
## Huom. JS laskee bittioperaatiot 32-bittisinä, GDScriptin int on 64-bittinen.
## Siksi kaikki pidetään välillä 0..2^32-1 (maski M) ja Math.imul
## emuloidaan funktiolla imul().

const M := 0xFFFFFFFF


## Math.imul: kertolaskun alimmat 32 bittiä (etumerkitön tulos).
## Jaetaan 16-bittisiin puolikkaisiin, ettei 64-bittinen int vuoda yli.
static func imul(a: int, b: int) -> int:
	a &= M
	b &= M
	var lo := (a * (b & 0xFFFF)) & M
	var hi := ((a * (b >> 16)) & 0xFFFF) << 16
	return (lo + hi) & M


## mulberry32: JS palauttaa funktion; täällä olio, jonka next() antaa luvun [0, 1).
class Mulberry32:
	extends RefCounted
	var _a: int

	func _init(seed: int) -> void:
		_a = seed & SahelNoise.M

	func next() -> float:
		_a = (_a + 0x6d2b79f5) & SahelNoise.M
		var t := _a
		t = SahelNoise.imul(t ^ (t >> 15), t | 1)
		t ^= (t + SahelNoise.imul(t ^ (t >> 7), t | 61)) & SahelNoise.M
		return float((t ^ (t >> 14)) & SahelNoise.M) / 4294967296.0


static func mulberry32(seed: int) -> Mulberry32:
	return Mulberry32.new(seed)


## Kokonaislukujen hajautus -> siemen (esim. chunkin koordinaateille).
## JS:n `n | 0` = luvun 32 alinta bittiä; negatiiviset toimivat samoin.
static func hash_seed(nums: Array) -> int:
	var h := 2166136261
	for n in nums:
		h = imul(h ^ (int(n) & M), 16777619)
		h ^= h >> 13
		h = imul(h, 0x5bd1e995)
		h ^= h >> 15
	return h & M


const GRAD3: Array[float] = [
	1, 1, -1, 1, 1, -1, -1, -1,
	1, 0, -1, 0, 1, 0, -1, 0,
	0, 1, 0, -1, 0, 1, 0, -1,
]
static var F2 := 0.5 * (sqrt(3.0) - 1.0)
static var G2 := (3.0 - sqrt(3.0)) / 6.0


## 2D-simplex-kohina (JS: createNoise2D palauttaa funktion noise2D).
class Noise2D:
	extends RefCounted
	var perm := PackedInt32Array()
	var perm_mod12 := PackedInt32Array()

	func _init(seed: int) -> void:
		var rand := SahelNoise.Mulberry32.new(seed)
		var p := PackedInt32Array()
		p.resize(256)
		for i in 256:
			p[i] = i
		for i in range(255, 0, -1):
			var j := int(floor(rand.next() * (i + 1)))
			var t := p[i]
			p[i] = p[j]
			p[j] = t
		perm.resize(512)
		perm_mod12.resize(512)
		for i in 512:
			perm[i] = p[i & 255]
			perm_mod12[i] = perm[i] % 12

	func sample(xin: float, yin: float) -> float:
		var F2 := SahelNoise.F2
		var G2 := SahelNoise.G2
		var g3 := SahelNoise.GRAD3
		var n0 := 0.0
		var n1 := 0.0
		var n2 := 0.0
		var s := (xin + yin) * F2
		var i := floorf(xin + s)
		var j := floorf(yin + s)
		var t := (i + j) * G2
		var x0 := xin - (i - t)
		var y0 := yin - (j - t)
		var i1 := 0
		var j1 := 0
		if x0 > y0:
			i1 = 1
		else:
			j1 = 1
		var x1 := x0 - i1 + G2
		var y1 := y0 - j1 + G2
		var x2 := x0 - 1.0 + 2.0 * G2
		var y2 := y0 - 1.0 + 2.0 * G2
		var ii := int(i) & 255
		var jj := int(j) & 255
		var t0 := 0.5 - x0 * x0 - y0 * y0
		if t0 >= 0.0:
			var g := perm_mod12[ii + perm[jj]] * 2
			t0 *= t0
			n0 = t0 * t0 * (g3[g] * x0 + g3[g + 1] * y0)
		var t1 := 0.5 - x1 * x1 - y1 * y1
		if t1 >= 0.0:
			var g := perm_mod12[ii + i1 + perm[jj + j1]] * 2
			t1 *= t1
			n1 = t1 * t1 * (g3[g] * x1 + g3[g + 1] * y1)
		var t2 := 0.5 - x2 * x2 - y2 * y2
		if t2 >= 0.0:
			var g := perm_mod12[ii + 1 + perm[jj + 1]] * 2
			t2 *= t2
			n2 = t2 * t2 * (g3[g] * x2 + g3[g + 1] * y2)
		return 70.0 * (n0 + n1 + n2)


static func create_noise_2d(seed: int) -> Noise2D:
	return Noise2D.new(seed)


## Fraktaalikohina (fBm), palauttaa noin välin [-1, 1].
static func fbm(noise: Noise2D, x: float, y: float, octaves := 4, lacunarity := 2.0, gain := 0.5) -> float:
	var sum := 0.0
	var amp := 1.0
	var freq := 1.0
	var norm := 0.0
	for o in octaves:
		sum += noise.sample(x * freq, y * freq) * amp
		norm += amp
		amp *= gain
		freq *= lacunarity
	return sum / norm


static func smoothstep_js(e0: float, e1: float, x: float) -> float:
	var t := minf(1.0, maxf(0.0, (x - e0) / (e1 - e0)))
	return t * t * (3.0 - 2.0 * t)
