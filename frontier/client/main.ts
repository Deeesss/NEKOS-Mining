import './style.css';
import type { mountWorld } from './world';
import { conversation } from './story';
import type { Action, Colony, Outfit, Place, View } from './types';
import male from './portraits/male.webp';
import female from './portraits/female.webp';
import iona from './portraits/iona.webp';
import maleDusk from './portraits/male-dusk.webp';
import femaleDusk from './portraits/female-dusk.webp';

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const label = (id: string, text: string | number) => { el(id).textContent = String(text); };
const show = (id: string, visible: boolean) => { el(id).hidden = !visible; };
const pressed = (id: string, active: boolean) => el(id).setAttribute('aria-pressed', String(active));
const numbers = new Intl.NumberFormat('en');
const int = (n: number) => numbers.format(n);
const portraits = { male: { field: male, dusk: maleDusk }, female: { field: female, dusk: femaleDusk } };
const locations: Record<Place, string> = {
  command: 'Command', hangar: 'Hangar', refinery: 'Refinery', silo: 'Silo', deposit: 'Glass Basin'
};

let state: Colony | null = null;
let receivedAt = 0;
let view: View = 'city';
let place: Place = 'command';
let world: ReturnType<typeof mountWorld> | undefined;
let drawing: Colony | null = null;
let loadingWorld = false;
let busy = false;
let fetching = false;
let online = false;
let ready = false;
let dialogue: ReturnType<typeof conversation> | undefined;
let line = 0;

el<HTMLImageElement>('select-male').src = male;
el<HTMLImageElement>('select-female').src = female;
el<HTMLImageElement>('npc-portrait').src = iona;

const gameTime = () => state ? state.now + performance.now() - receivedAt : Date.now();
const secondsLeft = (time: number) => Math.max(0, Math.ceil((time - gameTime()) / 1_000));

async function request(path = '', body?: object): Promise<Colony | null> {
  const response = await fetch('/api/frontier' + path, {
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(8_000)
  });
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Colony service unavailable.');
  return result;
}

function receive(next: Colony | null) {
  online = true;
  const before = state;
  if (next && before && (next.revision < before.revision || next.now < before.now)) return;
  state = next;
  receivedAt = performance.now();
  if (before && next && before.flight && !next.flight) label('feedback', 'Harvester returned. RAW SPICE is ready at the refinery.');
  if (before && next && before.delivered < next.delivered) label('feedback', `${int(next.delivered - before.delivered)} REFINED SPICE delivered to the silo.`);
}

async function refresh() {
  if (fetching || busy) return;
  fetching = true;
  try {
    const next = await request();
    if (!busy) {
      if (!online) label('feedback', '');
      receive(next);
    }
    ready = true;
  } catch {
    online = false;
    label('feedback', 'Connection interrupted. Saved work will appear when the colony reconnects.');
  } finally {
    fetching = false;
    render();
  }
}

function setPlace(next: Place) {
  place = next;
  view = next === 'deposit' ? 'desert' : 'city';
  drawing = null;
  render();
}

interface ButtonSpec { name: string; run: () => void; enabled?: boolean }
const rendered = new WeakMap<HTMLElement, string>();
function buttons(id: string, specs: ButtonSpec[]) {
  const list = el(id);
  const key = JSON.stringify(specs.map(spec => spec.name));
  if (rendered.get(list) !== key) {
    list.replaceChildren(...specs.map(spec => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = spec.name;
      return button;
    }));
    rendered.set(list, key);
  }
  specs.forEach((spec, index) => {
    const button = list.children[index] as HTMLButtonElement;
    button.disabled = spec.enabled === false;
    button.onclick = spec.run;
    if (id === 'panel-actions') button.classList.toggle('primary', index === 0);
  });
}

function activity(start = 0, end = 0) {
  const bar = el<HTMLProgressElement>('activity-progress');
  bar.hidden = !start;
  if (start && end > start) bar.value = 100 * Math.min(1, Math.max(0, (gameTime() - start) / (end - start)));
}

