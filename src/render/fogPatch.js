// Sessio 58: korkeusriippuvainen sumu (käyttäjä: kaukaiset vuoret saisivat
// erottua jo kauempaa usvaisina, kaukaisina hahmoina).
//
// Three.js:n lineaarinen sumu peitti kaiken näkyvyysrajan takana kokonaan
// (sademetsässä jo noin 200 m:ssä), joten karstimassiivit katosivat. Nyt
// kohteet, jotka ovat selvästi kameran yläpuolella (massiivien seinät ja laet,
// vuoret), häipyvät usvaan vain osittain ja etäisyyden mukaan
// (ilmaperspektiivi): vuori näyttää nousevan usvan seasta. Maanpinnan ja
// latvuston tasolla (usvan alapuolella) sumu on ennallaan.
//
// Usva lepää laakson pohjalla: sen yläraja (fogMist.x, kameran suhteen) on
// noin 18 m laakson pohjan yläpuolella (main.js päivittää). Massiivin laelta
// katsottaessa muut huiput nousevat usvan yläpuolelle, laaksosta katsottaessa
// vain korkeat seinät ja laet.
//
// Korkeus kameran yläpuolella lasketaan näkymäkoordinaateista: maailman
// y-suunta näkymässä on viewMatrixin toinen sarake. Kaikki sumua käyttävät
// varjostimet (myös omat ShaderMaterialit) laskevat mvPositionin ennen
// fog_vertexiä, joten muutos toimii kaikissa. Yhteinen uniform jaetaan kaikille
// materiaaleille samana oliona (kloonaus palauttaa saman vektorin).
import * as THREE from 'three';

const C = THREE.ShaderChunk;

class SharedVec2 extends THREE.Vector2 {
  clone() { return this; }
}
export const fogMist = new SharedVec2(16, 0);
THREE.UniformsLib.fog.fogMist = { value: fogMist };
for (const k of Object.keys(THREE.ShaderLib)) {
  const u = THREE.ShaderLib[k].uniforms;
  if (u && u.fogColor && !u.fogMist) u.fogMist = { value: fogMist };
}

C.fog_pars_vertex = `#ifdef USE_FOG
	varying float vFogDepth;
	varying float vFogH;
#endif`;

C.fog_vertex = `#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
	vFogH = dot( viewMatrix[ 1 ].xyz, mvPosition.xyz );
#endif`;

C.fog_pars_fragment = C.fog_pars_fragment.replace('varying float vFogDepth;', 'varying float vFogDepth;\n\tvarying float vFogH;\n\tuniform vec2 fogMist;');

C.fog_fragment = `#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	float fogHigh = smoothstep( 0.0, 28.0, vFogH - fogMist.x );
	fogFactor = mix( fogFactor, min( fogFactor, 0.93 * ( 1.0 - exp( - vFogDepth / 520.0 ) ) ), fogHigh );
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;
