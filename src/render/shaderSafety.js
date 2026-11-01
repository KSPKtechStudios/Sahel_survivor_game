// Sessio 58: mustat pikselit lehtien reunoilla (käyttäjä: tiheikköpensaan
// lehtien vieressä näkyy mustia pikseleitä, kun katsoo tarkasti).
//
// Syy: reunanpehmennyksessä (MSAA) reunapikselin varjostin ajetaan pikselin
// keskellä, joka voi olla kolmion ulkopuolella. Silloin kärkipisteiden arvot
// (värit, normaalit) ekstrapoloituvat, ja pienissä, kaukaisissa lehtikorteissa
// väri voi mennä selvästi negatiiviseksi. Liukulukukuvassa negatiivinen näyte
// vetää koko pikselin näytteiden keskiarvon mustaksi, vaikka suurin osa
// pikselistä olisi valoisaa. Mittaus: 1–3 negatiivista pikseliä ruudussa
// sademetsässä, kun varjostimien negatiiviset tulokset merkittiin; sekoitus
// (läpikuultavat hiukkaset) ei ollut syy.
//
// Korjaus: kaikissa Three.js:n materiaaleissa (myös omissa laajennuksissa,
// jotka käyttävät samoja paloja) väri ja lopullinen valo rajataan nollaan.
// Tämä moduuli on tuotava ennen kuin yhtään materiaalia käännetään.
import * as THREE from 'three';

const C = THREE.ShaderChunk;
C.color_fragment += '\n\tdiffuseColor.rgb = max( diffuseColor.rgb, 0.0 );';
C.opaque_fragment = C.opaque_fragment.replace(
  'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
  'gl_FragColor = vec4( max( outgoingLight, 0.0 ), diffuseColor.a );',
);
