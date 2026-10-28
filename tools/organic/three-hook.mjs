// Node-työkaluille: 'three' osoittaa repoon kopioituun three.js:ään.
export async function resolve(spec, ctx, next) {
  if (spec === 'three') return { url: new URL('../../vendor/three/three.module.min.js', import.meta.url).href, shortCircuit: true };
  return next(spec, ctx);
}
