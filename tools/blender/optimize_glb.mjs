// Sessio 54: esinemallien GLB:n pakkaus (gltf-transform + meshoptimizer).
// Ajo: node optimize_glb.mjs raw.glb assets/models/items/items.glb
// (riippuvuudet: @gltf-transform/core, /extensions, /functions, meshoptimizer).
// UV:t ovat metreissä / tekstuurin koko eivätkä mahdu välille 0..1, joten
// niitä ei kvantisoida; ne pyöristetään 1/1024 ruudun tarkkuuteen (alle
// puolikas tekseli 512 px tekstuurissa), mikä pakkaa ne paljon paremmin.
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const [inp, out] = process.argv.slice(2);
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': MeshoptDecoder,
});
const doc = await io.read(inp);
const UV_STEP = 1024;
const seen = new Set();
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const a = prim.getAttribute('TEXCOORD_0');
    if (!a || seen.has(a)) continue;
    seen.add(a);
    const arr = a.getArray();
    for (let i = 0; i < arr.length; i++) arr[i] = Math.round(arr[i] * UV_STEP) / UV_STEP;
  }
}
// Materiaalit eroavat vain nimeltään (pelin materiaalikirjasto), joten
// dedup ei saa yhdistää niitä; prune ei saa poistaa UV:itä (GLB:n
// materiaaleissa ei ole tekstuureja).
await doc.transform(
  dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH] }),
  prune({ keepAttributes: true }),
  meshopt({
    encoder: MeshoptEncoder, level: 'high', pattern: /^(POSITION|NORMAL|COLOR_0)$/,
    quantizePosition: 14, quantizeNormal: 10, quantizeColor: 8,
  }),
);
await io.write(out, doc);
console.log('ok', out);
