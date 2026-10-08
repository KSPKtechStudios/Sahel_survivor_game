// Jälkikäsittely: valonsäteet (god rays), ilmakehän hehku sumussa,
// syväterävyys (DOF) ja liike-epäterävyys. Maailma piirretään ensin
// HDR-kuvaan syvyyksineen; käsi piirretään lopuksi suoraan ruudulle, joten
// tehosteet eivät sumenna sitä.
//
// Jos kaikki tehosteet ovat pois päältä, maailma piirretään suoraan ruudulle
// kuten ennenkin (heikoille koneille).
import * as THREE from 'three';

const quadVS = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Valonsäteiden lähde: taivaan kirkkaat kohdat auringon lähellä.
const maskFS = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uSun;
uniform float uAspect;
varying vec2 vUv;
void main() {
  float d = texture2D(tDepth, vUv).r;
  float sky = step(0.99999, d);
  vec3 c = min(texture2D(tColor, vUv).rgb, vec3(6.0));
  vec2 dd = vUv - uSun;
  dd.x *= uAspect;
  float fall = exp(-dot(dd, dd) * 3.2);
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor = vec4(c * sky * fall * smoothstep(0.1, 0.8, lum), 1.0);
}
`;

// Säteittäinen sumennus kohti aurinkoa.
const radialFS = /* glsl */ `
uniform sampler2D tInput;
uniform vec2 uSun;
uniform float uLength;
varying vec2 vUv;
void main() {
  const int N = 28;
  vec2 delta = (vUv - uSun) * uLength / float(N);
  vec2 uv = vUv;
  vec3 acc = vec3(0.0);
  float w = 1.0, ws = 0.0;
  for (int i = 0; i < N; i++) {
    acc += texture2D(tInput, uv).rgb * w;
    ws += w;
    w *= 0.965;
    uv -= delta;
  }
  gl_FragColor = vec4(acc / ws, 1.0);
}
`;

// Tarkennusetäisyys: keskikohdan syvyys, pehmeästi muuttuva (silmän mukautuminen).
const focusFS = /* glsl */ `
#include <packing>
uniform sampler2D tDepth;
uniform sampler2D tPrev;
uniform float uNear;
uniform float uFar;
uniform float uBlend;
varying vec2 vUv;
float lin(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).r, uNear, uFar); }
void main() {
  float d = min(min(lin(vec2(0.5)), lin(vec2(0.5, 0.47))), min(lin(vec2(0.47, 0.5)), lin(vec2(0.53, 0.5))));
  d = min(d, 400.0);
  float prev = texture2D(tPrev, vec2(0.5)).r;
  if (prev <= 0.0) prev = d;
  gl_FragColor = vec4(mix(prev, d, uBlend), 0.0, 0.0, 1.0);
}
`;

// Sessio 25: silmän mukautuminen (auto-exposure). Mitataan kuvan kirkkaus
// 16 x 9 näytteestä (keskusta painottuu, taivas vähemmän, jotta maasto
// erottuu iltataivasta vasten). Kirkkaat kohdat (soihdun valaisema lähimaa)
// painavat, joten soihtu "sokaisee" kaukonäön. Tulos sopeutuu ajassa:
// pimeään hitaasti (~3 s), kirkkaaseen nopeammin.
const lumFS = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tPrev;
uniform float uUp;
uniform float uDown;
uniform float uInit;
varying vec2 vUv;
void main() {
  float sl = 0.0, sm = 0.0, ws = 0.0;
  for (int y = 0; y < 9; y++) {
    for (int x = 0; x < 16; x++) {
      vec2 uv = (vec2(float(x), float(y)) + 0.5) / vec2(16.0, 9.0);
      vec3 c = texture2D(tColor, uv).rgb;
      float l = min(dot(c, vec3(0.2126, 0.7152, 0.0722)), 4.0);
      float sky = step(0.99999, texture2D(tDepth, uv).r);
      float w = (1.25 - length(uv - 0.5)) * mix(1.0, 0.15, sky);
      sl += w * log(l + 0.0005);
      sm += w * l;
      ws += w;
    }
  }
  float cur = log(mix(exp(sl / ws), sm / ws, 0.7) + 0.0005);
  float prev = texture2D(tPrev, vec2(0.5)).r;
  float k = cur > prev ? uUp : uDown;
  gl_FragColor = vec4(uInit > 0.5 ? cur : mix(prev, cur, k), 0.0, 0.0, 1.0);
}
`;

