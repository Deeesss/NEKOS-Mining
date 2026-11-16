import { ContractFactory, NonceManager, Wallet, parseEther } from 'ethers';
import { compile } from './compile.mjs';

export async function deployLocalMarket(deployer, player) {
  const sender = new NonceManager(deployer);
  const artifacts = compile();
  const token = await new ContractFactory(artifacts.NekosSpice.abi, artifacts.NekosSpice.bytecode, sender).deploy();
  await token.waitForDeployment();
  const signer = Wallet.createRandom();
  const treasury = Wallet.createRandom().address;
  const price = parseEther('1');
  const market = await new ContractFactory(artifacts.FrontierMarket.abi, artifacts.FrontierMarket.bytecode, sender)
    .deploy(await token.getAddress(), treasury, signer.address, price);
  await market.waitForDeployment();
  await (await token.transfer(player.address, parseEther('10'))).wait();
  return { chainId: 31337, address: await market.getAddress(), expectedToken: await token.getAddress(),
    expectedTreasury: treasury, signerKey: signer.privateKey };
}
