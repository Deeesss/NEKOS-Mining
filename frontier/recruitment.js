import { randomInt } from 'node:crypto';

export const recruitment = Object.freeze({
  sRate: 10,
  hardPity: 5,
  featured: 'nim',
  roster: [
    { id: 'nim', name: 'Nim', rank: 'S', role: 'Feline outrider', benefit: 'Cuts outbound and return travel by 2 seconds each.' },
    { id: 'mira', name: 'Mira Vesper', rank: 'S', role: 'Antelope engineer', benefit: 'Cuts each refinery batch from 10 seconds to 6.' },
    { id: 'varren', name: 'Varren', rank: 'A', role: 'Fox chemist', benefit: 'Raises refinery yield from 70% to 75%.' }
  ]
});

export function newCrew(tickets = 0) {
  return { tickets, fragments: 0, misses: 0, guaranteed: false, owned: [], active: null, last: null };
}

export function drawRecruit(crew, roll = randomInt) {
  const highRank = crew.misses + 1 >= recruitment.hardPity || roll(100) < recruitment.sRate;
  const featured = highRank && (crew.guaranteed || roll(2) === 0);
  const recruit = highRank ? (featured ? 'nim' : 'mira') : 'varren';
  if (highRank) {
    crew.guaranteed = !featured;
    crew.misses = 0;
  } else {
    crew.misses++;
  }
  crew.tickets--;
  const duplicate = crew.owned.includes(recruit);
  if (!duplicate) crew.owned.push(recruit);
  else {
    crew.fragments++;
    if (crew.fragments === 2) {
      crew.tickets++;
      crew.fragments = 0;
    }
  }
  crew.last = { recruit, duplicate };
}

export function crewBonus(active) {
  return {
    travel: active === 'nim' ? 2 : 0,
    yield: active === 'varren' ? 5 : 0,
    refining: active === 'mira' ? 4 : 0
  };
}
