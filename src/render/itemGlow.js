// Sessio 22: rubiiniesineiden hehku. Malli kertoo hehkuvat osat
// (geometry.userData.glowGeo); niistä tehdään lisäävällä sekoituksella
// piirrettävä kuori, joka sykkii hitaasti.
import * as THREE from 'three';

export const glowMaterial = new THREE.MeshBasicMaterial({
  color: 0xff2a3c, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
});

// Lisää hehkukuoren meshin lapseksi (jos mallissa on hehkuvia osia).
export function attachGlow(mesh, material = glowMaterial) {
  const g = mesh.geometry && mesh.geometry.userData.glowGeo;
  if (!g) return null;
  const shell = new THREE.Mesh(g, material);
  shell.renderOrder = 2;
  shell.userData.isGlow = true;
  mesh.add(shell);
  return shell;
}

// Hidas sykintä (kutsutaan kerran ruudussa).
export function updateGlow(time) {
  glowMaterial.opacity = 0.32 + 0.18 * (0.5 + 0.5 * Math.sin(time * 2.1)) + 0.06 * Math.sin(time * 7.3);
}