// Syväterävyys: sumennus epätarkkuusympyrän (CoC) koon mukaan (puolikas tarkkuus).
const dofFS = /* glsl */ `
#include <packing>
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tFocus;
uniform vec2 uTexel;
uniform float uNear;
uniform float uFar;
uniform float uMaxR;
varying vec2 vUv;
float coc(vec2 uv, float focus) {
  float z = -perspectiveDepthToViewZ(texture2D(tDepth, uv).r, uNear, uFar);
  // Hienovarainen syväterävyys: tarkennettu alue on leveä, ja vain selvästi
  // tarkennusta kauempana oleva tausta (tai hyvin lähellä oleva) sumenee.
  // Sessio 25: selvästi hillitympi (käyttäjä: sumensi liikaa). Tausta
  // sumenee vasta kaukana ja vain vähän; etuala vain aivan kameran edessä.
  float farStart = max(focus * 3.0 + 15.0, 32.0);
  float farC = smoothstep(farStart, farStart * 4.0 + 80.0, z) * 0.4;
  float nearC = focus > 8.0 ? (1.0 - smoothstep(0.5, 1.3, z)) * 0.45 : 0.0;
  return max(farC, nearC);
}
void main() {
  float focus = texture2D(tFocus, vec2(0.5)).r;
  float c0 = coc(vUv, focus);
  vec3 acc = texture2D(tColor, vUv).rgb;
  float ws = 1.0;
  const int N = 20;
  for (int i = 1; i < N; i++) {
    float r = sqrt(float(i) / float(N)) * uMaxR * c0;
    float a = float(i) * 2.39996;
    vec2 off = vec2(cos(a), sin(a)) * r * uTexel;
    vec2 suv = vUv + off;
    float cs = coc(suv, focus);
    // Terävä etuala ei vuoda sumean taustan päälle.
    float w = smoothstep(0.0, 0.25, cs) + 0.05;
    acc += texture2D(tColor, suv).rgb * w;
    ws += w;
  }
  gl_FragColor = vec4(acc / ws, c0);
}
`;

// Lopullinen kuva: liike-epäterävyys, DOF, valonsäteet, ilmakehän hehku ja sävytys.
const compositeFS = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tRays;
uniform sampler2D tDof;
uniform float uUseRays;
uniform float uUseDof;
uniform float uRayStrength;
uniform vec3 uRayColor;
uniform mat4 uInvViewProj;
uniform mat4 uPrevViewProj;
uniform float uMBScale;
uniform float uNear;
uniform float uFar;
uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uInscatter;
uniform float uFogNear;
uniform float uFogFar;
uniform float uHeat;
uniform float uTime;
uniform mat4 uViewProj;
uniform float uLens;
uniform vec4 uSplash[4];
uniform float uSplashOn; // keularoiskeet: x, y (kuvassa 0..1), alkuaika, voimakkuus
uniform float uAspect;
uniform float uFlare;
uniform vec2 uSunUV;
uniform vec3 uFlareColor;
uniform sampler2D tLum;  // sessio 25: sopeutunut kirkkaus (log)
uniform vec4 uAE;        // x = viitekirkkaus, y = voimakkuus (0 = pois), z = min, w = max
uniform vec4 uHFog;      // sessio 24: korkeussumu x = tiheys, y = pohja (m), z = vaimeneminen, w = aika
uniform vec3 uHFogColor;
varying vec2 vUv;
float hfH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hfN(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hfH(i), hfH(i + vec2(1.0, 0.0)), f.x), mix(hfH(i + vec2(0.0, 1.0)), hfH(i + vec2(1.0, 1.0)), f.x), f.y);
}

// Linssiheijastus (sessio 12e): hehku ja säteet auringon ympärillä, hento
// vaakajuova ja värilliset "haamut" auringon ja kuvan keskipisteen kautta
// kulkevalla linjalla. Peittyy, jos aurinko on puun, maaston tms. takana.
float flareGhost(vec2 uv, vec2 sp, vec2 toC, float k, float r) {
  vec2 gp = sp + toC * k;
  float gd = length((uv - gp) * vec2(uAspect, 1.0));
  return smoothstep(r, r * 0.7, gd) * (0.35 + 0.65 * smoothstep(0.0, r, gd));
}
vec3 lensFlare(vec2 uv) {
  vec2 sp = uSunUV;
  float vis = 0.0;
  for (int i = 0; i < 5; i++) {
    vec2 o = i == 0 ? vec2(0.0) : vec2(i == 1 ? 0.006 : i == 2 ? -0.006 : 0.0, i == 3 ? 0.008 : i == 4 ? -0.008 : 0.0);
    vec2 q = sp + o;
    if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) vis += step(0.99999, texture2D(tDepth, q).r);
  }
  vis *= 0.2;
  if (vis <= 0.0) return vec3(0.0);
  vec2 asp = vec2(uAspect, 1.0);
  vec2 dv = (uv - sp) * asp;
  float d = length(dv);
  vec3 c = vec3(0.0);
  // Hehku ja tähtimäiset säteet
  c += uFlareColor * (exp(-d * 7.0) * 0.22 + exp(-d * 26.0) * 0.45);
  float ang = atan(dv.y, dv.x);
  c += uFlareColor * (pow(abs(cos(ang * 3.0)), 60.0) + pow(abs(cos(ang * 2.0 + 0.6)), 90.0) * 0.6) * exp(-d * 5.0) * 0.12;
  // Vaakajuova
  c += uFlareColor * exp(-abs(uv.y - sp.y) * 140.0) * exp(-abs(dv.x) * 2.2) * 0.06;
  // Haamut (linssien heijastukset)
  vec2 toC = vec2(0.5) - sp;
  c += vec3(0.55, 0.75, 1.0) * flareGhost(uv, sp, toC, 0.55, 0.035) * 0.10;
  c += vec3(1.0, 0.8, 0.45) * flareGhost(uv, sp, toC, 1.15, 0.07) * 0.07;
  c += vec3(0.6, 1.0, 0.7) * flareGhost(uv, sp, toC, 1.45, 0.025) * 0.12;
  c += vec3(0.85, 0.6, 1.0) * flareGhost(uv, sp, toC, 1.85, 0.11) * 0.05;
  c += vec3(1.0, 0.7, 0.5) * flareGhost(uv, sp, toC, 2.2, 0.05) * 0.08;
  // Heikko rengas auringon ympärillä
  c += uFlareColor * smoothstep(0.03, 0.0, abs(d - 0.32)) * 0.025;
  return c * vis * uFlare;
}

