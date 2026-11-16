import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawRecruit, newCrew } from '../frontier/recruitment.js';
import { command, createColony } from '../frontier/economy.js';

test('five-pull pity reaches S-rank; losing 50/50 guarantees the next S-rank', () => {
  const crew = newCrew(8);
  const lose = max => max === 2 ? 1 : 99;
  for (let i = 0; i < 4; i++) {
    drawRecruit(crew, lose);
    assert.equal(crew.last.recruit, 'varren');
  }
  assert.equal(crew.misses, 4);
  assert.equal(crew.fragments, 1);
  assert.equal(crew.tickets, 5);
  drawRecruit(crew, lose);
  assert.equal(crew.last.recruit, 'mira');
  assert.equal(crew.guaranteed, true);
  assert.equal(crew.misses, 0);
  const loaded = JSON.parse(JSON.stringify(crew));
  drawRecruit(loaded, max => {
    assert.equal(max, 100, 'guaranteed S-rank cannot roll the 50/50 again');
    return 0;
  });
  assert.equal(loaded.last.recruit, 'nim');
  assert.equal(loaded.guaranteed, false);
  assert.deepEqual(loaded.owned, ['varren', 'mira', 'nim']);
});

test('owned specialists alter future operations with their own roles', () => {
  const colony = createColony('male', 'Vale');
  const now = 60_000;
  const order = (action, recruit) => command(colony, { action, recruit }, now, () => {});
  assert.throws(() => order('recruit'), /First Reserve/);
  order('accept');
  assert.throws(() => order('assign-crew', 'nim'), /Recruit/);
  colony.crew.owned = ['nim', 'varren', 'mira'];
  order('assign-crew', 'nim');
  order('dispatch');
  assert.equal(colony.flight.arrivesAt - now, 6_000);
  assert.equal(colony.flight.returnsAt - colony.flight.departsAt, 6_000);
  order('assign-crew', 'varren');
  assert.equal(colony.flight.returnsAt - colony.flight.departsAt, 6_000);
  colony.raw = 1000;
  order('refine');
  assert.equal(colony.batch.output, 750);
  order('assign-crew', 'mira');
  assert.equal(colony.batch.endsAt - now, 10_000);
  colony.batch = null;
  colony.raw = 1000;
  order('refine');
  assert.equal(colony.batch.output, 700);
  assert.equal(colony.batch.endsAt - now, 6_000);
});
