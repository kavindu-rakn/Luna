// Which constellation a point in the sky belongs to, by the IAU's official
// boundaries (Delporte 1930), with Roman's lookup (1987): precess the position to
// the boundaries' own equinox, B1875.0, then take the first row of the table that
// holds it. Used so the Moon's place among the stars can be said, not only seen.

import { BOUNDARIES, NAMES } from './boundaries.js';
import { apply, multiply, precessionMatrix, transpose, unitVector, toRaDec, centuriesSinceJ2000 } from './frame.js';

const FULL_NAMES = {
  And: 'Andromeda', Ant: 'Antlia', Aps: 'Apus', Aql: 'Aquila', Aqr: 'Aquarius', Ara: 'Ara', Ari: 'Aries',
  Aur: 'Auriga', Boo: 'Boötes', CMa: 'Canis Major', CMi: 'Canis Minor', CVn: 'Canes Venatici', Cae: 'Caelum',
  Cam: 'Camelopardalis', Cap: 'Capricornus', Car: 'Carina', Cas: 'Cassiopeia', Cen: 'Centaurus', Cep: 'Cepheus',
  Cet: 'Cetus', Cha: 'Chamaeleon', Cir: 'Circinus', Cnc: 'Cancer', Col: 'Columba', Com: 'Coma Berenices',
  CrA: 'Corona Australis', CrB: 'Corona Borealis', Crt: 'Crater', Cru: 'Crux', Crv: 'Corvus', Cyg: 'Cygnus',
  Del: 'Delphinus', Dor: 'Dorado', Dra: 'Draco', Equ: 'Equuleus', Eri: 'Eridanus', For: 'Fornax', Gem: 'Gemini',
  Gru: 'Grus', Her: 'Hercules', Hor: 'Horologium', Hya: 'Hydra', Hyi: 'Hydrus', Ind: 'Indus', LMi: 'Leo Minor',
  Lac: 'Lacerta', Leo: 'Leo', Lep: 'Lepus', Lib: 'Libra', Lup: 'Lupus', Lyn: 'Lynx', Lyr: 'Lyra', Men: 'Mensa',
  Mic: 'Microscopium', Mon: 'Monoceros', Mus: 'Musca', Nor: 'Norma', Oct: 'Octans', Oph: 'Ophiuchus', Ori: 'Orion',
  Pav: 'Pavo', Peg: 'Pegasus', Per: 'Perseus', Phe: 'Phoenix', Pic: 'Pictor', PsA: 'Piscis Austrinus', Psc: 'Pisces',
  Pup: 'Puppis', Pyx: 'Pyxis', Ret: 'Reticulum', Scl: 'Sculptor', Sco: 'Scorpius', Sct: 'Scutum', Ser: 'Serpens',
  Sex: 'Sextans', Sge: 'Sagitta', Sgr: 'Sagittarius', Tau: 'Taurus', Tel: 'Telescopium', TrA: 'Triangulum Australe',
  Tri: 'Triangulum', Tuc: 'Tucana', UMa: 'Ursa Major', UMi: 'Ursa Minor', Vel: 'Vela', Vir: 'Virgo', Vol: 'Volans',
  Vul: 'Vulpecula'
};

// B1875.0, in Julian centuries from J2000
const B1875 = (2405889.258550475 - 2451545) / 36525;
const TO_B1875 = precessionMatrix(B1875);

const lookUp = (v) => {
  const { ra, dec } = toRaDec(v);
  const hours = ra / 15;
  for (let i = 0; i < BOUNDARIES.length; i += 4) {
    if (dec >= BOUNDARIES[i + 2] && hours < BOUNDARIES[i + 1] && hours >= BOUNDARIES[i]) {
      return FULL_NAMES[NAMES[BOUNDARIES[i + 3]]];
    }
  }
  return null;
};

// The constellation holding a J2000 position (degrees)
export const constellationAt = (ra, dec) => lookUp(apply(TO_B1875, unitVector(ra, dec)));

// The same for a position in the equator of its own date, as getMoonView gives
// the Moon's
export const constellationOfDate = (ra, dec, time) =>
  lookUp(apply(multiply(TO_B1875, transpose(precessionMatrix(centuriesSinceJ2000(time)))), unitVector(ra, dec)));