function flightStatus(colony: Colony) {
  const flight = colony.flight;
  if (!flight) return 'Harvester H-01 docked';
  activity(flight.launchedAt, flight.returnsAt);
  const now = gameTime();
  if (now < flight.arrivesAt) return `H-01 outbound · ${secondsLeft(flight.arrivesAt)}s to the basin`;
  if (now < flight.departsAt) {
    const load = Math.floor(flight.raw * (now - flight.arrivesAt) / (flight.departsAt - flight.arrivesAt));
    return `H-01 extracting · ${int(load)} / ${int(flight.raw)} RAW`;
  }
  return now < flight.returnsAt ? `H-01 returning · ${secondsLeft(flight.returnsAt)}s to Emberwell` : 'H-01 unloading';
}

function panel(colony: Colony) {
  const can = !busy && online;
  const report = colony.mission === 'active' && colony.delivered >= colony.rules.target;
  let detail: string;
  let description: string;
  let actions: ButtonSpec[];
  activity();
  switch (place) {
    case 'command':
      description = 'Commander Iona oversees the settlement’s mining operation.';
      detail = colony.mission === 'complete' ? 'Expansion plans unlocked' : 'Mission · The First Reserve';
      actions = [{ name: report ? 'Report to Commander Iona' : 'Talk to Commander Iona', run: openConversation, enabled: can }];
      if (colony.level >= 2) actions.push({ name: 'Open wardrobe', run: openWardrobe });
      break;
    case 'hangar':
      description = 'H-01 can carry one load from the Glass Basin. Track it on the desert map.';
      detail = flightStatus(colony);
      actions = [{ name: 'Open desert map', run: () => setPlace('deposit') }];
      break;
    case 'deposit':
      description = `A shallow deposit east of Emberwell. One expedition returns ${int(colony.rules.site.raw)} RAW SPICE.`;
      detail = flightStatus(colony);
      actions = [{ name: 'Dispatch harvester', run: () => void order('dispatch'),
        enabled: can && colony.mission !== 'briefing' && !colony.flight && colony.raw + colony.rules.site.raw <= colony.rules.rawCapacity }];
      if (colony.raw) actions.push({ name: 'Go to refinery', run: () => setPlace('refinery') });
      if (colony.mission === 'briefing') actions.push({ name: 'Go to briefing', run: () => setPlace('command') });
      break;
    case 'refinery':
      description = `Refine RAW SPICE at ${colony.rules.yieldPercent}% yield. Finished SPICE moves into the silo when there is room.`;
      detail = `${int(colony.raw)} RAW in the hopper`;
      if (colony.batch) {
        const batch = colony.batch;
        const left = secondsLeft(batch.endsAt);
        detail += left ? `\nRefining · ${left}s remaining` : '\nBatch complete · waiting for silo space';
        activity(batch.startedAt, batch.endsAt);
      }
      actions = [{ name: 'Start refining', run: () => void order('refine'), enabled: can && !!colony.raw && !colony.batch },
        { name: 'Inspect silo', run: () => setPlace('silo') }];
      break;
    case 'silo':
      description = 'The silo holds clean SPICE. Invest reserves in more storage as Emberwell grows.';
      detail = `Level ${colony.level} · ${int(colony.refined)} / ${int(colony.capacity)} REFINED SPICE\nNext expansion · ${int(colony.upgradeCost)} SPICE`;
      actions = [{ name: 'Expand silo', run: () => void order('upgrade'), enabled: can && colony.mission === 'complete' && colony.refined >= colony.upgradeCost }];
      if (report) actions.push({ name: 'Return to Command', run: () => setPlace('command') });
      break;
  }
  label('panel-title', locations[place]);
  label('panel-description', description);
  label('panel-detail', detail);
  buttons('panel-actions', actions);
}

