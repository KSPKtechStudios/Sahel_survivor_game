// Jälkikäsittely: valonsäteet (god rays), ilmakehän hehku sumussa,
// syväterävyys (DOF) ja liike-epäterävyys. Maailma piirretään ensin
// HDR-kuvaan syvyyksineen; käsi piirretään sen jälkeen, joten tehosteet
// eivät sumenna sitä.
//
// Sessio 37 (grafiikkapäivitys, käyttäjä: päivä näytti ylivalottuneelta,
// latteelta ja halvalta):
//  - Ambienttiokkluusio (SSAO) syvyyspuskurista: kontaktivarjot ruohotuppaiden,
//    puiden ja esineiden juurelle (ei "leijuvia" malleja).
//  - Viimeistelyvaihe: maailma ja käsi kootaan HDR-kuvaan, josta tehdään
//    bloom (vain voimakkaat kohokohdat: aurinko, liekit, välkkeet), ja
//    lopuksi ACES-sävytys, värimäärittely (kontrasti, kylläisyys, lämmin
//    maanläheinen sävy) ja kevyt vinjetti.
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
      // Sessio 27: taivas painaa enemmän (0,15 -> 0,4): ylös kirkkaaseen
      // katsottaessa metsä tummuu ja alas katsottaessa silmä tottuu taas.
      // Sessio 39: taivas painaa vielä enemmän (0,4 -> 0,75): aurinkoon ja
      // kirkkaaseen taivaaseen katsottaessa valotus laskee, eikä taivas puhkea.
      float w = (1.25 - length(uv - 0.5)) * mix(1.0, 0.75, sky);
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
  // Sessio 39 (käyttäjä: toimivammaksi ja huomattavammaksi): tarkennuksen
  // mukaan. Lähelle katsottaessa tausta sumenee selvästi; kauas katsottaessa
  // vain aivan kameran edessä oleva sumenee.
  // Sessio 44: takaisin session 25 arvoihin. Sessioiden 39-40 voimakkaampi
  // syväterävyys korvasi kaukaisen maiseman lähes kokonaan puolikkaan
  // tarkkuuden kuvalla, mikä näytti pikselimössöltä.
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
#include <packing>
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
uniform sampler2D tVol;  // sessio 26: valokeilat (r = valaistu matka m, g = säteen pituus)
uniform vec3 uVolCol;    // auringon väri * voimakkuus * ilman tiheys
uniform vec2 uVolTexel;
uniform float uOutA;     // sessio 39: alfa HDR-kuvaan (0 = maailma; käsi kirjoittaa 1)
uniform float uSkyK;     // sessio 40: taivaan valotus päivällä (ei puhkea valkoiseksi)
uniform sampler2D tAO;   // sessio 37: ambienttiokkluusio (r = okkluusio, g = syvyys)
uniform vec2 uAORes;
uniform float uAOStr;
varying vec2 vUv;
// Puolikkaan tarkkuuden okkluusio täyteen kokoon: neljä lähintä näytettä
// painotetaan syvyyden samankaltaisuudella (ei tummia sädekehiä reunoille).
float aoAt(vec2 uv, float z) {
  vec2 hp = uv * uAORes - 0.5;
  vec2 f = fract(hp);
  vec2 b = floor(hp);
  float s = 0.0, ws = 0.0;
  float tol = z * 0.04 + 0.05;
  for (int j = 0; j < 2; j++) {
    for (int i = 0; i < 2; i++) {
      vec2 t = texture2D(tAO, (b + vec2(float(i), float(j)) + 0.5) / uAORes).rg;
      float bw = (i == 0 ? 1.0 - f.x : f.x) * (j == 0 ? 1.0 - f.y : f.y);
      float w = (bw + 0.001) * max(0.002, 1.0 - abs(t.g - z) / tol);
      s += t.r * w;
      ws += w;
    }
  }
  return s / ws;
}
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
    // Puolikkaan tarkkuuden sumennus vain selvästi sumeisiin kohtiin (sessio 44).
    c = mix(c, d.rgb, smoothstep(0.2, 0.6, d.a));
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

  // Sessio 37: ambienttiokkluusio ennen sumua ja ilmakehää (kaukainen usva ei
  // tummu). Kirkkaissa, auringon valaisemissa kohdissa heikompi, koska
  // okkluusio koskee oikeasti vain hajavaloa.
  if (uAOStr > 0.0 && !sky) {
    float ao = aoAt(vUv, -perspectiveDepthToViewZ(depth, uNear, uFar));
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col *= mix(1.0, ao, uAOStr * (1.0 - 0.35 * smoothstep(0.4, 2.0, lum)));
  }

  if (sky) col *= uSkyK;

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

  // Sessio 26: volumetriset valokeilat (latvuston aukoista). Neljän näytteen
  // pehmennys tasoittaa värisytyksen. Täysin valaistua ilmaa vaimennetaan,
  // jotta avoimilla paikoilla ei synny tasaista utua vaan keilat korostuvat.
  if (uVolCol.r + uVolCol.g + uVolCol.b > 0.0) {
    vec2 v = texture2D(tVol, vUv + uVolTexel * vec2(0.75, 0.25)).rg + texture2D(tVol, vUv + uVolTexel * vec2(-0.25, 0.75)).rg
      + texture2D(tVol, vUv + uVolTexel * vec2(-0.75, -0.25)).rg + texture2D(tVol, vUv + uVolTexel * vec2(0.25, -0.75)).rg;
    v *= 0.25;
    float litF = v.x / max(v.y, 0.001);
    float mu = dot(ray, uSunDir);
    float g = 0.55;
    float hg = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);
    float phase = 0.45 + 0.55 * hg;
    col += uVolCol * phase * v.x * (1.0 - 0.85 * pow(litF, 1.5));
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

  gl_FragColor = vec4(col, uOutA);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// Sessio 26: volumetriset valokeilat. Jokaiselle kuvapisteelle kuljetaan
