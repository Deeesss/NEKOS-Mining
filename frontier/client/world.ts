import Phaser from 'phaser';
import type { Colony, Place, View } from './types';

type Point = { x: number; y: number };
const point = (x: number, y: number): Point => ({ x, y });
const iso = (column: number, row: number) => point(240 + (column - row) * 22, 137 + (column + row) * 11);
const blend = (a: Point, b: Point, n: number) => point(Math.round(a.x + (b.x - a.x) * n), Math.round(a.y + (b.y - a.y) * n));
const progress = (now: number, start: number, end: number) => Phaser.Math.Clamp((now - start) / (end - start), 0, 1);
const spots = {
  command: iso(-3, -2), hangar: iso(-2, 2), refinery: iso(3, -2), silo: iso(2, 3), market: iso(-5, 0), deposit: point(369, 104)
};
const camp = point(100, 201);
const bend = point(252, 152);

function diamond(center: Point, x: number, y: number): Point[] {
  return [point(center.x, center.y - y), point(center.x + x, center.y),
    point(center.x, center.y + y), point(center.x - x, center.y)];
}

class FrontierScene extends Phaser.Scene {
  view: View = 'city';
  place: Place = 'command';
  state?: Colony;
  now = Date.now;
  private layer?: Phaser.GameObjects.Graphics;
  private vehicles?: Phaser.GameObjects.Graphics;
  private down?: Point;
  private dragged = false;

  constructor(private pick: (place: Place) => void) { super('frontier'); }