function render() {
  show('startup', !ready && !el('feedback').textContent);
  show('setup', ready && !state);
  show('play', !!state);
  show('operator', !!state);
  show('retry', !online && !!el('feedback').textContent);
  el<HTMLButtonElement>('retry').disabled = fetching;
  el<HTMLFormElement>('create').querySelector('button')!.disabled = busy || !online;
  if (!state) return;

  const colony = state;
  if (!world && !loadingWorld) {
    loadingWorld = true;
    void import('./world').then(({ mountWorld }) => {
      world = mountWorld(setPlace);
      render();
    }).catch(() => {
      label('feedback', 'The map could not load. Use the location controls or reload to retry.');
    });
  }
  if (world && drawing !== colony) {
    world.set(view, place, colony, gameTime);
    drawing = colony;
  }
  pressed('city', view === 'city');
  pressed('desert', view === 'desert');
  label('colony-title', view === 'city' ? 'Emberwell' : 'Glass Basin frontier');
  label('operator-name', colony.name);
  el<HTMLImageElement>('avatar').src = portraits[colony.protagonist][colony.outfit];
  label('mission-summary', colony.mission === 'complete' ? 'The First Reserve complete · Colony upgrades open' :
    colony.mission === 'briefing' ? 'Meet Commander Iona at Command' :
      `The First Reserve · Deliver ${int(colony.rules.target)} REFINED SPICE to the silo`);
  label('raw', int(colony.raw));
  label('refined', int(colony.refined) + ' / ' + int(colony.capacity));
  label('silo-level', colony.level);
  label('objective', int(Math.min(colony.rules.target, colony.delivered)) + ' / ' + int(colony.rules.target));
  const places: Place[] = view === 'city' ? ['command', 'hangar', 'refinery', 'silo'] : ['deposit'];
  buttons('places', places.map(key => ({ name: locations[key], run: () => setPlace(key) })));
  places.forEach((key, index) => el('places').children[index].setAttribute('aria-pressed', String(key === place)));
  panel(colony);
}

function renderDialogue() {
  if (!dialogue) return;
  label('dialogue-line', dialogue.lines[line]);
  label('dialogue-next', line + 1 < dialogue.lines.length ? 'Continue' : dialogue.final);
}

function openConversation() {
  if (!state) return;
  dialogue = conversation(state);
  line = 0;
  renderDialogue();
  el<HTMLDialogElement>('conversation').showModal();
}

function renderWardrobe() {
  if (!state) return;
  el<HTMLImageElement>('outfit-preview').src = portraits[state.protagonist][state.outfit];
  pressed('field-outfit', state.outfit === 'field');
  pressed('dusk-outfit', state.outfit === 'dusk');
}

function openWardrobe() {
  renderWardrobe();
  el<HTMLDialogElement>('wardrobe').showModal();
}

async function order(action: Action) {
  if (!state || busy) return false;
  busy = true;
  label('feedback', '');
  render();
  try {
    const next = await request('/command', { action, revision: state.revision, site: state.rules.site.id });
    receive(next);
    if (action === 'upgrade' && next) label('feedback', next.level === 2 ? 'Silo expanded. Duskwear unlocked at Command.' : 'Silo capacity expanded.');
    if (action === 'report') label('feedback', 'Mission complete. Colony upgrades unlocked.');
    return true;
  } catch (error) {
    label('feedback', error instanceof Error ? error.message : 'Order failed.');
    return false;
  } finally {
    busy = false;
    render();
  }
}

el<HTMLFormElement>('create').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const form = new FormData(el<HTMLFormElement>('create'));
  busy = true;
  label('feedback', '');
  render();
  try {
    receive(await request('/colony', { name: form.get('name'), protagonist: form.get('protagonist') }));
    render();
    openConversation();
  } catch (error) {
    label('feedback', error instanceof Error ? error.message : 'Could not create your colony.');
  } finally {
    busy = false;
    render();
  }
});
el('dialogue-next').onclick = async () => {
  if (!dialogue) return;
  if (line + 1 < dialogue.lines.length) {
    line++;
    renderDialogue();
  } else if (!dialogue.action || await order(dialogue.action)) {
    el<HTMLDialogElement>('conversation').close();
  }
};
el('dialogue-close').onclick = () => el<HTMLDialogElement>('conversation').close();
el('wardrobe-close').onclick = () => el<HTMLDialogElement>('wardrobe').close();
async function equip(outfit: Outfit) {
  if (state?.outfit !== outfit && await order(outfit)) renderWardrobe();
}
el('field-outfit').onclick = () => void equip('field');
el('dusk-outfit').onclick = () => void equip('dusk');
el('city').onclick = () => setPlace('command');
el('desert').onclick = () => setPlace('deposit');
el('zoom-out').onclick = () => world?.zoom(-.2);
el('zoom-in').onclick = () => world?.zoom(.2);
el('reset-view').onclick = () => world?.reset();
el('retry').onclick = () => void refresh();
void refresh();
setInterval(() => { if (state) panel(state); }, 250);
setInterval(() => { if (state || !ready) void refresh(); }, 2_000);
