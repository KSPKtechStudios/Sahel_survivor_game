extends Node3D
## Godot-kokeen pääskripti (vaihe 1): koemaasto, pelaaja, hiiren lukitus ja
## yksinkertainen tietoruutu.
##
## Hiiri: klikkaa ruutua → hiiri lukitaan. [Esc] vapauttaa.
## Liikkuminen kuten JS-pelissä: WASD/nuolet, [Shift] juoksu, [Välilyönti]
## hyppy, [Ctrl] tai [C] kyykky (päälle/pois).
##
## Komentorivin lisävalinnat (pilvitestit ilman ihmistä), annetaan "--":n jälkeen:
##   --autopilot      kävelee, juoksee ja hyppää ennalta määrätysti (kiinteä 1/60 s askel)
##   --shots=<kansio> tallentaa autopilotin aikana kuvakaappaukset ja lopettaa

@onready var player: Player = $Player
@onready var ground: Node3D = $Ground
@onready var info: Label = $HUD/Info
@onready var hint: Label = $HUD/Hint

var terrain: TestTerrain
var input := PlayerInput.new()
var steps := 0

## Testeille: hiiren liike käännetään, vaikka hiirtä ei ole lukittu
## (ilman näyttöä lukitusta ei voi tehdä).
var force_mouse_look := false

var _autopilot := false
var _shots_dir := ""
var _sim_t := 0.0
var _shots_taken := {}


func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg == "--autopilot":
			_autopilot = true
		elif arg.begins_with("--shots="):
			_shots_dir = arg.substr(8)
			_autopilot = true

	terrain = TestTerrain.new()
	player.terrain = terrain
	player.footstep.connect(func(_s: float) -> void: steps += 1)

	var t0 := Time.get_ticks_msec()
	_build_ground(2)  # 5 × 5 chunkia = 320 m × 320 m
	print("Maasto rakennettu: %d ms" % (Time.get_ticks_msec() - t0))

	player.teleport(0.0, 0.0)
	player.yaw = 0.0  # katse pohjoiseen (-z), kohti koetasannetta


func _build_ground(radius: int) -> void:
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.vertex_color_is_srgb = true
	mat.roughness = 0.95
	for cz in range(-radius, radius + 1):
		for cx in range(-radius, radius + 1):
			var mi := MeshInstance3D.new()
			mi.name = "Chunk_%d_%d" % [cx, cz]
			mi.mesh = _chunk_mesh(cx, cz)
			mi.material_override = mat
			ground.add_child(mi)


## Yksi maastochunk (JS: CONFIG.chunkSize 64 m, chunkSegments 48).
## Normaalit lasketaan korkeuksista reunan yli, jotta chunkien välille ei
## tule saumoja.
func _chunk_mesh(cx: int, cz: int) -> ArrayMesh:
	var n := Config.CHUNK_SEGMENTS
	var size := Config.CHUNK_SIZE
	var step := size / n
	var x0 := cx * size - size * 0.5
	var z0 := cz * size - size * 0.5
	var w := n + 3  # yksi ylimääräinen rivi joka reunalla normaaleja varten
	var hs := PackedFloat32Array()
	hs.resize(w * w)
	for j in w:
		for i in w:
			hs[j * w + i] = terrain.height_at(x0 + (i - 1) * step, z0 + (j - 1) * step)

	var verts := PackedVector3Array()
	var normals := PackedVector3Array()
	var colors := PackedColorArray()
	var idx := PackedInt32Array()
	var laterite := Color(0.58, 0.36, 0.22)
	var grass := Color(0.66, 0.58, 0.34)
	var rock := Color(0.45, 0.38, 0.31)
	for j in n + 1:
		for i in n + 1:
			var k := (j + 1) * w + (i + 1)
			var h := hs[k]
			var x := x0 + i * step
			var z := z0 + j * step
			verts.append(Vector3(x, h, z))
			var nrm := Vector3(hs[k - 1] - hs[k + 1], 2.0 * step, hs[k - w] - hs[k + w]).normalized()
			normals.append(nrm)
			# Väri: kuivaa heinää ja punaista lateriittia vuorotellen, jyrkät kohdat kalliota.
			var g := terrain.tint_at(x, z)
			var c := laterite.lerp(grass, g)
			c = c.lerp(rock, clampf((1.0 - nrm.y) * 4.0, 0.0, 1.0))
			colors.append(c)
	for j in n:
		for i in n:
			var a := j * (n + 1) + i
			var b := a + 1
			var c2 := a + (n + 1)
			var d := c2 + 1
			idx.append_array([a, b, c2, b, d, c2])

	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_NORMAL] = normals
	arrays[Mesh.ARRAY_COLOR] = colors
	arrays[Mesh.ARRAY_INDEX] = idx
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return mesh