// Vesipisarat "linssillä" (sessio 12d): sateella ja ukkosella satunnaisia
// pisaroita, jotka taittavat kuvaa (pisara toimii pienenä linssinä), valuvat
// hieman ja haihtuvat. Näkyvät selvimmin valoa (aurinkoa) kohti katsottaessa.
float lh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 lensDrops(vec2 uv, vec3 col) {
  vec3 outc = col;
  for (int L = 0; L < 2; L++) {
    float sc = L == 0 ? 6.0 : 11.0;
    vec2 p = uv * vec2(uAspect, 1.0) * sc;
    vec2 id = floor(p);
    vec2 f = fract(p) - 0.5;
    float h = lh(id + float(L) * 17.3);
    if (h > uLens * (L == 0 ? 0.07 : 0.1)) continue;
    float life = fract(uTime * (0.045 + 0.05 * lh(id + 2.1)) + h * 13.0);
    vec2 c = (vec2(lh(id + 3.7), lh(id + 5.3)) - 0.5) * 0.5;
    c.y += 0.18 * smoothstep(0.25, 1.0, life) * lh(id + 8.8);
    float r = (0.1 + 0.16 * lh(id + 9.9)) * smoothstep(0.0, 0.04, life) * (1.0 - smoothstep(0.65, 1.0, life));
    if (r < 0.01) continue;
    vec2 d = f - c;
    d.y *= 0.9;
    float dd = length(d) / r;
    if (dd >= 1.0) continue;
    float mask = smoothstep(1.0, 0.82, dd);
    // Pisara kääntää ympäristön kuvan (taittuminen) ja kirkastaa hieman.
    // Kevyt taittuminen (vahva käänsi tumman maan taivaalle läiskiksi).
    float z = sqrt(max(0.0, 1.0 - dd * dd));
    vec2 suv = clamp(uv - d / (vec2(uAspect, 1.0) * sc) * (0.6 + 0.5 * (1.0 - z)), vec2(0.001), vec2(0.999));
    vec3 rc = texture2D(tColor, suv).rgb * 1.06;
    // Reuna tummempi, yläreunassa pieni valon välke.
    float rim = smoothstep(0.7, 1.0, dd);
    float spec = smoothstep(0.3, 0.0, length(d / r - vec2(-0.3, -0.35)));
    rc = rc * (1.0 - 0.18 * rim) + vec3(1.0) * spec * 0.45;
    outc = mix(outc, rc, mask * 0.8);
  }
  return outc;
}