  create() {
    this.layer = this.add.graphics();
    this.vehicles = this.add.graphics();
    this.cameras.main.setBounds(-95, -63, 670, 396);
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.down = point(pointer.x, pointer.y);
      this.dragged = false;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || !this.down) return;
      this.dragged ||= Phaser.Math.Distance.Between(pointer.x, pointer.y, this.down.x, this.down.y) > 3;
      if (this.dragged) {
        const camera = this.cameras.main;
        camera.scrollX -= (pointer.x - pointer.prevPosition.x) / camera.zoom;
        camera.scrollY -= (pointer.y - pointer.prevPosition.y) / camera.zoom;
      }
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.dragged || !this.down) return;
      this.down = undefined;
      const p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const places: Place[] = this.view === 'city' ? ['command', 'hangar', 'refinery', 'silo', 'market'] : ['deposit'];
      const found = places.find(place => Math.abs(spots[place].x - p.x) < 37 &&
        p.y > spots[place].y - 41 && p.y < spots[place].y + 18);
      if (found) this.pick(found);
    });
    this.input.on('pointerupoutside', () => { this.down = undefined; });
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _objects: unknown[], _x: number, y: number) => this.zoom(y < 0 ? .16 : -.16));
    this.draw();
  }

  set(view: View, place: Place, state: Colony, now: () => number) {
    if (this.view !== view) this.reset();
    this.view = view;
    this.place = place;
    this.state = state;
    this.now = now;
    this.draw();
  }

  zoom(delta: number) {
    const camera = this.cameras?.main;
    if (camera) camera.setZoom(Phaser.Math.Clamp(camera.zoom + delta, 1, 2.3));
  }

  reset() { this.cameras?.main.setZoom(1).setScroll(0, 0); }

  private box(g: Phaser.GameObjects.Graphics, p: Point, width: number, height: number, roof: number, sides: [number, number]) {
    const foot = diamond(p, width, Math.round(width / 2));
    const top = foot.map(v => point(v.x, v.y - height));
    g.fillStyle(0x342623, .65).fillPoints(foot.map(v => point(v.x + 6, v.y + 6)), true);
    g.fillStyle(sides[0]).fillPoints([top[3], top[2], foot[2], foot[3]], true);
    g.fillStyle(sides[1]).fillPoints([top[1], top[2], foot[2], foot[1]], true);
    g.fillStyle(roof).fillPoints(top, true);
    g.lineStyle(1, 0xe7ad78, .47).strokePoints(top, true);
  }

  private draw() {
    const g = this.layer;
    if (!g) return;
    g.clear();
    if (this.view === 'desert') this.drawDesert(g);
    else this.drawCity(g);
    g.lineStyle(1, 0xffda98, 1).strokePoints(diamond(spots[this.place], this.place === 'silo' ? 39 : 36, 18), true);
  }

  private terrain(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x4d3632).fillRect(-95, -63, 670, 396);
    g.fillStyle(0xbe7750).fillRect(-95, 29, 670, 60);
    g.fillStyle(0xf0b078).fillCircle(364, 69, 35);
    g.fillStyle(0xa46146).fillPoints([
      point(-95, 96), point(20, 79), point(103, 112), point(166, 85), point(222, 105),
      point(295, 81), point(359, 98), point(474, 73), point(575, 85), point(575, 361), point(-95, 361)
    ], true);
    g.fillStyle(0x794b3c).fillPoints([
      point(-95, 113), point(22, 104), point(97, 133), point(204, 109), point(292, 132),
      point(382, 106), point(575, 117), point(575, 361), point(-95, 361)
    ], true);
    for (let i = 0; i < 92; i++) {
      const x = (i * 83 + 19) % 584 - 52;
      const y = (i * 61) % 188 + 121;
      g.fillStyle(i % 3 ? 0x996147 : 0x604037, .7).fillRect(x, y, 1 + (i % 5) * 2, 1);
    }
  }

  private drawCity(g: Phaser.GameObjects.Graphics) {
    this.terrain(g);
    const tiles = [0xb18159, 0xbe8b61, 0xa87552, 0xb7855c];
    for (let row = -4; row <= 5; row++) {
      for (let col = -6; col <= 5; col++) {
        if (Math.abs(row) + Math.abs(col) > 9) continue;
        const p = iso(col, row);
        const deck = row === 0 || col === 0;
        g.fillStyle(deck ? (col % 2 ? 0x655850 : 0x75635a) : tiles[Math.abs((col * 3 + row * 5) % 4)])
          .fillPoints(diamond(p, 22, 11), true);
        g.lineStyle(1, deck ? 0xb09576 : 0x79604d, .55).strokePoints(diamond(p, 22, 11), true);
        if (deck) g.fillStyle(0xd3ac75, .75).fillRect(p.x - 3, p.y, 6, 1);
      }
    }

    for (const p of [iso(-5, -3), iso(4, -4), iso(5, 0), iso(5, 2)]) {
      this.box(g, p, 16, 9, 0x957d68, [0x625249, 0x463d39]);
      g.fillStyle(0xc4a885).fillRect(p.x - 5, p.y - 12, 10, 2);
    }
    this.box(g, spots.market, 24, 13, 0xad755c, [0x826145, 0x514039]);
    g.fillStyle(0xd79d68).fillPoints(diamond(point(spots.market.x, spots.market.y - 18), 24, 11), true);
    g.fillStyle(0x4f8075).fillPoints([
      point(spots.market.x, spots.market.y - 29), point(spots.market.x + 7, spots.market.y - 16),
      point(spots.market.x - 9, spots.market.y - 9), point(spots.market.x - 15, spots.market.y - 14)
    ], true);
    g.fillStyle(0xffd48a).fillRect(spots.market.x + 3, spots.market.y - 3, 9, 3);

    this.box(g, spots.command, 32, 24, 0x788d85, [0x514d43, 0x34484b]);
    this.box(g, point(spots.command.x - 5, spots.command.y - 20), 13, 10, 0xa2a89a, [0x716b55, 0x445450]);
    g.fillStyle(0xadd8cc).fillRect(spots.command.x - 8, spots.command.y - 41, 2, 15);
    g.fillStyle(0x99e2d1).fillRect(spots.command.x + 7, spots.command.y - 6, 14, 3);

    this.box(g, spots.refinery, 33, 22, 0xbe9069, [0x745542, 0x543c38]);
    for (let i = 0; i < 3; i++) {
      const x = spots.refinery.x - 15 + i * 11;
      g.fillStyle(0x7b6759).fillRect(x, spots.refinery.y - 42 + i * 3, 7, 21);
      g.fillStyle(0xd4b493).fillRect(x - 1, spots.refinery.y - 42 + i * 3, 9, 3);
    }
    g.fillStyle(this.state?.batch ? 0xffc579 : 0x95dbba).fillRect(spots.refinery.x - 13, spots.refinery.y - 4, 18, 3);
    this.box(g, spots.hangar, 39, 20, 0x807874, [0x635448, 0x3c420f]);
    g.fillStyle(0x27332f).fillPoints([point(110, 142), point(140, 157), point(140, 168), point(110, 153)], true);
    g.fillStyle(0xdba957).fillRect(spots.hangar.x - 18, spots.hangar.y - 14, 15, 2);

    const tanks = this.state && this.state.level > 1 ? 3 : 2;
    for (let i = 0; i < tanks; i++) {
      const p = point(spots.silo.x + (i - 1) * 14, spots.silo.y + i * 3 - 4);
      this.box(g, p, 12, 21, 0xa4aa91, [0x6d7664, 0x46574d]);
      g.fillStyle(0xaff2c7).fillRect(p.x - 1, p.y - 8, 6, 2);
    }

    const steward = this.state?.protagonist === 'female' ? 0x683d61 : 0x49352b;
    const coat = this.state?.outfit === 'dusk' ? 0x66c1b7 : 0xde8150;
    g.fillStyle(steward).fillRect(239, 122, 5, 3);
    g.fillStyle(0xf1b086).fillRect(240, 125, 4, 3);
    g.fillStyle(coat).fillRect(239, 128, 6, 5);
    g.fillStyle(0x352b29).fillRect(240, 133, 4, 4);
  }

  private drawDesert(g: Phaser.GameObjects.Graphics) {
    this.terrain(g);
    g.fillStyle(0xa76546).fillPoints([
      point(0, 154), point(102, 106), point(189, 137), point(272, 83),
      point(404, 66), point(480, 105), point(490, 257), point(151, 256), point(0, 238)
    ], true);
    for (let i = 0; i < 21; i++) {
      const x = (i * 127) % 450 + 8;
      const y = (i * 31) % 141 + 94;
      g.lineStyle(1, i % 2 ? 0xde9a63 : 0x834f3b, .5).strokePoints([point(x, y), point(x + 18, y - 8), point(x + 39, y - 5)]);
    }
    g.lineStyle(4, 0x5c4138, 1).strokePoints([camp, bend, spots.deposit]);
    g.lineStyle(1, 0xe5b980, .8).strokePoints([camp, bend, spots.deposit]);
    this.box(g, camp, 20, 12, 0x7f9f8d, [0x5c6656, 0x354a41]);
    for (let i = 0; i < 11; i++) {
      const x = spots.deposit.x - 28 + (i * 31) % 56;
      const y = spots.deposit.y - 5 + (i * 11) % 18;
      g.fillStyle(i % 2 ? 0xefb279 : 0x8fdfcc).fillPoints([point(x, y), point(x + 5, y - 9), point(x + 9, y)], true);
    }
  }

  update() {
    const g = this.vehicles;
    if (!g || !this.state) return;
    g.clear();
    const flight = this.state.flight;
    const now = this.now();
    if (this.view === 'city') {
      if (!flight) this.drawHarvester(g, point(spots.hangar.x - 4, spots.hangar.y + 20));
      return;
    }
    let p = camp;
    if (flight && now < flight.arrivesAt) {
      const move = progress(now, flight.launchedAt, flight.arrivesAt);
      p = move < .55 ? blend(camp, bend, move / .55) : blend(bend, spots.deposit, (move - .55) / .45);
    } else if (flight && now < flight.departsAt) {
      p = spots.deposit;
    } else if (flight) {
      const move = progress(now, flight.departsAt, flight.returnsAt);
      p = move < .45 ? blend(spots.deposit, bend, move / .45) : blend(bend, camp, (move - .45) / .55);
    }
    this.drawHarvester(g, point(p.x, p.y + 9));
  }

  private drawHarvester(g: Phaser.GameObjects.Graphics, p: Point) {
    g.fillStyle(0x312c27).fillRect(p.x - 11, p.y + 2, 22, 5);
    g.fillStyle(0x754e35).fillRect(p.x - 10, p.y - 5, 20, 8);
    g.fillStyle(0xf3bd72).fillRect(p.x - 8, p.y - 7, 15, 5);
    g.fillStyle(0x9de0cf).fillRect(p.x + 4, p.y - 5, 6, 3);
    g.fillStyle(0xbb9c72).fillRect(p.x - 9, p.y + 3, 2, 2).fillRect(p.x - 2, p.y + 3, 2, 2).fillRect(p.x + 5, p.y + 3, 2, 2);
  }
}

export function mountWorld(pick: (place: Place) => void) {
  const scene = new FrontierScene(pick);
  new Phaser.Game({
    type: Phaser.CANVAS, width: 480, height: 270, pixelArt: true, antialias: false, audio: { noAudio: true },
    backgroundColor: '#654b3c', scene, parent: 'world-canvas',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
  });
  return scene;
}
