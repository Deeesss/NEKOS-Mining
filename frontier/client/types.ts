export type Place = 'command' | 'hangar' | 'refinery' | 'silo' | 'market' | 'deposit';
export type View = 'city' | 'desert';
export type Protagonist = 'male' | 'female';
export type Outfit = 'field' | 'dusk';
export type Action = 'accept' | 'dispatch' | 'refine' | 'report' | 'upgrade' | 'field' | 'dusk' | 'buy-dusk';

export interface Flight {
  launchedAt: number;
  arrivesAt: number;
  departsAt: number;
  returnsAt: number;
  raw: number;
}

export interface Colony {
  protagonist: Protagonist;
  outfit: Outfit;
  ownsDuskwear: boolean;
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
    duskwearPrice: number;
  };
}
