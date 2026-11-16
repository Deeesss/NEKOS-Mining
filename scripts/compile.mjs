import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import solc from 'solc';

export function compile() {
  const names = ['NekosSpice', 'SpiceRewards', 'FrontierMarket'];
  const sources = Object.fromEntries(names.map(name => {
    const file = `contracts/${name}.sol`;
    return [file, { content: readFileSync(file, 'utf8') }];
  }));
  const input = {
    language: 'Solidity',
    sources,
    settings: {
      evmVersion: 'cancun',
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } }
    }
  };
  const importsRoot = resolve('node_modules', '@openzeppelin');
  const output = JSON.parse(solc.compile(JSON.stringify(input), {
    import(name) {
      const path = resolve('node_modules', name);
      if (!path.startsWith(importsRoot + sep)) return { error: 'Unexpected Solidity import' };
      return { contents: readFileSync(path, 'utf8') };
    }
  }));
  const errors = output.errors?.filter(entry => entry.severity === 'error') ?? [];
  if (errors.length) throw new Error(errors.map(entry => entry.formattedMessage).join('\n'));
  return Object.fromEntries(names.map(name => {
    const artifact = output.contracts[`contracts/${name}.sol`][name];
    return [name, { abi: artifact.abi, bytecode: `0x${artifact.evm.bytecode.object}` }];
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mkdirSync('artifacts', { recursive: true });
  for (const [name, artifact] of Object.entries(compile())) {
    writeFileSync(`artifacts/${name}.json`, JSON.stringify(artifact, null, 2));
  }
  console.log(`Compiled the contracts with ${solc.version()}`);
}
