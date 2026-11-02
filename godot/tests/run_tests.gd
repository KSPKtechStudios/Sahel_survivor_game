extends SceneTree
## Godot-version testit. Ajo projektikansiosta (godot/):
##   godot --headless -s res://tests/run_tests.gd
## Vertailuarvot tehdään alkuperäisestä JS-pelistä:  node godot/tests/make_golden.mjs
##
## 1. Kohina ja siemenet: bitilleen samat luvut kuin src/noise.js.
## 2. Koemaasto: sama korkeus kuin JS-kaksosella (tests/js/test_terrain.mjs).
## 3. Pelaaja: sama näppäinsarja kuin JS:n src/player/player.js:lle; tila
##    verrataan joka ruudulla (paikka, katse, kestävyys, kyykky, kamera, askeleet).
## 4. Näppäimet: projektin syötetoiminnot ovat olemassa oikeilla näppäimillä.
## 5. Nopeus: kohinan hinta GDScriptillä (tieto, ei läpäisyraja).

var _fails := 0
var _checks := 0


func _init() -> void:
	print("== Sahel Godot -testit ==")
	_test_noise()
	_test_terrain_twin()
	_test_player_trajectory()
	_test_input_map()
	_bench_noise()
	print("\n%d tarkistusta, %d virhettä" % [_checks, _fails])
	print("TULOS: " + ("OK" if _fails == 0 else "VIRHEITÄ"))
	quit(0 if _fails == 0 else 1)


func _check(ok: bool, msg: String) -> void:
	_checks += 1
	if not ok:
		_fails += 1
		print("  VIRHE: " + msg)


func _load_json(path: String) -> Variant:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		_check(false, "ei löydy: %s (aja node godot/tests/make_golden.mjs)" % path)
		return null
	return JSON.parse_string(f.get_as_text())


func _test_noise() -> void:
	var g: Dictionary = _load_json("res://tests/golden/noise.json")
	if g == null:
		return
	# mulberry32 antaa k / 2^32; verrataan kokonaislukuina k (bitilleen sama).
	var bad := 0
	var total := 0
	for m in g.mulberry:
		var r := SahelNoise.mulberry32(int(m.seed))
		for v in m.values:
			total += 1
			if roundi(r.next() * 4294967296.0) != roundi(float(v) * 4294967296.0):
				bad += 1
	_check(bad == 0, "mulberry32 poikkeaa %d / %d luvussa" % [bad, total])
	print("mulberry32: %d lukua, %s" % [total, "bitilleen samat" if bad == 0 else "POIKKEAA"])

	var hash_ok := true
	for h in g.hash:
		var got := SahelNoise.hash_seed(h.nums)
		if got != int(h.value):
			hash_ok = false
			_check(false, "hash_seed(%s) = %d, JS %d" % [h.nums, got, int(h.value)])
	_check(hash_ok, "hash_seed")
	print("hash_seed: %d tapausta %s" % [g.hash.size(), "samat" if hash_ok else "POIKKEAA"])

	var nd := 0.0
	var count := 0
	for set in g.noise:
		var n := SahelNoise.create_noise_2d(int(set.seed))
		for s in set.samples:
			nd = maxf(nd, absf(n.sample(s[0], s[1]) - float(s[2])))
			count += 1
	# JSONin desimaalimuunnos voi heittää viimeisen bitin; 1e-12 on käytännössä sama.
	_check(nd < 1e-12, "simplex-kohina poikkeaa (suurin ero %s)" % nd)
	print("simplex: %d pistettä, suurin ero %s" % [count, nd])

	var fd := 0.0
	var nf := SahelNoise.create_noise_2d(Config.SEED)
	for set in g.fbm:
		for s in set.samples:
			fd = maxf(fd, absf(SahelNoise.fbm(nf, s[0], s[1], int(set.octaves), float(set.lacunarity), float(set.gain)) - float(s[2])))
	_check(fd < 1e-12, "fbm poikkeaa (suurin ero %s)" % fd)
	print("fbm: suurin ero %s" % fd)


func _test_terrain_twin() -> void:
	var g: Dictionary = _load_json("res://tests/golden/player.json")
	if g == null:
		return
	var t := TestTerrain.new()
	var d := 0.0
	for s in g.terrain:
		d = maxf(d, absf(t.height_at(s[0], s[1]) - float(s[2])))
	_check(d < 1e-9, "koemaasto poikkeaa JS-kaksosesta (suurin ero %s)" % d)
	print("koemaasto: %d pistettä, suurin ero %s" % [g.terrain.size(), d])


