class_name PlayerInput
extends RefCounted
## Yhden ruudun syöte pelaajalle (vastaa src/player/input.js:n käyttöä).
## Erillinen olio, jotta testit voivat syöttää liikkeitä ilman näppäimistöä:
## main.gd täyttää tämän Godotin Inputista, testi käsin.

var forward := false
var back := false
var left := false
var right := false
var sprint := false
var jump_pressed := false    # painettu tällä ruudulla (JS: input.pressed.has('Space'))
var crouch_pressed := false  # [Ctrl] tai [C], päälle/pois
var mouse_dx := 0.0          # pikseleinä
var mouse_dy := 0.0
var locked := true           # hiiri lukittu (JS: pointer lock)
var enabled := true          # pois päältä, kun valikko tai reppu on auki
var sensitivity := Config.MOUSE_SENSITIVITY
var invert_y := false


## Ruudun lopuksi: nollaa kertaluonteiset tapahtumat (JS: endFrame).
func end_frame() -> void:
	jump_pressed = false
	crouch_pressed = false
	mouse_dx = 0.0
	mouse_dy = 0.0