// katsesädettä pitkin (enintään uMaxDist m) ja katsotaan auringon
// varjokartasta, onko kukin näytepiste valossa. Valaistu matka (m)
// tallennetaan; latvuston aukoista tulevat keilat erottuvat varjoisasta
// ilmasta. Puolikkaalla resoluutiolla, värisytetty aloituskohta.
const volFS = /* glsl */ `
uniform sampler2D tDepth;
uniform sampler2DShadow tShadow;
uniform mat4 uShadowM0;
uniform mat4 uShadowM1;
uniform float uCascEnd;
uniform mat4 uInvViewProj;
uniform vec3 uCamPos;
uniform vec3 uCamFwd;
uniform float uMaxDist;
uniform float uFrame;
varying vec2 vUv;

float sunVis(vec3 p, float vz) {
  bool c0 = vz < uCascEnd;
  vec4 s = c0 ? uShadowM0 * vec4(p, 1.0) : uShadowM1 * vec4(p, 1.0);
  float lo = c0 ? 0.0 : 0.5;
  if (s.x < lo || s.x > lo + 0.5 || s.y < 0.0 || s.y > 1.0 || s.z > 1.0) return 1.0;
  return texture(tShadow, vec3(s.xy, s.z));
}

void main() {
  float depth = texture2D(tDepth, vUv).r;
  vec4 wp = uInvViewProj * vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  wp /= wp.w;
  vec3 d = wp.xyz - uCamPos;
  float L = min(length(d), uMaxDist);
  vec3 ray = normalize(d);
  float cosF = max(dot(ray, uCamFwd), 0.05);
  const int N = 28;
  float stepL = L / float(N);
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + uFrame * 0.618034);
  float acc = 0.0;
  for (int i = 0; i < N; i++) {
    float t = (float(i) + j) * stepL;
    acc += sunVis(uCamPos + ray * t, t * cosF);
  }
  gl_FragColor = vec4(acc * stepL, L, 0.0, 1.0);
}
`;