// Keularoiskeet linssillä (sessio 21): kun keula iskeytyy aaltoon myrskyssä
// ja katsotaan eteenpäin, vettä lentää linssille ryöppynä. Iskun hetkellä
// kuva vääristyy hetken (vesikalvo), sitten pisarat valuvat alas ja haihtuvat.
vec3 lensSplash(vec2 uv, vec3 col) {
  vec3 outc = col;
  vec2 asp = vec2(uAspect, 1.0);
  vec2 p = uv * asp;
  for (int s = 0; s < 4; s++) {
    vec4 sp = uSplash[s];
    float age = uTime - sp.z;
    if (sp.w <= 0.0 || age < 0.0 || age > 4.2) continue;
    vec2 cp = sp.xy * asp;
    // Vesikalvo: iskun hetkellä voimakas vääristymä, joka laantuu märäksi
    // väreilyksi hieman hitaammin.
    float near = (1.0 - smoothstep(0.0, 0.85, length(p - cp)));
    float sheet = sp.w * near * (0.8 * exp(-age * 9.0) + 0.25 * exp(-age * 2.2));
    if (sheet > 0.004) {
      vec2 w = vec2(sin(uv.y * 34.0 + sp.z * 7.0 + age * 6.0 + sin(uv.x * 17.0) * 2.0),
                    cos(uv.x * 29.0 - sp.z * 5.0 + age * 4.0 + sin(uv.y * 13.0) * 2.0)) * 0.02 * sheet;
      vec3 sc = texture2D(tColor, clamp(uv + w, vec2(0.001), vec2(0.999))).rgb;
      outc = mix(outc, sc * 1.03 + vec3(0.03, 0.04, 0.05) * sheet, min(1.0, sheet * 1.4));
    }
    float seed = mod(sp.z * 7.31, 61.0);
    // Isot pisarat (valuvat alas ja jättävät märän jäljen).
    for (int i = 0; i < 24; i++) {
      float fi = float(i) * 1.618 + seed;
      float h1 = lh(vec2(fi, 1.3)), h2 = lh(vec2(fi, 2.7)), h3 = lh(vec2(fi, 4.1)), h4 = lh(vec2(fi, 5.9));
      if (h4 > 0.4 + 0.6 * sp.w) continue;
      float a = age - h3 * 0.08; // pisarat osuvat hieman eri aikaan
      float life = 1.5 + 2.5 * h1;
      if (a < 0.0 || a > life) continue;
      vec2 off = (vec2(h1, h2) - 0.5) * vec2(0.7, 0.46);
      float big = 1.0 - smoothstep(0.0, 0.38, length(off));
      vec2 c0 = cp + off;
      float slide = (0.008 + 0.06 * big * h2) * a * a;
      vec2 c = c0 - vec2(0.0, slide);
      float fade = 1.0 - smoothstep(life * 0.5, life, a);
      float r = (0.012 + 0.045 * h3 * (0.35 + 0.65 * big)) * smoothstep(0.0, 0.025, a) * (0.4 + 0.6 * fade);
      vec2 d = p - c;
      // Märkä jälki valuneen pisaran yläpuolella.
      if (slide > 0.004 && abs(d.x) < r * 0.45 && d.y > 0.0 && d.y < slide) {
        float tr = (1.0 - abs(d.x) / (r * 0.45)) * (1.0 - d.y / slide) * 0.5 * fade;
        vec3 tc = texture2D(tColor, clamp(uv + vec2(d.x / asp.x * 0.6, 0.004), vec2(0.001), vec2(0.999))).rgb;
        outc = mix(outc, tc * 1.05, tr);
      }
      d.y *= 0.82;
      float dd = length(d) / max(r, 1e-4);
      if (dd >= 1.0) continue;
      float mask = (1.0 - smoothstep(0.82, 1.0, dd)) * min(1.0, fade * 1.6);
      // Pisara toimii linssinä: näyttää laajemman, ylösalaisin käännetyn kuvan.
      float z = sqrt(max(0.0, 1.0 - dd * dd));
      vec2 suv = clamp(uv - d / asp * (2.6 + 2.4 * (1.0 - z)), vec2(0.001), vec2(0.999));
      vec3 rc = texture2D(tColor, suv).rgb;
      float rim = smoothstep(0.6, 1.0, dd);
      float spec = (1.0 - smoothstep(0.0, 0.32, length(d / r - vec2(-0.32, 0.38))));
      float caus = smoothstep(0.55, 0.95, dd) * (1.0 - smoothstep(-0.6, 0.0, d.y / r));
      rc = rc * (1.0 - 0.45 * rim) + vec3(1.0) * (spec * 0.6 + caus * 0.12);
      outc = mix(outc, rc, mask * 0.92);
    }
    // Hieno suihku: pieniä pisaroita laajemmalle alueelle.
    for (int i = 0; i < 28; i++) {
      float fi = float(i) * 2.39 + seed + 31.0;
      float h1 = lh(vec2(fi, 7.1)), h2 = lh(vec2(fi, 8.3)), h3 = lh(vec2(fi, 9.7));
      float life = 0.8 + 1.6 * h3;
      if (h3 > 0.3 + 0.7 * sp.w || age > life) continue;
      vec2 c = cp + (vec2(h1, h2) - 0.5) * vec2(1.1, 0.7);
      float r = (0.004 + 0.006 * h3) * (1.0 - smoothstep(life * 0.4, life, age));
      vec2 d = p - c;
      float dd = length(d) / max(r, 1e-4);
      if (dd >= 1.0) continue;
      vec3 rc = texture2D(tColor, clamp(uv - d / asp * 3.0, vec2(0.001), vec2(0.999))).rgb;
      rc = rc * (1.0 - 0.4 * smoothstep(0.5, 1.0, dd)) + vec3(0.5) * (1.0 - smoothstep(0.0, 0.5, length(d / r - vec2(-0.3, 0.35))));
      outc = mix(outc, rc, (1.0 - smoothstep(0.7, 1.0, dd)) * 0.85);
    }
  }
  return outc;
}