func _test_player_trajectory() -> void:
	var g: Dictionary = _load_json("res://tests/golden/player.json")
	if g == null:
		return
	var player := Player.new()
	var cam := Camera3D.new()
	player.add_child(cam)
	player.camera = cam
	player.terrain = TestTerrain.new()
	var steps := [0]
	player.footstep.connect(func(_s: float) -> void: steps[0] += 1)
	player.teleport(0.0, 0.0)

	var input := PlayerInput.new()
	# Godotin desimaalijäsennys (JSON, to_float) ei ole tarkka viimeiseen bittiin:
	# "0.016666666666666666" != 1.0 / 60.0. Siksi aika-askel lasketaan tässä.
	var dt := 1.0 / 60.0
	_check(absf(float(g.dt) - dt) < 1e-15, "vertailuajon aika-askel ei ole 1/60")
	var worst := {"pos": 0.0, "look": 0.0, "stamina": 0.0, "cam": 0.0}
	var worst_frame := -1
	var first_off := -1
	var mismatch := ""
	for f in g.inputs.size():
		var r: Array = g.inputs[f]
		input.forward = r[0] == 1
		input.back = r[1] == 1
		input.left = r[2] == 1
		input.right = r[3] == 1
		input.sprint = r[4] == 1
		input.jump_pressed = r[5] == 1
		input.crouch_pressed = r[6] == 1
		input.mouse_dx = r[7]
		input.mouse_dy = r[8]
		player.update(dt, input)
		input.end_frame()
		var s: Array = g.states[f]
		var p := player.feet()
		var dp := sqrt(pow(p[0] - s[0], 2) + pow(p[1] - s[1], 2) + pow(p[2] - s[2], 2))
		if dp > worst.pos:
			worst.pos = dp
			worst_frame = f
		if dp > 1e-3 and first_off < 0:
			first_off = f
			print("  ensimmäinen ero > 1 mm ruudussa %d: Godot %s, JS (%.4f, %.4f, %.4f), kestävyys %.3f / %.3f, maassa %s / %s" % [f, p, s[0], s[1], s[2], player.stamina, s[5], player.on_ground, s[7]])
		worst.look = maxf(worst.look, maxf(absf(player.yaw - s[3]), absf(player.pitch - s[4])))
		worst.stamina = maxf(worst.stamina, absf(player.stamina - s[5]))
		worst.cam = maxf(worst.cam, maxf(absf(cam.position.y - s[9]), absf(cam.position.x - s[10])))
		if mismatch == "" and (int(player.on_ground) != int(s[7]) or int(player.crouching) != int(s[8]) or steps[0] != int(s[11])):
			mismatch = "ruutu %d: maassa %s/%s, kyykky %s/%s, askeleet %d/%d" % [f, player.on_ground, s[7], player.crouching, s[8], steps[0], s[11]]
	# Simulaatio on 64-bittinen kuten JS:ssä; vain kamera (Vector3) on 32-bittinen.
	_check(worst.pos < 1e-6, "paikka poikkeaa %.5f m (ruutu %d)" % [worst.pos, worst_frame])
	_check(worst.look < 1e-12, "katse poikkeaa %.6f rad" % worst.look)
	_check(worst.stamina < 1e-9, "kestävyys poikkeaa %.4f" % worst.stamina)
	_check(worst.cam < 0.002, "kamera (heilunta, kyykky) poikkeaa %.5f m" % worst.cam)
	_check(mismatch == "", "tila poikkeaa: " + mismatch)
	var last: Array = g.states[g.states.size() - 1]
	print("pelaaja: %d ruutua; suurin paikkaero %.6f m, katse %s rad, kestävyys %.4f, kamera %.6f m; loppu (%.2f, %.2f, %.2f), JS (%.2f, %.2f, %.2f)" % [
		g.inputs.size(), worst.pos, worst.look, worst.stamina, worst.cam,
		player.feet()[0], player.feet()[1], player.feet()[2], last[0], last[1], last[2]])
	player.free()


func _test_input_map() -> void:
	var want := {
		"move_forward": [KEY_W, KEY_UP], "move_back": [KEY_S, KEY_DOWN],
		"move_left": [KEY_A, KEY_LEFT], "move_right": [KEY_D, KEY_RIGHT],
		"sprint": [KEY_SHIFT], "jump": [KEY_SPACE], "crouch": [KEY_CTRL, KEY_C],
	}
	for action in want:
		if not InputMap.has_action(action):
			_check(false, "syötetoiminto puuttuu: " + action)
			continue
		var keys := []
		for e in InputMap.action_get_events(action):
			if e is InputEventKey:
				keys.append((e as InputEventKey).physical_keycode)
		for k in want[action]:
			_check(k in keys, "%s: näppäin %s puuttuu" % [action, OS.get_keycode_string(k)])
	print("näppäimet: %d toimintoa tarkistettu" % want.size())


func _bench_noise() -> void:
	var n := SahelNoise.create_noise_2d(Config.SEED)
	var t0 := Time.get_ticks_usec()
	var acc := 0.0
	var count := 100000
	for i in count:
		acc += n.sample(i * 0.37, i * -0.21)
	var us := float(Time.get_ticks_usec() - t0) / count
	print("nopeus: simplex GDScriptillä %.2f µs / näyte (%d näytettä, tarkiste %.3f)" % [us, count, acc])
