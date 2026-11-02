// Node-moduulikoukut, joilla alkuperäinen src/player/player.js ajetaan Nodessa:
//  - 'three' → vendor/three (selaimessa import map hoitaa tämän),
//  - player.js:n maasto (world/terrain.js) → koemaasto test_terrain.mjs,
//    joka on sama kuin Godot-version scripts/test_terrain.gd.
const THREE_URL = new URL('../../../vendor/three/three.module.min.js', import.meta.url).href;
const STUB_URL = new URL('./test_terrain.mjs', import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier === 'three') return { url: THREE_URL, shortCircuit: true };
  if (specifier.endsWith('/world/terrain.js') && context.parentURL?.endsWith('/player/player.js')) {
    return { url: STUB_URL, shortCircuit: true };
  }
  return next(specifier, context);
}
