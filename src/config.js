// Pelin säädettävät perusarvot yhdessä paikassa.
export const CONFIG = {
  seed: 20261006,

  // Maailma
  chunkSize: 64,          // metriä
  chunkSegments: 32,      // maaston verkon tarkkuus / chunk (64 m / 32 = 2 m)
  viewRadius: 5,          // montako chunkia näkyy joka suuntaan
  grassRadius: 2,         // ruohotupsut vain lähimpiin chunkeihin
  chunksPerFrame: 2,      // montako chunkia saa rakentaa yhden ruudun aikana
  waterLevel: -0.6,

  // Aika
  dayLengthSec: 20 * 60,  // yksi vuorokausi = 20 min
  startHour: 7.5,

  // Pelaaja
  eyeHeight: 1.65,
  playerRadius: 0.35,
  walkSpeed: 4.2,
  sprintSpeed: 7.2,
  jumpSpeed: 6.0,
  gravity: 20,
  reach: 3.2,             // kuinka kaukaa esineisiin ylettyy

  // Kestävyys (stamina)
  staminaMax: 100,
  staminaSprintPerSec: 12,      // sessio 18: ennen 14
  staminaJump: 10,
  staminaRegenPerSec: 18,
  staminaRegenDelay: 1.0,
  staminaSwimPerSec: 3.9,     // uidessa (liikkuessa); sessio 18: ennen 4,5
  staminaTreadPerSec: 1.3,    // uidessa paikallaan

  // Terveys
  healthMax: 100,
  healthRegenPerSec: 1.5,
  healthRegenDelay: 6,        // sekuntia viimeisestä osumasta
  drownPerSec: 9,             // hukkuminen, kun kestävyys on loppu uidessa

  // Kyykky
  crouchEyeHeight: 1.08,
  crouchSpeed: 0.5,           // kerroin kävelynopeuteen

  // Reppu
  hotbarSize: 8,
  backpackSize: 24,

  // Tallennus
  saveKey: 'sahel.save.v1',
  autosaveSec: 20,
};