// Sessio 37: ambienttiokkluusio (Scalable Ambient Obscurance -tyyli)
// puolikkaalla tarkkuudella. Pinnan paikka ja normaali päätellään
// syvyyspuskurista (normaali naapureista, terävämpi puoli valitaan, jotta
// reunat eivät sotkeudu). Näytteet kiertävät spiraalina, jonka kierto
// vaihtelee pikseleittäin; kohina siivotaan reunat säilyttävällä sumennuksella.
// Tulos: r = okkluusio (1 = ei varjoa), g = lineaarinen syvyys (sumennusta
// ja tarkkaa skaalausta varten).
const aoFS = /* glsl */ `
uniform sampler2D tDepth;
uniform mat4 uProjInv;
uniform vec2 uTexel;
uniform vec2 uHalfTexel;
uniform float uProjScale;
uniform float uRadius;
uniform float uIntensity;
uniform float uMaxPx;
uniform float uFade;
varying vec2 vUv;
vec3 viewPos(vec2 uv) {
  float d = texture2D(tDepth, uv).r;
  vec4 p = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  return p.xyz / p.w;
}
void main() {
  float d = texture2D(tDepth, vUv).r;
  if (d >= 0.99999) { gl_FragColor = vec4(1.0, 60000.0, 0.0, 1.0); return; }
  vec3 P = viewPos(vUv);
  float z = -P.z;
  float fade = 1.0 - smoothstep(uFade * 0.55, uFade, z);
  float ssR = min(uProjScale * uRadius / z, uMaxPx);
  if (fade <= 0.0 || ssR < 1.0) { gl_FragColor = vec4(1.0, z, 0.0, 1.0); return; }
  vec2 dx = vec2(uTexel.x * 2.0, 0.0), dy = vec2(0.0, uTexel.y * 2.0);
  vec3 Pr = viewPos(vUv + dx), Pl = viewPos(vUv - dx), Pu = viewPos(vUv + dy), Pd = viewPos(vUv - dy);
  vec3 ddx = abs(Pr.z - P.z) < abs(P.z - Pl.z) ? Pr - P : P - Pl;
  vec3 ddy = abs(Pu.z - P.z) < abs(P.z - Pd.z) ? Pu - P : P - Pd;
  vec3 N = normalize(cross(ddx, ddy));
  // Sessio 45: ohut kasvillisuus (korret, lehdet) jätetään pois: niiden
  // syvyys poikkeaa molemmista naapureista (toinen derivaatta suuri), ja
  // tuulessa liikkuessaan ne välkyttivät okkluusiota. Tasot ja isot muodot
  // pitävät okkluusion.
  float thin = (abs(Pr.z + Pl.z - 2.0 * P.z) + abs(Pu.z + Pd.z - 2.0 * P.z)) / z;
  fade *= 1.0 - smoothstep(0.015, 0.06, thin);
  if (fade <= 0.0) { gl_FragColor = vec4(1.0, z, 0.0, 1.0); return; }
  float R2 = uRadius * uRadius;
  float rnd = 6.2831853 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float bias = 0.01 + 0.0012 * z;
  float sum = 0.0;
  for (int i = 0; i < NS; i++) {
    float a = (float(i) + 0.5) / float(NS);
    float ang = a * 6.2831853 * TURNS + rnd;
    // Näytteet vasta 35 %:n säteeltä: pienet yksityiskohdat eivät varjosta.
    vec2 uv = vUv + vec2(cos(ang), sin(ang)) * (ssR * (0.35 + 0.65 * a)) * uHalfTexel;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) continue;
    vec3 v = viewPos(uv) - P;
    float vv = dot(v, v);
    float f = max(R2 - vv, 0.0);
    sum += f * f * f * max((dot(v, N) - bias) / (0.02 + vv), 0.0);
  }
  float A = max(0.0, 1.0 - sum * uIntensity * 5.0 / (R2 * R2 * R2 * float(NS)));
  gl_FragColor = vec4(mix(1.0, A, fade), z, 0.0, 1.0);
}
`;

// Reunat säilyttävä sumennus (erotettava, 9 näytettä): vain samalla
// syvyydellä olevat naapurit sekoittuvat.
const aoBlurFS = /* glsl */ `
uniform sampler2D tAO;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec2 c = texture2D(tAO, vUv).rg;
  float z = c.g;
  if (z > 50000.0) { gl_FragColor = vec4(1.0, z, 0.0, 1.0); return; }
  float tol = z * 0.035 + 0.04;
  float s = c.r * 0.227, ws = 0.227;
  for (int i = 1; i <= 4; i++) {
    float g = i == 1 ? 0.1945 : i == 2 ? 0.1216 : i == 3 ? 0.054 : 0.0162;
    vec2 a = texture2D(tAO, vUv + uDir * float(i)).rg;
    vec2 b = texture2D(tAO, vUv - uDir * float(i)).rg;
    float wa = g * max(0.0, 1.0 - abs(a.g - z) / tol);
    float wb = g * max(0.0, 1.0 - abs(b.g - z) / tol);
    s += a.r * wa + b.r * wb;
    ws += wa + wb;
  }
  gl_FragColor = vec4(s / ws, z, 0.0, 1.0);
}
`;

