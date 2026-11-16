import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';

export const SHIFT_SECONDS = 60;

const digest = token => createHash('sha256').update(token).digest('hex');

export function openStore(filename, deployment) {
  mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  function atomic(operation) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
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
          CREATE TABLE deployment (id INTEGER PRIMARY KEY CHECK (id = 1), identity TEXT NOT NULL) STRICT;
          CREATE TABLE players (
            address TEXT PRIMARY KEY,
            shift_started INTEGER,
            points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0)
          ) STRICT;
          CREATE TABLE challenges (
            nonce TEXT PRIMARY KEY, player TEXT NOT NULL, message TEXT NOT NULL, expires INTEGER NOT NULL
          ) STRICT;
          CREATE TABLE sessions (
            token_hash TEXT PRIMARY KEY, player TEXT NOT NULL REFERENCES players(address), expires INTEGER NOT NULL
          ) STRICT;
          CREATE TABLE claims (
            nonce TEXT PRIMARY KEY,
            player TEXT NOT NULL REFERENCES players(address),
            points INTEGER NOT NULL CHECK (points > 0),
            deadline INTEGER NOT NULL,
            from_block INTEGER NOT NULL,
            signature TEXT,
            state TEXT NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved', 'expired', 'claimed')),
            settled_block INTEGER,
            tx_hash TEXT
          ) STRICT;
          CREATE UNIQUE INDEX player_open_claim ON claims(player) WHERE state = 'reserved';
          CREATE INDEX player_claim_history ON claims(player);
          CREATE INDEX outstanding_claims ON claims(deadline) WHERE state = 'reserved';
          PRAGMA user_version = 1;
        `);
        db.prepare('INSERT INTO deployment VALUES (1, ?)').run(deployment);
      } else if (version !== 1) {
        throw new Error('This version cannot open the database schema.');
      }
      if (db.prepare('SELECT identity FROM deployment WHERE id = 1').get()?.identity !== deployment) {
        throw new Error('Database belongs to a different rewards deployment.');
      }
    });
  } catch (error) {
    db.close();
    throw error;
  }

  const player = db.prepare('SELECT * FROM players WHERE address = ?');
  const reserved = db.prepare("SELECT * FROM claims WHERE player = ? AND state = 'reserved'");
  const debit = db.prepare('UPDATE players SET points = points - ? WHERE address = ?');
  const settleShift = db.prepare('UPDATE players SET shift_started = NULL, points = points + ? WHERE address = ?');
  function accrue(address, now) {
    const record = player.get(address);
    if (record.shift_started !== null && now >= record.shift_started + SHIFT_SECONDS) {
      settleShift.run(SHIFT_SECONDS, address);
    }
  }

  return {
    close: () => db.close(),
    challenge(nonce, address, message, expires, now) {
      atomic(() => {
        db.prepare('DELETE FROM challenges WHERE expires <= ?').run(now);
        db.prepare('INSERT INTO challenges VALUES (?, ?, ?, ?)').run(nonce, address, message, expires);
      });
    },
    getChallenge: nonce => db.prepare('SELECT * FROM challenges WHERE nonce = ?').get(nonce),
    login(nonce, address, now, duration, priorToken) {
      return atomic(() => {
        const { changes } = db.prepare('DELETE FROM challenges WHERE nonce = ? AND expires > ?').run(nonce, now);
        if (!changes) return null;
        const token = randomBytes(32).toString('hex');
        db.prepare('DELETE FROM sessions WHERE expires <= ? OR token_hash = ?').run(now, digest(priorToken));
        db.prepare('INSERT OR IGNORE INTO players(address) VALUES (?)').run(address);
        db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(digest(token), address, now + duration);
        return token;
      });
    },
    session(token, now) {
      return db.prepare('SELECT player FROM sessions WHERE token_hash = ? AND expires > ?').get(digest(token), now)?.player;
    },
    logout: token => db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(token)),
    shift(address, now) {
      return atomic(() => {
        accrue(address, now);
        db.prepare('UPDATE players SET shift_started = ? WHERE address = ? AND shift_started IS NULL').run(now, address);
      });
    },
    dashboard(address, now) {
      return atomic(() => {
        accrue(address, now);
        const record = player.get(address);
        const pending = reserved.get(address);
        const last = db.prepare("SELECT tx_hash FROM claims WHERE player = ? AND state = 'claimed' ORDER BY rowid DESC LIMIT 1").get(address);
        return {
          points: record.points,
          pending,
          lastTransaction: last?.tx_hash ?? null,
          shiftEndsAt: record.shift_started === null ? null : record.shift_started + SHIFT_SECONDS
        };
      });
    },
    reserved: address => reserved.get(address),
    due: timestamp => db.prepare("SELECT * FROM claims WHERE state = 'reserved' AND deadline < ? ORDER BY deadline LIMIT 16").all(timestamp),
    resolveClaim(record, result, anchorNumber) {
      atomic(() => {
        const expired = result === 'expired';
        const { changes } = db.prepare(`
          UPDATE claims SET state = ?, settled_block = ?, tx_hash = ? WHERE nonce = ? AND state = 'reserved'
        `).run(expired ? 'expired' : 'claimed', anchorNumber, expired ? null : result, record.nonce);
        if (changes && expired) debit.run(-record.points, record.player);
      });
    },
    reserve(address, now, anchorNumber, deadline, poolPoints) {
      return atomic(() => {
        const existing = reserved.get(address);
        if (existing) return existing;
        accrue(address, now);
        const { points } = player.get(address);
        if (!points) return null;
        const { outstanding } = db.prepare(`
          SELECT COALESCE(SUM(points), 0) AS outstanding FROM claims
          WHERE state = 'reserved' OR (state = 'claimed' AND settled_block > ?)
        `).get(anchorNumber);
        const claimPoints = Math.min(points, poolPoints - outstanding);
        if (claimPoints <= 0) return null;
        const nonce = '0x' + randomBytes(32).toString('hex');
        db.prepare('INSERT INTO claims(nonce, player, points, deadline, from_block) VALUES (?, ?, ?, ?, ?)')
          .run(nonce, address, claimPoints, deadline, anchorNumber + 1);
        debit.run(claimPoints, address);
        return reserved.get(address);
      });
    },
    saveSignature(nonce, signature) {
      return db.prepare("UPDATE claims SET signature = ? WHERE nonce = ? AND state = 'reserved'").run(signature, nonce).changes > 0;
    }
  };
}
