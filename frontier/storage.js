import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import { command, createColony, GameError, settle, snapshot } from './economy.js';

const digest = value => createHash('sha256').update(value).digest('hex');

export function openColonyStore(path) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  function atomic(work) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  try {
    db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    atomic(() => {
      const version = db.prepare('PRAGMA user_version').get().user_version;
      if (version === 0) {
        db.exec(`
          CREATE TABLE colonies (
            id TEXT PRIMARY KEY, guest_hash TEXT UNIQUE NOT NULL,
            state TEXT NOT NULL CHECK (json_valid(state))
          ) STRICT;
          CREATE TABLE inventory_events (
            id INTEGER PRIMARY KEY, colony TEXT NOT NULL REFERENCES colonies(id),
            kind TEXT NOT NULL, occurred_at INTEGER NOT NULL, raw_delta INTEGER NOT NULL,
            refined_delta INTEGER NOT NULL
          ) STRICT;
          CREATE INDEX colony_events ON inventory_events(colony);
          PRAGMA user_version = 1;
        `);
      } else if (version !== 1 || !db.prepare("SELECT 1 FROM sqlite_schema WHERE name = 'colonies'").get()) {
        throw new Error('The SQLite file does not contain a supported Frontier save.');
      }
    });
  } catch (error) {
    db.close();
    throw error;
  }

  const lookup = db.prepare('SELECT id, state FROM colonies WHERE guest_hash = ?');
  const save = db.prepare('UPDATE colonies SET state = ? WHERE id = ?');
  const add = db.prepare('INSERT INTO inventory_events(colony, kind, occurred_at, raw_delta, refined_delta) VALUES (?, ?, ?, ?, ?)');

  return {
    close: () => db.close(),
    create(token, protagonist, name, now) {
      return atomic(() => {
        if (token && lookup.get(digest(token))) throw new GameError('This browser already has a colony.');
        const session = randomBytes(32).toString('hex');
        const state = createColony(protagonist, name);
        db.prepare('INSERT INTO colonies VALUES (?, ?, ?)')
          .run(randomBytes(16).toString('hex'), digest(session), JSON.stringify(state));
        return { session, state: snapshot(state, now) };
      });
    },
    update(token, now, request) {
      if (!token) return null;
      return atomic(() => {
        const row = lookup.get(digest(token));
        if (!row) return null;
        const colony = JSON.parse(row.state);
        const record = (...event) => add.run(row.id, ...event);
        settle(colony, now, record);
        if (request) {
          if (request.revision !== colony.revision) throw new GameError('This colony changed. The latest state is being loaded.');
          command(colony, request.action, now, record);
          colony.revision++;
          settle(colony, now, record);
        }
        const serialized = JSON.stringify(colony);
        if (serialized !== row.state) save.run(serialized, row.id);
        return snapshot(colony, now);
      });
    }
  };
}