// Bloom (sessio 37): kirkkaat kohdat pehmeällä kynnyksellä (valotuksen
// jälkeen), Karis-keskiarvo estää yksittäisten välkkeiden vilkkumisen.
const bloomPreFS = /* glsl */ `
uniform sampler2D tInput;
uniform vec2 uTexel;
uniform vec4 uThresh; // x kynnys, y polvi, z valotus, w yläraja
uniform sampler2D tLum; // sessio 38: silmän mukautuminen (kynnys sen jälkeen)
uniform vec4 uAE;
varying vec2 vUv;
float gAE = 1.0;
vec3 pre(vec3 c) {
  float z = uThresh.z * gAE;
  vec3 e = min(c * z, vec3(uThresh.w));
  float br = max(e.r, max(e.g, e.b));
  float rq = clamp(br - uThresh.x + uThresh.y, 0.0, 2.0 * uThresh.y);
  rq = rq * rq / (4.0 * uThresh.y + 1e-4);
  return e * (max(rq, br - uThresh.x) / max(br, 1e-4)) / z;
}
float kw(vec3 c) { return 1.0 / (1.0 + dot(c, vec3(0.2126, 0.7152, 0.0722)) * uThresh.z * gAE); }
void main() {
  if (uAE.y > 0.0) gAE = clamp(pow(uAE.x / max(exp(texture2D(tLum, vec2(0.5)).r), 0.0001), uAE.y), uAE.z, uAE.w);
  vec3 a = pre(texture2D(tInput, vUv + uTexel * vec2(-1.0, -1.0)).rgb);
  vec3 b = pre(texture2D(tInput, vUv + uTexel * vec2(1.0, -1.0)).rgb);
  vec3 c = pre(texture2D(tInput, vUv + uTexel * vec2(-1.0, 1.0)).rgb);
  vec3 d = pre(texture2D(tInput, vUv + uTexel * vec2(1.0, 1.0)).rgb);
  float wa = kw(a), wb = kw(b), wc = kw(c), wd = kw(d);
  gl_FragColor = vec4((a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd), 1.0);
}
`;

// Alasnäytteistys (13 näytettä, tasainen ja välkkymätön).
const bloomDownFS = /* glsl */ `
uniform sampler2D tInput;
uniform vec2 uTexel;
varying vec2 vUv;
vec3 t(float x, float y) { return texture2D(tInput, vUv + uTexel * vec2(x, y)).rgb; }
void main() {
  vec3 A = t(-2.0, -2.0), B = t(0.0, -2.0), C = t(2.0, -2.0);
  vec3 D = t(-1.0, -1.0), E = t(1.0, -1.0);
  vec3 F = t(-2.0, 0.0), G = t(0.0, 0.0), H = t(2.0, 0.0);
  vec3 I = t(-1.0, 1.0), J = t(1.0, 1.0);
  vec3 K = t(-2.0, 2.0), L = t(0.0, 2.0), M = t(2.0, 2.0);
  vec3 o = (D + E + I + J) * 0.125 + (A + B + F + G + B + C + G + H + F + G + K + L + G + H + L + M) * 0.03125;
  gl_FragColor = vec4(o, 1.0);
}
`;

// Ylösnäytteistys (3 × 3 telttasuodin), lisätään edelliseen tasoon.
const bloomUpFS = /* glsl */ `
uniform sampler2D tInput;
uniform vec2 uTexel;
uniform float uWeight;
varying vec2 vUv;
vec3 t(float x, float y) { return texture2D(tInput, vUv + uTexel * vec2(x, y)).rgb; }
void main() {
  vec3 s = t(-1.0, -1.0) + t(1.0, -1.0) + t(-1.0, 1.0) + t(1.0, 1.0)
    + (t(0.0, -1.0) + t(-1.0, 0.0) + t(1.0, 0.0) + t(0.0, 1.0)) * 2.0 + t(0.0, 0.0) * 4.0;
  gl_FragColor = vec4(s * (uWeight / 16.0), 1.0);
}
`;

