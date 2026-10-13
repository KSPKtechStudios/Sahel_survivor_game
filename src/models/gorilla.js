// Sessio 51: gorilla (käyttäjän antama malli: Sketchfab "Gorilla",
// planeta-elefante, CC-BY-4.0; assets/models/gorilla/gorilla.glb).
// Mallissa on valmis luuranko ja neljä animaatiota: idle (seisoo rystysillään),
// run (laukka), stomp (nousee ja lyö rintaansa) ja attack (lyönti). Kävely on
// laukka hidastettuna. Malli käännetään latauksessa katsomaan +Z-suuntaan
// (pään ja lantion luiden perusteella) ja skaalataan pelin kokoon.
// Tiedostoa on kevennetty: animaatioista turhat avainkehykset pois
// (gltf-transform resample), tekstuuri JPEG:ksi (1,29 Mt -> 0,49 Mt).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const URL = 'assets/models/gorilla/gorilla.glb';
// Pään laki rystysillä seisten (iso urosgorilla, n. 1,5 m).
export const GORILLA_HEIGHT = 1.5;

let template = null;
let loading = null;

export function gorillaReady() {
  return !!template;
}

export function loadGorilla() {
  if (!loading) {
    loading = new GLTFLoader().loadAsync(URL).then((gltf) => {
      const clips = {};
      for (const c of gltf.animations) clips[c.name.replace(/^gorilla/, '')] = c;
      const model = gltf.scene;
      // Mittaus lepoasennossa (idle, alku).
      const mixer = new THREE.AnimationMixer(model);
      if (clips.idle) mixer.clipAction(clips.idle).play();
      mixer.update(0);
      model.updateMatrixWorld(true);
      let head = null, pelvis = null, mesh = null;
      model.traverse((o) => {
        if (o.isBone && !head && /Head/.test(o.name) && !/Nub/.test(o.name)) head = o;
        if (o.isBone && !pelvis && /Pelvis/.test(o.name)) pelvis = o;
        if (o.isSkinnedMesh && !mesh) mesh = o;
      });
      if (!mesh || !head || !pelvis) throw new Error('gorilla: luut tai verkko puuttuu');
      const hp = head.getWorldPosition(new THREE.Vector3());
      const pp = pelvis.getWorldPosition(new THREE.Vector3());
      const yaw = Math.atan2(hp.x - pp.x, hp.z - pp.z); // kuono tähän suuntaan
      const box = new THREE.Box3().setFromObject(model, true);
      const size = box.getSize(new THREE.Vector3());
      const k = GORILLA_HEIGHT / Math.max(1e-6, size.y);
      // Kääre: kierto +Z:aan, koko ja jalat origoon (keskikohta lantion alle).
      const inner = new THREE.Group();
      inner.add(model);
      inner.rotation.y = -yaw;
      inner.scale.setScalar(k);
      inner.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(inner, true);
      const pw = pelvis.getWorldPosition(new THREE.Vector3());
      inner.position.set(-pw.x, -box2.min.y, -pw.z);
      const root = new THREE.Group();
      root.add(inner);
      mixer.stopAllAction();
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      template = {
        root, clips, material: mesh.material,
        info: { yaw: +yaw.toFixed(3), scale: +k.toFixed(2), size: size.toArray().map((v) => +(v * k).toFixed(2)) },
      };
      return template;
    }).catch((e) => {
      console.warn('Gorillaa ei voitu ladata', e);
      return null;
    });
  }
  return loading;
}

export function gorillaInfo() {
  return template && template.info;
}

// Uusi gorilla: oma luuranko, materiaali (osumavälähdys) ja animaatiomikseri.
export function makeGorilla() {
  if (!template) return null;
  const group = cloneSkinned(template.root);
  let mesh = null;
  group.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
  const material = template.material.clone();
  mesh.material = material;
  // Luut liikkuvat paljon (pystyyn nousu), joten ei rajausta.
  mesh.frustumCulled = false;
  const mixer = new THREE.AnimationMixer(group);
  const actions = {};
  for (const [name, clip] of Object.entries(template.clips)) actions[name] = mixer.clipAction(clip);
  for (const n of ['stomp', 'attack']) {
    if (!actions[n]) continue;
    actions[n].setLoop(THREE.LoopOnce, 1);
    actions[n].clampWhenFinished = true;
  }
  return { group, material, kind: 'gorilla', mixer, actions, cur: null };
}
