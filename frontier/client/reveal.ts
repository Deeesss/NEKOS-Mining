import type { CrewPull, Recruit } from './types';

const outcomes = {
  won: '50/50 won',
  lost: '50/50 lost · Nim guaranteed on your next S-rank',
  guaranteed: 'Featured guarantee used',
  regular: 'A-rank recruitment'
};

export function pullSummary(profile: Recruit, pull: CrewPull) {
  const status = pull.duplicate ? 'Duplicate · fragment credited' : 'Joined the crew';
  return `${profile.rank}-rank ${profile.name} · ${status}${pull.outcome ? ' · ' + outcomes[pull.outcome] : ''}`;
}

export function createReveal() {
  const dialog = document.querySelector<HTMLDialogElement>('#crew-dialog')!;
  const overlay = dialog.querySelector<HTMLElement>('#pull-reveal')!;
  const art = dialog.querySelector<HTMLImageElement>('#pull-art')!;
  const result = dialog.querySelector<HTMLElement>('#pull-card')!;
  const button = dialog.querySelector<HTMLButtonElement>('#pull-action')!;
  const crew = dialog.querySelector<HTMLElement>('.crew')!;
  const portrait = dialog.querySelector<HTMLElement>('#crew-portrait')!;
  const scan = dialog.querySelector<HTMLButtonElement>('#crew-scan')!;
  let timer: number | undefined;

  function finish() {
    window.clearTimeout(timer);
    overlay.dataset.phase = 'result';
    result.hidden = false;
    button.textContent = 'Continue';
  }

  function close() {
    window.clearTimeout(timer);
    overlay.hidden = true;
    crew.inert = false;
    portrait.inert = false;
    if (dialog.open) (scan.disabled ? dialog.querySelector<HTMLButtonElement>('#crew-close')! : scan).focus();
  }

  function advance() {
    if (overlay.dataset.phase === 'signal') finish();
    else close();
  }

  button.addEventListener('click', advance);
  dialog.addEventListener('cancel', event => {
    if (overlay.hidden) return;
    event.preventDefault();
    advance();
  });
  dialog.addEventListener('close', close);

  return {
    show(profile: Recruit, pull: CrewPull, image: string) {
      if (!dialog.open) return;
      window.clearTimeout(timer);
      overlay.dataset.rank = profile.rank;
      overlay.dataset.phase = 'signal';
      overlay.querySelector('#pull-charge-label')!.textContent = profile.rank === 'S' ? 'S-rank signal' : 'Signal acquired';
      art.src = image;
      result.hidden = true;
      overlay.querySelector('#pull-rank')!.textContent = profile.rank + '-rank';
      overlay.querySelector('#pull-name')!.textContent = profile.name;
      overlay.querySelector('#pull-outcome')!.textContent = pull.outcome ? outcomes[pull.outcome] : '';
      overlay.querySelector('#pull-detail')!.textContent = pull.duplicate ? 'Duplicate · fragment credited' : profile.role + ' · Joined the crew';
      crew.inert = true;
      portrait.inert = true;
      overlay.hidden = false;
      button.textContent = 'Skip animation';
      button.focus();
      const duration = profile.rank === 'S' ? 1500 : 650;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
      else timer = window.setTimeout(finish, duration);
    }
  };
}
