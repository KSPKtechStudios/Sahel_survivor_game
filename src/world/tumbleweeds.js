// Tuulen mukana vierivät arokierijät (tumbleweed). Niitä on vain pelaajan
// lähellä: uusia syntyy tuulen yläpuolelle ja kaukana olevat poistetaan.
// Sessio 58: malli ja loikat käyttäjän antamasta mallista ja animaatiosta
// (models/arokierija.js); vanha risupallo jää varalle ja sirpaleiksi.
// Sessio 10: vain aavikolla (dyynit, pöytävuoret) ja punaisella
// laterittitasangolla; veteen vierinyt uppoaa, ja kasvillisuuteen
// (muut biomit) vierinyt jää kiinni ja katoaa.
import * as THREE from 'three';
import { sampleTerrain, waterAt } from './terrain.js';
import { arokierijaAsset, arokierijaHop, AROKIERIJA_RPS } from '../models/arokierija.js';

const _wq = {};

const MAX = 10;
// Kuiva, karu maa: aavikko, dyynit, laterittitasanko ja vuoristo (sessio 12;
// ei keitaita).
function habitat(s) {
  return s.desert + s.dunes + s.laterite + s.mountains + s.mesa * 0.5 - s.oasis * 2;
}
const _axis = new THREE.Vector3();
const _q = new THREE.Quaternion();

export class Tumbleweeds {
  constructor(scene, geometry, material) {
    this.scene = scene;
    // Vanha risupallo: varamalli ja hakatessa lentävät risut (sirpaleiksi
    // tarvitaan verteksivärit, joita kuvatekstuurimallissa ei ole).
    this.shatterGeo = geometry;
    const a = arokierijaAsset();
    this.geometry = a ? a.geometry : geometry;
    this.material = a ? a.material : material;
    this.list = [];
    this.spawnTimer = 0;
    this._s = {};
  }

  // Tuulen voimakkuus 0..1 ja suunta (Vector2).
  update(dt, player, wind, windDir) {
    this.spawnTimer -= dt;
    const target = Math.round(MAX * (0.35 + wind * 0.65));
    if (this.spawnTimer <= 0 && this.list.length < target) {
      this.spawnTimer = 1.5 + Math.random() * 3;
      this._spawn(player, windDir, this.list.length < 3);
    }

    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      const speed = (0.6 + wind * 7.5) * tw.speedMul;
      // Kiihdy kohti tuulen nopeutta, vähän sivuttaisheiluntaa.
      tw.phase += dt;
      const side = Math.sin(tw.phase * 0.7 + tw.seed) * 0.35;
      const tx = (windDir.x - windDir.y * side) * speed;
      const tz = (windDir.y + windDir.x * side) * speed;
      tw.vx += (tx - tw.vx) * Math.min(1, dt * 1.5);
      tw.vz += (tz - tw.vz) * Math.min(1, dt * 1.5);

      const g = 14;
      tw.vy -= g * dt;
      const p = tw.mesh.position;
      p.y -= tw.hopY; // loikka on pelkkä näkyvä siirto fysiikan päällä
      p.x += tw.vx * dt;
      p.z += tw.vz * dt;
      p.y += tw.vy * dt;
      const wq = waterAt(p.x, p.z, _wq);
      const ground = Math.max(wq.h, wq.wl) + tw.radius;
      if (p.y <= ground) {
        p.y = ground;
        tw.vy = 0;
      }
      // Loikat animaation käyrästä: tahti seuraa vauhtia, ja korkeus kasvaa
      // vauhdin neliönä (hiljaisella tuulella vain töyssyjä), enintään kuten
      // animaatiossa (noin säteen korkuisia loikkia).
      const hs = Math.hypot(tw.vx, tw.vz);
      const rel = hs / (AROKIERIJA_RPS * tw.radius);
      tw.hopT += dt * Math.min(1.6, Math.max(0.25, rel));
      tw.hopY = arokierijaHop(tw.hopT) * tw.radius * Math.min(1, rel * rel) * tw.hopK * (tw.sink > 0 ? 0 : 1);
      p.y += tw.hopY;
      // Pyörimisliike vierimisen mukaan.
      if (hs > 0.01) {
        _axis.set(tw.vz, 0, -tw.vx).normalize();
        _q.setFromAxisAngle(_axis, (hs * dt) / tw.radius);
        tw.mesh.quaternion.premultiply(_q);
      }

      // Vesi ja biomi tarkistetaan harvakseltaan: vedessä uppoaa, muualla
      // (kasvillisuuteen) juuttuu ja katoaa.
      if (tw.sink > 0) {
        tw.sink += dt;
        p.y -= dt * 0.6;
        tw.mesh.scale.setScalar(tw.scale * Math.max(0.05, 1 - tw.sink / 1.6));
        tw.vx *= Math.exp(-dt * 3);
        tw.vz *= Math.exp(-dt * 3);
        if (tw.sink > 1.6) { this._remove(i); continue; }
      } else {
        tw.check -= dt;
        if (tw.check <= 0) {
          tw.check = 0.4;
          const s = sampleTerrain(p.x, p.z, this._s);
          if (s.wl > s.h + 0.05 || habitat(s) < 0.15) tw.sink = 0.001;
        }
      }
      const dx = p.x - player.x;
      const dz = p.z - player.z;
      if (dx * dx + dz * dz > 110 * 110) this._remove(i);
    }
  }

  _spawn(player, windDir, nearby) {
    // Ensimmäiset lähelle, muut tuulen yläpuolelle.
    const dist = nearby ? 12 + Math.random() * 25 : 45 + Math.random() * 35;
    const side = (Math.random() - 0.5) * 70;
    const x = player.x - windDir.x * dist - windDir.y * side;
    const z = player.z - windDir.y * dist + windDir.x * side;
    const s = sampleTerrain(x, z, this._s);
    if (s.h < s.wl + 0.2 || s.plateau > 0.5 || habitat(s) < 0.5) return;
    const mesh = new THREE.Mesh(this.geometry, this.material);
    const scale = 0.75 + Math.random() * 0.45;
    mesh.scale.setScalar(scale);
    mesh.castShadow = true;
    mesh.position.set(x, s.h + 0.5 * scale, z);
    mesh.quaternion.setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    this.scene.add(mesh);
    this.list.push({
      mesh,
      radius: 0.5 * scale,
      vx: 0,
      vy: 0,
      vz: 0,
      phase: 0,
      seed: Math.random() * 10,
      speedMul: 0.75 + Math.random() * 0.5,
      scale,
      sink: 0,
      check: 0.4,
      hopT: Math.random() * 10,
      hopY: 0,
      hopK: 0.7 + Math.random() * 0.4,
      type: 'tumbleweed',
    });
  }

  _remove(i) {
    const tw = this.list[i];
    this.scene.remove(tw.mesh);
    this.list.splice(i, 1);
  }

  clear() {
    for (const tw of this.list) this.scene.remove(tw.mesh);
    this.list = [];
  }

  remove(tw) {
    const i = this.list.indexOf(tw);
    if (i >= 0) this._remove(i);
  }

  raycast(origin, dir, maxDist) {
    let best = null;
    const oc = new THREE.Vector3();
    for (const tw of this.list) {
      oc.subVectors(tw.mesh.position, origin);
      const r = tw.radius + 0.15;
      const tca = oc.dot(dir);
      if (tca < -r) continue;
      const d2 = oc.lengthSq() - tca * tca;
      if (d2 > r * r) continue;
      const t = Math.max(0, tca - Math.sqrt(r * r - d2));
      if (t <= maxDist && (!best || t < best.t)) best = { obj: tw, t };
    }
    return best;
  }
}