// Viimeistely (sessio 37): bloom, ACES-sävytys, värimäärittely ja vinjetti
// koko kuvalle (maailma ja käsi). Värimäärittely tehdään havaintoavaruudessa:
// kontrasti keskisävyn ympäri, kylläisyys, lämpimät valot ja syvemmät,
// hieman ruskeanvihreät varjot (savannin maanläheiset sävyt). Lopuksi
// värisytys estää liukuvärien raidoittumisen.
const finalFS = /* glsl */ `
uniform sampler2D tHDR;
uniform sampler2D tBloom;
uniform sampler2D tLum;  // sessio 38: silmän mukautuminen myös kädelle
uniform vec4 uAE;
uniform float uBloom;
uniform vec4 uGrade;   // x kontrasti, y kylläisyys, z lämpö, w päällä
uniform float uVig;
uniform float uAspect;
uniform float uHandAE; // sessio 39: käden mukautumisen eksponentti (alfa 1 = käsi)
varying vec2 vUv;
vec3 tm(vec3 c) {
  #ifdef TONE_MAPPING
  c = toneMapping(c);
  #endif
  return clamp(c, 0.0, 1.0);
}
void main() {
  float ae = 1.0;
  if (uAE.y > 0.0) ae = clamp(pow(uAE.x / max(exp(texture2D(tLum, vec2(0.5)).r), 0.0001), uAE.y), uAE.z, uAE.w);
  vec3 bl = uBloom > 0.0 ? texture2D(tBloom, vUv).rgb * uBloom : vec3(0.0);
  vec4 h0 = texture2D(tHDR, vUv);
  // Käsi ja esineet (alfa 1) saavat vain osan mukautumisesta: yöllä niissä
  // näkyy pimeys ja heijastukset, mutta ne eivät katoa mustaan.
  ae = mix(ae, pow(ae, uHandAE), clamp(h0.a, 0.0, 1.0));
  vec3 c = tm((h0.rgb + bl) * ae);
  // Sessio 45: terävöinti (sessio 38) poistettu kokonaan (käyttäjä: teki
  // pelistä kamalan näköisen).
  if (uGrade.w > 0.5) {
    vec3 p = pow(c, vec3(1.0 / 2.2));
    // Kontrasti: S-käyrä keskisävyn (0,45) ympäri, ääripäät pehmeästi.
    // Sessio 38: tummimmat sävyt eivät tummu (yöt ja varjot pysyvät
    // näkyvinä; ennen käyrä painoi pimeän sademetsän lähes mustaksi).
    vec3 q = clamp((p - 0.45) * uGrade.x + 0.45, 0.0, 1.0);
    p = mix(p, q, smoothstep(0.03, 0.32, p) * (1.0 - smoothstep(0.88, 1.0, p)));
    float l = dot(p, vec3(0.2126, 0.7152, 0.0722));
    p = mix(vec3(l), p, uGrade.y);
    // Sävytys: valot lämpimiksi, varjot syviksi ja hieman vihreänruskeiksi.
    float hi = smoothstep(0.35, 0.95, l);
    float sh = smoothstep(0.02, 0.12, l) * (1.0 - smoothstep(0.12, 0.45, l));
    p *= mix(vec3(1.0), vec3(1.0 + 0.04 * uGrade.z, 1.0 + 0.012 * uGrade.z, 1.0 - 0.05 * uGrade.z), hi);
    p *= mix(vec3(1.0), vec3(0.97, 0.985, 0.94), sh * uGrade.z);
    c = pow(clamp(p, 0.0, 1.0), vec3(2.2));
  }
  if (uVig > 0.0) {
    vec2 v = (vUv - 0.5) * vec2(uAspect, 1.0);
    float r = length(v) / length(vec2(uAspect, 1.0) * 0.5);
    c *= 1.0 - uVig * smoothstep(0.45, 1.15, r);
  }
  gl_FragColor = linearToOutputTexel(vec4(c, 1.0));
  gl_FragColor.rgb += (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
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
      tVol: { value: null }, uVolCol: { value: new THREE.Color(0, 0, 0) }, uVolTexel: { value: new THREE.Vector2(1, 1) },
      tAO: { value: null }, uAORes: { value: new THREE.Vector2(1, 1) }, uAOStr: { value: 0 }, uOutA: { value: 1 }, uSkyK: { value: 1 },
    });
    // Sessio 26: volumetriset valokeilat (main.js asettaa ilman tiheyden).
    this.shafts = 0;
    this.volRT = makeRT(1, 1);
    this.volMat = mat(volFS, {
      tDepth: { value: depthTexture }, tShadow: { value: null },
      uShadowM0: { value: new THREE.Matrix4() }, uShadowM1: { value: new THREE.Matrix4() }, uCascEnd: { value: 40 },
      uInvViewProj: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() }, uCamFwd: { value: new THREE.Vector3() },
      uMaxDist: { value: 50 }, uFrame: { value: 0 },
    }, { toneMapped: false });
    this.frame = 0;
    // Sessio 25: silmän mukautuminen (1 x 1 -kirkkaus, kaksi vuorottelevaa).
    this.autoExposure = true;
    // Sessio 27: voimakkaampi ja hitaampi pimeään tottuminen (käyttäjä ei huomannut
    // efektiä); yön yläraja matalampi (selkeä yö hieman tummemmaksi).
    // Sessio 37: päivällä matalampi tavoitekirkkaus (dayRef; käyttäjä: päivä
    // näytti ylivalottuneelta). Yöllä ennallaan.
    this.ae = { ref: 0.3, dayRef: 0.22, strength: 0.82, min: 0.5, max: 2.8, nightMax: 1.9, humidNight: 1.5, darkTau: 1.7, brightTau: 0.5 };
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

    // Sessio 37: ambienttiokkluusio (0 = pois, 1 = kevyt, 2 = laadukas),
    // bloom, värimäärittely ja vinjetti (asetukset, main.js).
    this.ao = 0;
    this.bloom = true;
    this.grade = true;
    this.vignette = true;
    // Sessio 38: korkeampi kynnys ja tiiviimpi, heikompi hehku (käyttäjä: kuva
    // näytti sumealta; kirkas taivas ja usva hehkuivat koko kuvan yli).
    this.bloomCfg = { threshold: 2.0, knee: 0.7, intensity: 0.2, clamp: 12, spread: 0.65 };
    this.handAE = 0.3; // sessio 39: kädelle vain osa silmän mukautumisesta (eksponentti); sessio 40: 0,4 -> 0,3
    this.skyDim = 0.22; // sessio 40: taivas päivällä 22 % tummempi
    this.gradeCfg = { contrast: 1.1, saturation: 1.12, warmth: 1 };
    this.vigStrength = 0.24;
    this.aoCfg = { radius: 1.2, intensity: 1.0, strength: 0.5, fade: 70 }; // sessio 45: isommat muodot, kevyempi
    this.aoRT = makeRT(1, 1);
    this.aoRT2 = makeRT(1, 1);
    this._aoNS = 0;
    this.aoMat = mat(aoFS, {
      tDepth: { value: depthTexture }, uProjInv: { value: new THREE.Matrix4() },
      uTexel: { value: new THREE.Vector2() }, uHalfTexel: { value: new THREE.Vector2() },
      uProjScale: { value: 300 }, uRadius: { value: 0.85 }, uIntensity: { value: 1 }, uMaxPx: { value: 48 }, uFade: { value: 90 },
    }, { toneMapped: false, defines: { NS: 8, TURNS: '5.0' } });
    this.aoBlurMat = mat(aoBlurFS, { tAO: { value: null }, uDir: { value: new THREE.Vector2() } }, { toneMapped: false });
    // Viimeistelyvaihe: HDR-kuva (maailma + käsi), syvyyspuskuri kättä varten.
    this.hdrRT = makeRT(1, 1, { depthBuffer: true, samples: 4 });
    this.bloomMips = [0, 1, 2, 3, 4].map(() => makeRT(1, 1));
    this.bloomPreMat = mat(bloomPreFS, {
      tInput: { value: null }, uTexel: { value: new THREE.Vector2() }, uThresh: { value: new THREE.Vector4() },
      tLum: { value: null }, uAE: { value: new THREE.Vector4() },
    }, { toneMapped: false });
    this.bloomDownMat = mat(bloomDownFS, { tInput: { value: null }, uTexel: { value: new THREE.Vector2() } }, { toneMapped: false });
    this.bloomUpMat = mat(bloomUpFS, { tInput: { value: null }, uTexel: { value: new THREE.Vector2() }, uWeight: { value: 1 } }, {
      toneMapped: false, transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    this.finalMat = mat(finalFS, {
      tHDR: { value: this.hdrRT.texture }, tBloom: { value: this.bloomMips[0].texture }, uBloom: { value: 0 },
      uGrade: { value: new THREE.Vector4(1, 1, 1, 0) }, uVig: { value: 0 }, uAspect: { value: 1 },
      tLum: { value: null }, uAE: { value: new THREE.Vector4(0.3, 0, 0.6, 3) },
      uHandAE: { value: 0.4 },
    });

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
    this.volRT.setSize(hw, hh);
    this.aoRT.setSize(hw, hh);
    this.aoRT2.setSize(hw, hh);
    this.hdrRT.setSize(w, h);
    this.bloomMips.forEach((rt, i) => rt.setSize(Math.max(1, w >> (i + 1)), Math.max(1, h >> (i + 1))));
    this.compMat.uniforms.uAORes.value.set(hw, hh);
    this.aoMat.uniforms.uTexel.value.set(1 / w, 1 / h);
    this.aoMat.uniforms.uHalfTexel.value.set(1 / hw, 1 / hh);
    this.finalMat.uniforms.uAspect.value = w / h;
    this.compMat.uniforms.uVolTexel.value.set(1 / hw, 1 / hh);
    this.dofMat.uniforms.uTexel.value.set(1 / hw, 1 / hh);
    this.maskMat.uniforms.uAspect.value = w / h;
    this.compMat.uniforms.uAspect.value = w / h;
  }

  _pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCam);
  }

  // Viimeistelyvaihe käytössä (bloom, värimäärittely tai vinjetti).
  get finishing() {
    return this.bloom || this.grade || this.vignette;
  }

  // Piirrä maailma tehosteineen ruudulle. env: aurinko, sumu ja sää.
  // overlay = { scene, camera } (käsi): piirretään maailman päälle omalla
  // syvyydellään, viimeistelyvaiheessa samaan HDR-kuvaan (bloom ja sävytys).
  render(scene, camera, env, dt, overlay = null) {
    const r = this.renderer;
    if (!this.active) {
      r.setRenderTarget(null);
      r.clear();
      r.render(scene, camera);
      if (overlay) { r.clearDepth(); r.render(overlay.scene, overlay.camera); }
      this.hasPrev = false;
      return;
    }
    this._resize();
    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(scene, camera);
    this._ambientOcclusion(camera);

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
    cu.uRayStrength.value = rays * 0.95; // sessio 39: 1,35 -> 0,95 (liian valoisa)

    // --- Volumetriset valokeilat varjokartasta
    const sh = env.sun.shadow;
    const shadowTex = sh.map && sh.map.depthTexture;
    let shaft = 0;
    if (this.godRays && shadowTex && r.shadowMap.enabled && env.sun.castShadow && sunUp) {
      shaft = this.shafts * sh.intensity * Math.min(1, env.daylight * 1.5) * (1 - env.w.cloud * 0.55);
    }
    if (shaft > 0.01) {
      const vu = this.volMat.uniforms;
      vu.tShadow.value = shadowTex;
      vu.uShadowM0.value.copy(sh.getMatrix(0));
      vu.uShadowM1.value.copy(sh.getMatrix(1));
      vu.uCascEnd.value = sh._cascadeData[0].y;
      vu.uInvViewProj.value.copy(cu.uInvViewProj.value);
      vu.uCamPos.value.copy(camera.position);
      camera.getWorldDirection(vu.uCamFwd.value);
      this.frame = (this.frame + 1) % 64;
      vu.uFrame.value = this.frame;
      this._pass(this.volMat, this.volRT);
      cu.tVol.value = this.volRT.texture;
      cu.uVolCol.value.copy(env.sun.color).multiplyScalar(env.sun.intensity * 0.0075 * shaft);
    } else {
      cu.uVolCol.value.setRGB(0, 0, 0);
    }

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
      // Sessio 42: takaisin session 25 voimakkuuteen (sessio 39 sotki liikkeessä).
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
    // Sessio 39: auringon suuntaan hohtava sironta miedommaksi (0,9 -> 0,5,
    // sademetsässä vielä vähemmän): ennen koko kuva hukkui kultaiseen hehkuun.
    cu.uSkyK.value = 1 - this.skyDim * env.daylight;
    cu.uInscatter.value = 0.5 * env.daylight * (1 - env.w.cloud * 0.6) * (1 - 0.4 * (env.humid || 0));
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
      // Sessio 38: sademetsässä päivällä matalampi tavoite (latvuston alla
      // kirkas usva ylivalotti) ja yöllä enemmän mukautumista (näkyvyys).
      const hum = env.humid || 0;
      const nightMax = this.ae.nightMax + this.ae.humidNight * hum;
      cu.uAE.value.set(THREE.MathUtils.lerp(this.ae.ref, this.ae.dayRef - 0.05 * hum, env.daylight), this.ae.strength, this.ae.min, THREE.MathUtils.lerp(nightMax, this.ae.max, env.daylight));
    } else {
      cu.uAE.value.y = 0;
    }
    // Sessio 38: viimeistelyvaiheessa mukautuminen tehdään vasta lopussa,
    // jolloin se koskee myös kättä ja kädessä olevia esineitä (yöllä ne
    // eivät jää mustiksi muun maailman kirkastuessa).
    const fu = this.finalMat.uniforms;
    fu.tLum.value = cu.tLum.value;
    fu.uAE.value.copy(cu.uAE.value);
    this._aeInFinal = this.finishing && cu.uAE.value.y > 0;
    if (this._aeInFinal) cu.uAE.value.y = 0;

    const fin = this.finishing;
    cu.uOutA.value = fin ? 0 : 1;
    this._pass(this.compMat, fin ? this.hdrRT : null);
    if (overlay) {
      r.setRenderTarget(fin ? this.hdrRT : null);
      r.clearDepth();
      r.render(overlay.scene, overlay.camera);
    }
    if (fin) this._finish();
  }

  // Sessio 37: ambienttiokkluusio puolikkaalla tarkkuudella + sumennus.
  _ambientOcclusion(camera) {
    const cu = this.compMat.uniforms;
    if (!this.ao) { cu.uAOStr.value = 0; return; }
    const ns = this.ao >= 2 ? 16 : 8;
    const au = this.aoMat.uniforms;
    if (this._aoNS !== ns) {
      this._aoNS = ns;
      this.aoMat.defines.NS = ns;
      this.aoMat.defines.TURNS = ns >= 16 ? '7.0' : '5.0';
      this.aoMat.needsUpdate = true;
    }
    au.uProjInv.value.copy(camera.projectionMatrixInverse);
    // Pikseliä (puolikas kuva) metriä kohti 1 m etäisyydellä.
    au.uProjScale.value = (this.h >> 1) * 0.5 * camera.projectionMatrix.elements[5];
    au.uRadius.value = this.aoCfg.radius;
    au.uIntensity.value = this.aoCfg.intensity;
    au.uFade.value = this.aoCfg.fade;
    au.uMaxPx.value = this.ao >= 2 ? 56 : 40;
    this._pass(this.aoMat, this.aoRT);
    const bu = this.aoBlurMat.uniforms;
    bu.tAO.value = this.aoRT.texture;
    bu.uDir.value.set(2 / this.aoRT.width, 0); // sessio 45: leveämpi sumennus
    this._pass(this.aoBlurMat, this.aoRT2);
    bu.tAO.value = this.aoRT2.texture;
    bu.uDir.value.set(0, 2 / this.aoRT.height);
    this._pass(this.aoBlurMat, this.aoRT);
    cu.tAO.value = this.aoRT.texture;
    cu.uAOStr.value = this.aoCfg.strength;
  }

  // Sessio 37: bloom HDR-kuvasta ja viimeistely ruudulle.
  _finish() {
    const fu = this.finalMat.uniforms;
    if (this.bloom) {
      const b = this.bloomCfg;
      const mips = this.bloomMips;
      const pu = this.bloomPreMat.uniforms;
      pu.tInput.value = this.hdrRT.texture;
      pu.uTexel.value.set(1 / this.w, 1 / this.h);
      pu.uThresh.value.set(b.threshold, b.knee, this.renderer.toneMappingExposure, b.clamp);
      pu.tLum.value = fu.tLum.value;
      pu.uAE.value.copy(fu.uAE.value);
      if (!this._aeInFinal) pu.uAE.value.y = 0;
      this._pass(this.bloomPreMat, mips[0]);
      const du = this.bloomDownMat.uniforms;
      for (let i = 1; i < mips.length; i++) {
        du.tInput.value = mips[i - 1].texture;
        du.uTexel.value.set(1 / mips[i - 1].width, 1 / mips[i - 1].height);
        this._pass(this.bloomDownMat, mips[i]);
      }
      // Ylös: jokainen taso lisätään edelliseen (isommat tasot = leveämpi hehku).
      const uu = this.bloomUpMat.uniforms;
      for (let i = mips.length - 1; i > 0; i--) {
        uu.tInput.value = mips[i].texture;
        uu.uTexel.value.set(1 / mips[i].width, 1 / mips[i].height);
        uu.uWeight.value = b.spread;
        this._pass(this.bloomUpMat, mips[i - 1]);
      }
      fu.uBloom.value = b.intensity / mips.length;
    } else {
      fu.uBloom.value = 0;
    }
    const g = this.gradeCfg;
    fu.uGrade.value.set(g.contrast, g.saturation, g.warmth, this.grade ? 1 : 0);
    fu.uVig.value = this.vignette ? this.vigStrength : 0;
    fu.uHandAE.value = this.handAE;
    if (!this._aeInFinal) fu.uAE.value.y = 0;
    this._pass(this.finalMat, null);
  }

}