// Kuumuusväreily: nousevia, aaltoilevia vääristymiä (uv-siirtymä).
vec2 heatWarp(vec2 uv, float t) {
  float a = sin(uv.y * 240.0 - t * 8.0 + sin(uv.x * 31.0 + t * 1.1) * 2.5);
  float b = sin(uv.y * 150.0 - t * 5.3 + uv.x * 19.0 + sin(uv.x * 7.0 - t * 0.7) * 1.5);
  return vec2(a * 0.0009, (a + b) * 0.0015);
}

vec3 sceneAt(vec2 uv) {
  vec3 c = texture2D(tColor, uv).rgb;
  if (uUseDof > 0.5) {
    vec4 d = texture2D(tDof, uv);
    c = mix(c, d.rgb, smoothstep(0.12, 0.6, d.a));
  }
  return c;
}

void main() {
  float depth = texture2D(tDepth, vUv).r;
  vec4 ndc = vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 wp = uInvViewProj * ndc;
  wp /= wp.w;
  vec3 ray = normalize(wp.xyz - uCamPos);
  float dist = length(wp.xyz - uCamPos);
  bool sky = depth >= 0.99999;

  // Kuumuusväreily horisontin tuntumassa: kaukaiset ääriviivat värisevät.
  vec2 uv = vUv;
  float heatW = 0.0;
  if (uHeat > 0.001) {
    float far = sky ? 1.0 : smoothstep(25.0, 110.0, dist);
    heatW = uHeat * far * (1.0 - smoothstep(0.0, 0.05, abs(ray.y + 0.008))); // sessio 20: kapeampi vyö
    uv = clamp(vUv + heatWarp(vUv, uTime) * heatW, vec2(0.001), vec2(0.999));
  }

  vec3 col;
  if (uMBScale > 0.0) {
    vec4 pp = uPrevViewProj * wp;
    vec2 prevUv = pp.xy / pp.w * 0.5 + 0.5;
    vec2 vel = (vUv - prevUv) * uMBScale;
    float len = length(vel);
    if (len > 0.08) vel *= 0.08 / len;
    if (len > 0.0006) {
      col = vec3(0.0);
      const int M = 13;
      for (int i = 0; i < M; i++) {
        float t = float(i) / float(M - 1) - 0.5;
        col += sceneAt(clamp(uv + vel * t, vec2(0.001), vec2(0.999)));
      }
      col /= float(M);
    } else {
      col = sceneAt(uv);
    }
  } else {
    col = sceneAt(uv);
  }

  // Kangastus: kaukainen maa aivan horisontin alla heijastaa taivasta kuin
  // väreilevä vesi.
  if (heatW > 0.001 && !sky && ray.y < 0.0) {
    float m = uHeat * smoothstep(-0.03, -0.004, ray.y) * smoothstep(90.0, 220.0, dist);
    if (m > 0.001) {
      vec4 mc = uViewProj * vec4(uCamPos + vec3(ray.x, -ray.y, ray.z) * 1000.0, 1.0);
      vec2 muv = mc.xy / mc.w * 0.5 + 0.5 + heatWarp(vUv * 1.3, uTime * 1.2) * 1.5;
      col = mix(col, texture2D(tColor, clamp(muv, vec2(0.001), vec2(0.999))).rgb, m * 0.45);
    }
  }

  // Sessio 24: maata myötäilevä korkeussumu (laaksot, sademetsä, sade,
  // aamuusva). Tiheys vaimenee eksponentiaalisesti ylöspäin; säteen yli
  // integroitu analyyttisesti, ja usva ajelehtii laikkuina tuulen mukana.
  if (uHFog.x > 0.0) {
    float L = sky ? 700.0 : dist;
    vec3 P = uCamPos + ray * L;
    float hc = uCamPos.y - uHFog.y, hp = P.y - uHFog.y;
    float fz = uHFog.z;
    float ec = exp(-fz * max(hc, -15.0)), ep = exp(-fz * max(hp, -15.0));
    float dh = hp - hc;
    float integ = abs(dh) > 0.05 ? (ec - ep) / (fz * dh) : ec;
    float wisp = hfN(P.xz * 0.035 + vec2(uHFog.w * 0.05, uHFog.w * 0.02)) * 0.6 + hfN(P.xz * 0.11 - uHFog.w * 0.04) * 0.4;
    float amt = 1.0 - exp(-uHFog.x * L * integ * (0.55 + 0.9 * wisp));
    // Lähellä ohuempi (ei sumuseinää kasvojen edessä).
    amt *= smoothstep(1.5, 14.0, L);
    float mu = max(dot(ray, uSunDir), 0.0);
    vec3 hcol = uHFogColor + uSunColor * pow(mu, 5.0) * 0.35 * uInscatter;
    col = mix(col, hcol, clamp(amt, 0.0, 0.9));
  }

  // Ilmakehä: sumu hehkuu auringon suunnassa (aamu- ja iltavalo, usva).
  if (uInscatter > 0.0 && !sky) {
    float f = clamp((dist - uFogNear) / max(uFogFar - uFogNear, 1.0), 0.0, 1.0);
    float mu = max(dot(ray, uSunDir), 0.0);
    float phase = pow(mu, 6.0) * 0.55 + pow(mu, 40.0) * 0.45;
    col += uSunColor * phase * f * uInscatter;
  }

  if (uUseRays > 0.5) col += texture2D(tRays, vUv).rgb * uRayColor * uRayStrength;
  if (uFlare > 0.01) col += lensFlare(vUv);
  if (uLens > 0.01) col = lensDrops(vUv, col);
  if (uSplashOn > 0.5) col = lensSplash(vUv, col);
  // Silmän mukautuminen: valotus sopeutuneen kirkkauden mukaan.
  if (uAE.y > 0.0) {
    float aL = exp(texture2D(tLum, vec2(0.5)).r);
    col *= clamp(pow(uAE.x / max(aL, 0.0001), uAE.y), uAE.z, uAE.w);
  }

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function makeRT(w, h, opts = {}) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    generateMipmaps: false,
    ...opts,
  });
}