## Hiiren liike luetaan _input-vaiheessa, ennen käyttöliittymää: lukitussa
## tilassa kursori on ruudun keskellä, ja sessiossa 61 keskellä ollut tähtäin
## nieli liikkeen, eikä hiiri kääntänyt katsetta (testi: run_tests.gd).
func _input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and _mouse_look():
		var mm := event as InputEventMouseMotion
		# Suodata satunnaiset valtavat hypyt (kuten JS-versiossa).
		if absf(mm.relative.x) <= 400.0 and absf(mm.relative.y) <= 400.0:
			input.mouse_dx += mm.relative.x
			input.mouse_dy += mm.relative.y


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	elif event.is_action_pressed("ui_cancel"):
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


func _mouse_look() -> bool:
	return force_mouse_look or Input.mouse_mode == Input.MOUSE_MODE_CAPTURED


func _process(delta: float) -> void:
	var dt := minf(0.05, delta)
	if _autopilot:
		dt = 1.0 / 60.0
		_sim_t += dt
		_drive_autopilot()
	else:
		input.locked = _mouse_look()
		input.forward = Input.is_action_pressed("move_forward")
		input.back = Input.is_action_pressed("move_back")
		input.left = Input.is_action_pressed("move_left")
		input.right = Input.is_action_pressed("move_right")
		input.sprint = Input.is_action_pressed("sprint")
		input.jump_pressed = input.jump_pressed or Input.is_action_just_pressed("jump")
		input.crouch_pressed = input.crouch_pressed or Input.is_action_just_pressed("crouch")
	player.update(dt, input)
	input.end_frame()
	_update_hud()


func _update_hud() -> void:
	var p := player.position
	var state := "kyykyssä" if player.crouching else ("juoksee" if player.sprinting else ("ilmassa" if not player.on_ground else "maassa"))
	info.text = "FPS %d\nx %.1f  y %.2f  z %.1f\nnopeus %.2f m/s  (%s)\nkestävyys %d / %d\nterveys %d / %d\naskeleita %d" % [
		Engine.get_frames_per_second(), p.x, p.y, p.z, player.speed_now, state,
		roundi(player.stamina), roundi(player.max_stamina), roundi(player.health), roundi(player.max_health), steps]
	hint.visible = not _autopilot and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED


## Ennalta määrätty ajo pilvitestejä varten (simuloitu aika, ei oikea kello).
func _drive_autopilot() -> void:
	var t := _sim_t
	input.locked = true
	input.forward = t > 0.5 and t < 7.0
	input.sprint = t > 4.0 and t < 7.0
	if absf(t - 5.0) < 0.5 / 60.0:
		input.jump_pressed = true
	# Käännös oikealle 7,5–8 s (≈ 90°: 714 px × 0,0022 rad/px).
	if t > 7.5 and t <= 8.0:
		input.mouse_dx = 714.0 / 30.0
	if _shots_dir != "":
		for shot_t in [0.4, 3.0, 7.2, 8.5]:
			if t >= shot_t and not _shots_taken.has(shot_t):
				_shots_taken[shot_t] = true
				_save_shot("%s/shot_%04.1f.png" % [_shots_dir, shot_t])
		if t > 8.7:
			print("Autopilotti valmis: %s" % JSON.stringify(player.serialize()))
			get_tree().quit()


func _save_shot(path: String) -> void:
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png(path)
	print("Kuva: %s  (pelaaja %s, kestävyys %.1f)" % [path, player.position, player.stamina])
