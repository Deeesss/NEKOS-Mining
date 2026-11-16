import { ContractFactory, NonceManager } from 'ethers';
import { compile } from './compile.mjs';

export async function deploy(deployer, signer, checkpoint = () => {}) {
  const artifacts = compile();
  const sender = new NonceManager(deployer);
  const token = await new ContractFactory(artifacts.NekosSpice.abi, artifacts.NekosSpice.bytecode, sender).deploy();
  const transactions = { token: token.deploymentTransaction().hash };
  const progress = { state: 'token submitted', token: await token.getAddress(), signer, transactions };
  checkpoint(progress);
  await token.deploymentTransaction().wait();
  const rewards = await new ContractFactory(artifacts.SpiceRewards.abi, artifacts.SpiceRewards.bytecode, sender)
    .deploy(await token.getAddress(), signer);
  progress.rewards = await rewards.getAddress();
  transactions.rewards = rewards.deploymentTransaction().hash;
  checkpoint({ ...progress, state: 'rewards submitted' });
  await rewards.deploymentTransaction().wait();
  const funding = await token.transfer(progress.rewards, await token.TEST_SUPPLY());
  transactions.funding = funding.hash;
  checkpoint({ ...progress, state: 'funding submitted' });
  await funding.wait();
  return {
    token: progress.token,
    rewards: progress.rewards,
    signer,
    transactions
  };
}
