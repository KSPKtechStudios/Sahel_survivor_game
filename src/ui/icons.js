// Esineiden kuvakkeet piirretään samoista 3D-malleista kuin kädessä näkyvät
// esineet, joten kun malleja parannetaan, kuvakkeet päivittyvät itsestään.
import * as THREE from 'three';

const ICON_POSE = {
  rowboat: [0.45, 0.85, 0],
  sailboat: [0.25, 0.95, 0],
  ship: [0.18, 1.05, 0],
  stick: [0.3, 0, -0.8],
  stone: [0.5, 0.4, 0],
  fiber: [0.2, 0, -0.6],
  wood: [0.45, 0.5, 1.1],
  stone_axe: [0.2, -0.5, -0.75],
  stone_pick: [0.2, -0.5, -0.75],
  campfire: [0.55, 0.3, 0],
  gold_nugget: [0.6, 0.4, 0],
  cowrie: [0.7, 0.3, 0],
  bronze_bracelet: [0.3, 0.2, 0],
  wooden_club: [0.2, -0.5, -0.75],
  machete: [0.1, 0.3, -0.75],
  shield: [0.25, Math.PI + 0.35, 0.1],
  raw_meat: [0.6, 0.4, 0],
  hide: [0.7, 0.3, 0],
  clay: [0.5, 0.4, 0],
  // Pitkät esineet vinottain, jotta ne täyttävät kuvakkeen paremmin.
  bow: [0, 0.3, 0.75],
  sinew_bow: [0, 0.3, 0.75],
  spear: [0.2, -0.5, -0.75],
  hammer: [0.2, -0.5, -0.75],
  flint_axe: [0.2, -0.5, -0.75],
  flint_pick: [0.2, -0.5, -0.75],
  stone_knife: [0.2, -0.5, -0.75],
  torch: [0.2, -0.5, -0.75],
  arrow_wood: [0.2, 0, -0.75],
  arrow_bone: [0.2, 0, -0.75],
  arrow_flint: [0.2, 0, -0.75],
  reed: [0.2, 0, -0.75],
  bamboo: [0.2, 0, -0.75],
  fonio: [0.2, 0, -0.6],
  palm_leaf: [0.4, 0, -0.6],
  feather: [0.2, 0.4, -0.7],
  bone: [0.2, 0, -0.75],
};

export function renderItemIcons(itemGeometries, size = 96) {
  const icons = {};
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch {
    return icons;
  }
  renderer.setPixelRatio(1);
  renderer.setSize(size, size);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x5a4636, 1.8));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(-2, 3, 4);
  scene.add(key);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const box = new THREE.Box3();
  const center = new THREE.Vector3();
  const sz = new THREE.Vector3();

  for (const [id, geo] of Object.entries(itemGeometries)) {
    const mesh = new THREE.Mesh(geo, mat);
    const pose = ICON_POSE[id] || [0.3, 0.3, 0];
    mesh.rotation.set(pose[0], pose[1], pose[2]);
    scene.add(mesh);
    mesh.updateMatrixWorld(true);
    box.setFromObject(mesh);
    box.getCenter(center);
    box.getSize(sz);
    const r = Math.max(sz.x, sz.y, sz.z * 0.8) * 0.5;
    const dist = (r / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) * 1.18;
    // Isot mallit (purjelaiva): kameran syvyysalue mallin koon mukaan.
    cam.near = Math.max(0.01, dist * 0.02);
    cam.far = dist + sz.length() * 2 + 10;
    cam.updateProjectionMatrix();
    cam.position.set(center.x, center.y, center.z + dist + sz.z * 0.5);
    cam.lookAt(center);
    renderer.render(scene, cam);
    icons[id] = renderer.domElement.toDataURL('image/png');
    scene.remove(mesh);
  }
  mat.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return icons;
}
