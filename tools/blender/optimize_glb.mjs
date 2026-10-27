// Sessio 54: esine-GLB:n pakkaus (gltf-transform 4): kaksoiskappaleet pois,
// kvantisointi ja meshopt-pakkaus (purku pelissä: vendor/meshopt).
// Ajo: node optimize_glb.mjs <sisään.glb> <ulos.glb>
// Vaatii: npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const [inp, out] = process.argv.slice(2);
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inp);
await doc.transform(
  // Materiaalit erotetaan vain nimellä (kirjastoviite), joten niitä ei yhdistetä.
  dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH] }),
  // UV:t säilytetään, vaikka GLB:n materiaaleissa ei ole tekstuureja (ne tulevat pelin kirjastosta).
  prune({ keepAttributes: true }),
  // Pakkaus (EXT_meshopt_compression; pelissä vendor/meshopt). UV:t jäävät
  // liukuluvuiksi: toistuvien tekstuurien UV-arvot ovat yli välin 0..1.
  meshopt({ encoder: MeshoptEncoder, level: 'medium', pattern: /^(POSITION|NORMAL|COLOR_0)$/, quantizePosition: 14, quantizeNormal: 10, quantizeColor: 8 }),
);
await io.write(out, doc);
console.log('ok', out);
