import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const paths = git('ls-files', '-z').split('\0').filter(Boolean);
let issues = 0;
for (const path of paths) {
  if (/(^|\/)\.env(?:\.|$)/.test(path) && !path.endsWith('.env.example') ||
      /(^|\/)(?:data|artifacts)\/|\.log$/i.test(path)) {
    console.error(`Unexpected tracked runtime file: ${path}`);
    issues++;
    continue;
  }
  const staged = git('show', `:${path}`);
  const rules = [
    /\b[0-9]{7,}:AA[A-Za-z0-9_-]{25,}\b/,
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{35,})\b/,
    /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/,
    /(?:^|\n)\s*(?:API_KEY|MNEMONIC|TELEGRAM_BOT_API_KEY|CLAIM_SIGNER_KEY|DEPLOYER_KEY)\s*=\s*[^\r\n\s#][^\r\n]{5,}/i,
    /\b(?:apiKey|privateKey|secretKey)\s*[:=]\s*['"`][A-Za-z0-9_=-]{14,}['"`]/i
  ];
  if (rules.some(rule => rule.test(staged))) {
    console.error(`Possible credential in ${path}`);
    issues++;
  }
}
if (issues) process.exitCode = 1;
else console.log(`Secret check passed for ${paths.length} indexed files.`);
