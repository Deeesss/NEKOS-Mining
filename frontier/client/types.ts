import type { MarketNetwork } from './checkout';

export type Place = 'command' | 'hangar' | 'refinery' | 'silo' | 'market' | 'relay' | 'deposit';
export type View = 'city' | 'desert';
export type Protagonist = 'male' | 'female';
export type Outfit = 'field' | 'dusk';
export type Action = 'accept' | 'dispatch' | 'refine' | 'report' | 'upgrade' | 'recruit' | 'assign-crew' | 'field' | 'dusk';

export interface Flight {
  launchedAt: number;
  arrivesAt: number;
  departsAt: number;
  returnsAt: number;
  raw: number;
}

export type CrewId = 'nim' | 'varren' | 'mira';
export interface CrewPull {
  recruit: CrewId;
  duplicate: boolean;
  outcome?: 'won' | 'lost' | 'guaranteed' | 'regular';
}
export interface Recruit {
  id: CrewId;
  name: string;
  rank: 'A' | 'S';
  role: string;
  benefit: string;
}

export interface Colony {
  crew: {
    tickets: number;
    fragments: number;
    misses: number;
    guaranteed: boolean;
    owned: CrewId[];
    active: CrewId | null;
    last: CrewPull | null;
  };
  crewEffects: { travel: number; yield: number; refining: number };
  recruitment: { sRate: number; hardPity: number; featured: CrewId; roster: Recruit[] };
  protagonist: Protagonist;
  outfit: Outfit;
  ownsDuskwear: boolean;
  market: MarketNetwork | null;
  payment: 'finalizing' | 'unavailable' | null;
  refundPending: number;
  name: string;
  revision: number;
  mission: 'briefing' | 'active' | 'complete';
  raw: number;
  refined: number;
  delivered: number;
  capacity: number;
  upgradeCost: number;
  level: number;
  flight: Flight | null;
  batch: { startedAt: number; endsAt: number; output: number } | null;
  now: number;
  rules: {
    site: { id: string; name: string; outbound: number; extraction: number; inbound: number; raw: number };
    rawCapacity: number;
    refineSeconds: number;
    yieldPercent: number;
    target: number;
  };
}
