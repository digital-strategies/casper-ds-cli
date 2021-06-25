import { DeployUtil, PublicKey, CLValue, RuntimeArgs } from 'casper-client-sdk';
import { ethers } from 'ethers'

import { client, keypair } from './client';
import { DEFAULT_TTL } from './constants';
import { CASPER_CHAIN_NAME, STAKING_CONTRACT_HASH } from './env';

export function sendTransfer({ to, amount, memo = 0, timestamp = new Date().getTime() }: { to: string; amount: number, memo?: number, timestamp?: number}): any {
  // for native-transfers payment price is fixed
  const paymentAmount = ethers.utils.parseUnits('0.00001', 9);
  // gas price for native transfers can be set to 1
  const gasPrice = 1;

  const deployParams = new DeployUtil.DeployParams(keypair.publicKey, CASPER_CHAIN_NAME, gasPrice, DEFAULT_TTL, [], timestamp);

  // we create public key from account-address (in fact it is hex representation of public-key with added prefix)
  const toPublicKey = PublicKey.fromHex(to);

  const session = DeployUtil.ExecutableDeployItem.newTransfer(amount, toPublicKey, null, memo);
  const payment = DeployUtil.standardPayment(paymentAmount);
  const deploy = DeployUtil.makeDeploy(deployParams, session, payment);
  const signedDeploy = DeployUtil.signDeploy(deploy, keypair);

  return DeployUtil.deployToJson(signedDeploy);
}

export function undelegate({
  amount,
  validator
}: {
  amount: number;
  validator: string;
}): any {
  const deployParams = new DeployUtil.DeployParams(keypair.publicKey, CASPER_CHAIN_NAME);
  const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
    Uint8Array.from(Buffer.from(STAKING_CONTRACT_HASH, 'hex')),
    'undelegate',
    RuntimeArgs.fromMap({
      delegator: CLValue.publicKey(keypair.publicKey),
      validator: CLValue.publicKey(PublicKey.fromHex(validator)),
      amount: CLValue.u512(ethers.utils.parseUnits(`${amount}`, 9)),
    })
  );
  const payment = DeployUtil.standardPayment(ethers.utils.parseUnits('0.5', 9));
  const deploy = DeployUtil.makeDeploy(deployParams, session, payment);
  const signedDeploy = DeployUtil.signDeploy(deploy, keypair);

  return DeployUtil.deployToJson(signedDeploy)
}


export async function deploy(json: any): Promise<string> {
  const txHash = await client.putDeploy(DeployUtil.deployFromJson(json));

  return txHash;
}
