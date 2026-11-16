export const rules = Object.freeze({
  site: { id: 'glass-basin', name: 'Glass Basin', outbound: 8, extraction: 12, inbound: 8, raw: 1000 },
  rawCapacity: 1000,
  refineSeconds: 10,
  yieldPercent: 70,
  target: 500
});

export class GameError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.status = status;
  }
}

const siloCapacity = level => 900 + 700 * (level - 1);
const upgradeCost = level => 150 + 100 * (level - 1);
const seconds = n => n * 1000;

export function createColony(protagonist, name) {
  return { protagonist, name, outfit: 'field', revision: 0, mission: 'briefing', raw: 0, refined: 0, delivered: 0, level: 1, flight: null, batch: null };
}

export function settle(colony, now, record) {
  const arrivals = [];
  if (colony.flight?.returnsAt <= now) arrivals.push({ type: 'delivery', at: colony.flight.returnsAt });
  if (colony.batch?.endsAt <= now) arrivals.push({ type: 'refining', at: colony.batch.endsAt });
  arrivals.sort((a, b) => a.at - b.at);
  for (const { type, at } of arrivals) {
    if (type === 'delivery') {
      colony.raw += colony.flight.raw;
      colony.flight = null;
      record('harvester_unloaded', at, rules.site.raw, 0);
    } else if (colony.refined + colony.batch.output <= siloCapacity(colony.level)) {
      colony.refined += colony.batch.output;
      colony.delivered += colony.batch.output;
      record('silo_delivered', colony.batch.blocked ? now : at, 0, colony.batch.output);
      colony.batch = null;
    } else {
      colony.batch.blocked = true;
    }
  }
}

export function command(colony, action, now, record) {
  switch (action) {
    case 'accept':
      if (colony.mission !== 'briefing') throw new GameError('The water reserve mission has already started.');
      colony.mission = 'active';
      return;
    case 'dispatch': {
      if (colony.mission === 'briefing') throw new GameError('Speak to Commander Iona first.');
      if (colony.flight) throw new GameError('The harvester is already in the field.');
      if (colony.raw + rules.site.raw > rules.rawCapacity) throw new GameError('Refine the raw stock to clear space for another load.');
      const arrivesAt = now + seconds(rules.site.outbound);
      const departsAt = arrivesAt + seconds(rules.site.extraction);
      colony.flight = { launchedAt: now, arrivesAt, departsAt, returnsAt: departsAt + seconds(rules.site.inbound), raw: rules.site.raw };
      return;
    }
    case 'refine': {
      if (colony.batch) throw new GameError('The refinery already has a batch.');
      if (!colony.raw) throw new GameError('Bring RAW SPICE back from the Glass Basin first.');
      const output = Math.floor(colony.raw * rules.yieldPercent / 100);
      record('refinery_loaded', now, -colony.raw, 0);
      colony.raw = 0;
      colony.batch = { startedAt: now, endsAt: now + seconds(rules.refineSeconds), output };
      return;
    }
    case 'report':
      if (colony.mission !== 'active' || colony.delivered < rules.target) {
        throw new GameError('The mission needs 500 units delivered to the silo.');
      }
      colony.mission = 'complete';
      return;
    case 'upgrade': {
      if (colony.mission !== 'complete') throw new GameError('Report the first shipment to Commander Iona to unlock upgrades.');
      const cost = upgradeCost(colony.level);
      if (colony.refined < cost) throw new GameError('The silo needs more REFINED SPICE for this upgrade.');
      colony.refined -= cost;
      colony.level++;
      record('silo_upgraded', now, 0, -cost);
      return;
    }
    case 'field':
    case 'dusk':
      if (action === 'dusk' && colony.level < 2) throw new GameError('Expand the silo to unlock Duskwear.');
      colony.outfit = action;
      return;
    default:
      throw new GameError('Unknown colony command.', 404);
  }
}

export function snapshot(colony, now) {
  return { ...colony, now, capacity: siloCapacity(colony.level), upgradeCost: upgradeCost(colony.level), rules };
}