const _v = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _sun = new THREE.Vector2();
const _m = new THREE.Matrix4();
const _size = new THREE.Vector2();

export class PostFX {
  constructor(renderer) {
    this.renderer = renderer;
    this.godRays = true;
    this.motionBlur = 0; // 0 = pois, 1 = kevyt, 2 = vahva
    this.dof = false;
    this.lens = 0; // vesipisarat linssillä 0..1 (main.js)
    this.splashOn = false; // keularoiskeita linssillä (addSplash)
    this.lensFlare = true; // asetus
    this.flare = 0;        // linssiheijastuksen voimakkuus 0..1 (main.js)
    this.sunUV = new THREE.Vector2(0.5, 0.5);

    const depthTexture = new THREE.DepthTexture(1, 1);
    depthTexture.type = THREE.UnsignedIntType;
    this.sceneRT = makeRT(1, 1, { depthBuffer: true, depthTexture, samples: 4 });
    this.raysA = makeRT(1, 1);
    this.raysB = makeRT(1, 1);
    this.dofRT = makeRT(1, 1);
    this.focusRT = [makeRT(1, 1, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }),
      makeRT(1, 1, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter })];
    this.focusIdx = 0;

    const mat = (fs, uniforms, extra = {}) => new THREE.ShaderMaterial({
      uniforms, vertexShader: quadVS, fragmentShader: fs, depthTest: false, depthWrite: false, ...extra,
    });
    this.maskMat = mat(maskFS, {
      tColor: { value: null }, tDepth: { value: depthTexture }, uSun: { value: new THREE.Vector2() }, uAspect: { value: 1 },
    }, { toneMapped: false });
    this.radialMat = mat(radialFS, {
      tInput: { value: null }, uSun: { value: new THREE.Vector2() }, uLength: { value: 0.6 },
    }, { toneMapped: false });
    this.focusMat = mat(focusFS, {
      tDepth: { value: depthTexture }, tPrev: { value: null }, uNear: { value: 0.1 }, uFar: { value: 1500 }, uBlend: { value: 0.1 },
    }, { toneMapped: false });
    this.dofMat = mat(dofFS, {
      tColor: { value: null }, tDepth: { value: depthTexture }, tFocus: { value: null }, uTexel: { value: new THREE.Vector2() },
      uNear: { value: 0.1 }, uFar: { value: 1500 }, uMaxR: { value: 3 },
    }, { toneMapped: false });
    this.compMat = mat(compositeFS, {
      tColor: { value: null }, tDepth: { value: depthTexture }, tRays: { value: null }, tDof: { value: null },
      uUseRays: { value: 0 }, uUseDof: { value: 0 }, uRayStrength: { value: 0 }, uRayColor: { value: new THREE.Color() },
      uInvViewProj: { value: new THREE.Matrix4() }, uPrevViewProj: { value: new THREE.Matrix4() }, uMBScale: { value: 0 },
      uNear: { value: 0.1 }, uFar: { value: 1500 }, uCamPos: { value: new THREE.Vector3() },
      uSunDir: { value: new THREE.Vector3() }, uSunColor: { value: new THREE.Color() }, uInscatter: { value: 0 },
      uLens: { value: 0 }, uAspect: { value: 1 },
      uSplash: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] }, uSplashOn: { value: 0 },
      uFlare: { value: 0 }, uSunUV: { value: new THREE.Vector2(0.5, 0.5) }, uFlareColor: { value: new THREE.Color(1, 0.92, 0.8) },
      uFogNear: { value: 50 }, uFogFar: { value: 330 },
      uHeat: { value: 0 }, uTime: { value: 0 }, uViewProj: { value: new THREE.Matrix4() },
      uHFog: { value: new THREE.Vector4(0, 0, 0.12, 0) }, uHFogColor: { value: new THREE.Color(0.7, 0.72, 0.74) },
      tLum: { value: null }, uAE: { value: new THREE.Vector4(0.3, 0, 0.6, 3) },
    });
    // Sessio 25: silmän mukautuminen (1 x 1 -kirkkaus, kaksi vuorottelevaa).
    this.autoExposure = true;
    this.ae = { ref: 0.3, strength: 0.6, min: 0.65, max: 2.8, darkTau: 1.1, brightTau: 0.4 };
    this.lumRT = [0, 1].map(() => makeRT(1, 1, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }));
    this.lumIdx = 0;
    this.lumInit = true;
    this.lumMat = mat(lumFS, {
      tColor: { value: null }, tDepth: { value: depthTexture }, tPrev: { value: null },
      uUp: { value: 0.1 }, uDown: { value: 0.05 }, uInit: { value: 1 },
    }, { toneMapped: false });
    // Sessio 24: korkeussumu (main.js asettaa tiheyden ja pohjan).
    this.hfog = { density: 0, base: 0, falloff: 0.12, color: new THREE.Color(0.7, 0.72, 0.74) };
    this.time = 0;

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.compMat);
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.prevViewProj = new THREE.Matrix4();
    this.hasPrev = false;
    this.w = 0;
    this.h = 0;
  }

  // Keularoiske linssille (sessio 21): x, y = paikka kuvassa (0..1),
  // k = voimakkuus 0..1. Enintään neljä yhtä aikaa (vanhin korvataan).
  addSplash(x, y, k) {
    const list = this.compMat.uniforms.uSplash.value;
    let slot = list.find((v) => v.w <= 0);
    if (!slot) { slot = list[0]; for (const v of list) if (v.z < slot.z) slot = v; }
    slot.set(x, y, this.time, Math.max(0.05, Math.min(1, k)));
    this.splashOn = true;
  }

  get active() {
    return this.autoExposure || this.godRays || this.motionBlur > 0 || this.dof || this.lens > 0.01 || this.splashOn || (this.lensFlare && this.flare > 0.01) || this.hfog.density > 0.0005;
  }

  _resize() {
    this.renderer.getDrawingBufferSize(_size);
    const w = Math.max(1, Math.floor(_size.x));
    const h = Math.max(1, Math.floor(_size.y));
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.sceneRT.setSize(w, h);
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    this.raysA.setSize(hw, hh);
    this.raysB.setSize(hw, hh);
    this.dofRT.setSize(hw, hh);
    this.dofMat.uniforms.uTexel.value.set(1 / hw, 1 / hh);
    this.maskMat.uniforms.uAspect.value = w / h;
    this.compMat.uniforms.uAspect.value = w / h;
  }

  _pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCam);
  }

  // Piirrä maailma tehosteineen ruudulle. env: aurinko, sumu ja sää.
  render(scene, camera, env, dt) {
    const r = this.renderer;
    if (!this.active) {
      r.setRenderTarget(null);
      r.clear();
      r.render(scene, camera);
      this.hasPrev = false;
      return;
    }
    this._resize();
    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(scene, camera);

    const near = camera.near, far = camera.far;
    const viewProj = _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const cu = this.compMat.uniforms;
    cu.tColor.value = this.sceneRT.texture;
    cu.uInvViewProj.value.copy(viewProj).invert();
    cu.uViewProj.value.copy(viewProj);
    // Kuumuusväreily (vain kun jälkikäsittely on muutenkin päällä).
    this.time = (this.time + Math.max(0, dt)) % 1000;
    // Sessio 18 ja 20: väreily selvästi hillitymmäksi (käyttäjä: liian iso).
    cu.uHeat.value = (env.heat || 0) * 0.3;
    cu.uTime.value = this.time;
    cu.uNear.value = near;
    cu.uFar.value = far;
    cu.uCamPos.value.copy(camera.position);

    // --- Valonsäteet
    let rays = 0;
    const sunUp = env.sunDir.y > -0.02;
    if (this.godRays && sunUp) {
      _v.copy(camera.position).addScaledVector(env.sunDir, 800).project(camera);
      const facing = camera.getWorldDirection(_fwd).dot(env.sunDir);
      const onScreen = 1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(_v.x), Math.abs(_v.y)), 1.2, 2.2);
      const w = env.w;
      // Matala aurinko, usva ja kosteus vahvistavat säteitä.
      const low = 1 - THREE.MathUtils.smoothstep(env.sunDir.y, 0.15, 0.75) * 0.6;
      rays = THREE.MathUtils.smoothstep(facing, 0.0, 0.35) * onScreen * env.daylight * low
        * (0.55 + w.haze * 0.8 + env.humid * 0.9) * (1 - w.cloud * 0.5) * (w.vis < 80 ? 0.3 : 1);
      if (rays > 0.01) {
        const sun = _sun.set(_v.x * 0.5 + 0.5, _v.y * 0.5 + 0.5);
        this.maskMat.uniforms.tColor.value = this.sceneRT.texture;
        this.maskMat.uniforms.uSun.value.copy(sun);
        this._pass(this.maskMat, this.raysA);
        this.radialMat.uniforms.uSun.value.copy(sun);
        this.radialMat.uniforms.tInput.value = this.raysA.texture;
        this.radialMat.uniforms.uLength.value = 0.65;
        this._pass(this.radialMat, this.raysB);
        this.radialMat.uniforms.tInput.value = this.raysB.texture;
        this.radialMat.uniforms.uLength.value = 0.28;
        this._pass(this.radialMat, this.raysA);
        cu.tRays.value = this.raysA.texture;
        cu.uRayColor.value.copy(env.sun.color);
      }
    }
    cu.uUseRays.value = rays > 0.01 ? 1 : 0;
    cu.uRayStrength.value = rays * 1.35;

    // --- Syväterävyys
    if (this.dof) {
      const prev = this.focusRT[this.focusIdx];
      const next = this.focusRT[1 - this.focusIdx];
      const fu = this.focusMat.uniforms;
      fu.tPrev.value = prev.texture;
      fu.uNear.value = near;
      fu.uFar.value = far;
      fu.uBlend.value = 1 - Math.exp(-Math.max(dt, 0.001) * 5);
      this._pass(this.focusMat, next);
      this.focusIdx = 1 - this.focusIdx;
      const du = this.dofMat.uniforms;
      du.tColor.value = this.sceneRT.texture;
      du.tFocus.value = next.texture;
      du.uNear.value = near;
      du.uFar.value = far;
      this._pass(this.dofMat, this.dofRT);
      cu.tDof.value = this.dofRT.texture;
    }
    cu.uUseDof.value = this.dof ? 1 : 0;

    // --- Liike-epäterävyys: nopeus edellisen ruudun kamerasta.
    if (this.motionBlur > 0 && this.hasPrev && dt > 0) {
      // Sessio 25: runsaampi (käyttäjän toive).
      const strength = this.motionBlur === 2 ? 1.7 : 0.9;
      cu.uMBScale.value = Math.min(4, strength * (1 / 60) / Math.max(dt, 1 / 240));
      cu.uPrevViewProj.value.copy(this.prevViewProj);
    } else {
      cu.uMBScale.value = 0;
    }
    this.prevViewProj.copy(viewProj);
    this.hasPrev = true;

    // --- Ilmakehän hehku
    cu.uSunDir.value.copy(env.sunDir);
    cu.uLens.value = this.lens;
    // Keularoiskeet: ajan kierrettyä alkuun vanhat roiskeet poistetaan.
    let on = false;
    for (const v of cu.uSplash.value) {
      if (v.w > 0 && (this.time < v.z || this.time - v.z > 4.2)) v.w = 0;
      if (v.w > 0) on = true;
    }
    this.splashOn = on;
    cu.uSplashOn.value = on ? 1 : 0;
    cu.uFlare.value = this.lensFlare ? this.flare : 0;
    cu.uSunUV.value.copy(this.sunUV);
    cu.uSunColor.value.copy(env.sky.uniforms.uSunColor.value).multiplyScalar(env.sky.uniforms.uSunVisible.value);
    cu.uInscatter.value = 0.9 * env.daylight * (1 - env.w.cloud * 0.6);
    cu.uFogNear.value = env.scene.fog.near;
    cu.uFogFar.value = env.scene.fog.far;
    const hf = this.hfog;
    cu.uHFog.value.set(hf.density, hf.base, hf.falloff, this.time);
    cu.uHFogColor.value.copy(hf.color);

    // --- Silmän mukautuminen
    if (this.autoExposure) {
      const lu = this.lumMat.uniforms;
      const prev = this.lumRT[this.lumIdx], next = this.lumRT[1 - this.lumIdx];
      const ddt = Math.min(Math.max(dt, 0), 0.25);
      lu.tColor.value = this.sceneRT.texture;
      lu.tPrev.value = prev.texture;
      lu.uUp.value = 1 - Math.exp(-ddt / this.ae.brightTau);
      lu.uDown.value = 1 - Math.exp(-ddt / this.ae.darkTau);
      lu.uInit.value = this.lumInit ? 1 : 0;
      this._pass(this.lumMat, next);
      this.lumIdx = 1 - this.lumIdx;
      this.lumInit = false;
      cu.tLum.value = next.texture;
      cu.uAE.value.set(this.ae.ref, this.ae.strength, this.ae.min, this.ae.max);
    } else {
      cu.uAE.value.y = 0;
    }

    this._pass(this.compMat, null);
  }
}
