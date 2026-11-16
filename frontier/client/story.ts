import type { Colony } from './types';

export function conversation(colony: Colony) {
  if (colony.mission === 'briefing') {
    const greeting = colony.protagonist === 'female'
      ? `Welcome to Emberwell, ${colony.name}. The crew has been waiting for their new steward. Walk with me.`
      : `Steward ${colony.name}, welcome aboard. I've kept a place for you on the operations deck.`;
    return {
      lines: [greeting,
        'The settlement’s water filters need a fresh charge. Send H-01 to bring RAW SPICE home from the Glass Basin.',
        'Refine the haul and get 500 units of clean SPICE into the silo. Then come back here and we’ll open the expansion plans.'],
      final: 'Accept mission', action: 'accept' as const
    };
  }
  if (colony.mission === 'active' && colony.delivered >= colony.rules.target) {
    return {
      lines: [`I saw the delivery come in, ${colony.name}. The crew can bring the filters back online.`,
        'The expansion plans are ready. Use REFINED SPICE to build another tank and make room for your next shipment.'],
      final: 'Complete mission', action: 'report' as const
    };
  }
  const line = colony.mission === 'complete'
    ? `The colony can plan past tomorrow again, ${colony.name}. Check the silo for the next capacity upgrade.`
    : 'Send H-01 from the hangar. When it returns, load the refinery and the finished batch will move to the silo.';
  return { lines: [line], final: 'Back to colony', action: null };
}
