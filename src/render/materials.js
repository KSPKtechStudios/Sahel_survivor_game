// Jaetut materiaalit ja tuulen huojunta (vertex shader -lisäys).
import * as THREE from 'three';

// Kaikki tuulta käyttävät materiaalit jakavat nämä uniformit.
export const windUniforms = {
  uTime: { value: 0 },
  uWindDir: { value: new THREE.Vector2(-0.7071, 0.7071) }, // harmattan koillisesta
  uWindStrength: { value: 0.3 },
};

// amount: kuinka paljon taipuu suhteessa korkeuteen (y^2).
// flutter: nopean lepatuksen osuus. Korkeille kasveille (bambu) pieni, sillä
// pisteittäin vaihteleva lepatus sai pitkät varret värisemään.
export function addWind(material, amount, flutter = 1) {
  const uAmount = { value: amount };
  const uFlutter = { value: flutter };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uWindDir = windUniforms.uWindDir;
    shader.uniforms.uWindStrength = windUniforms.uWindStrength;
    shader.uniforms.uWindAmount = uAmount;
    shader.uniforms.uFlutter = uFlutter;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
uniform float uWindAmount;
uniform float uFlutter;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
#ifdef USE_INSTANCING
{
  vec3 instPos = instanceMatrix[3].xyz;
  float hh = max(position.y, 0.0);
  float ph = uTime * (1.3 + uWindStrength * 2.5) + instPos.x * 0.21 + instPos.z * 0.17;
  float sway = sin(ph) * 0.6 + sin(ph * 2.3 + 1.7) * 0.3 + sin(ph * 5.1 + position.x * 3.0 * uFlutter) * 0.1 * uFlutter;
  float bend = uWindStrength * (0.45 + sway * 0.55) * uWindAmount * hh * hh;
  // Taipuessa latva laskee hieman (pehmeästi, ei terävää käännettä).
  float drop = bend * bend / (2.0 * max(hh, 0.3));
  vec3 worldOff = vec3(uWindDir.x * bend, -drop, uWindDir.y * bend);
  mat3 im = mat3(instanceMatrix);
  float s2 = max(dot(im[0], im[0]), 1e-4);
  transformed += (transpose(im) * worldOff) / s2;
}
#endif`,
      );
  };
  material.customProgramCacheKey = () => 'wind';
  return material;
}

export function createSharedMaterials(groundDetail) {
  const terrain = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: groundDetail,
    roughness: 0.97,
    metalness: 0,
  });

  const vegetation = addWind(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
    0.0045,
  );
  const bush = addWind(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
    0.06,
  );
  const grass = addWind(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
    0.9,
  );
  // Korkeat, hoikat kasvit (bambu): latva huojuu rauhallisesti.
  const tall = addWind(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
    0.01,
    0.15,
  );
  const solid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });

  // Vesi luodaan erikseen (render/water.js), koska se tarvitsee taivaan värit.
  return { terrain, vegetation, bush, grass, tall, solid };
}
