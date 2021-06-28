/* eslint-disable no-underscore-dangle */
import { DeployUtil, PublicKey, Keys, RuntimeArgs, CLValue } from 'casper-client-sdk';
import { BigNumberish, ethers } from 'ethers';

import { createClient } from './client';
import { DEFAULT_TTL, RPC, STAKING_CONTRACT } from './constants';

export function transfer({
  from,
  to,
  amount,
  memo = 0,
  gasPrice = 1,
  timestamp = new Date().getTime(),
  ttl = DEFAULT_TTL,
  network,
}: {
  from: Keys.AsymmetricKey;
  to: string;
  amount: BigNumberish;
  memo?: number;
  gasPrice?: number;
  timestamp?: number;
  ttl?: number;
  network: string;
}): any {
  // for native-transfers payment price is fixed
  const paymentAmount = ethers.utils.parseUnits('0.00001', 9);

  const deployParams = new DeployUtil.DeployParams(from.publicKey, network, gasPrice, ttl, [], timestamp);

  // we create public key from account-address (in fact it is hex representation of public-key with added prefix)
  const toPublicKey = PublicKey.fromHex(to);

  const session = DeployUtil.ExecutableDeployItem.newTransfer(amount, toPublicKey, null, memo);
  const payment = DeployUtil.standardPayment(paymentAmount);
  const deploy = DeployUtil.makeDeploy(deployParams, session, payment);
  const signedDeploy = DeployUtil.signDeploy(deploy, from);

  return DeployUtil.deployToJson(signedDeploy);
}

export function undelegate({
  from,
  amount,
  validator,
  stakingContractHash,
  paymentAmount = ethers.utils.parseUnits('0.5', 9),
  gasPrice = 1,
  timestamp = new Date().getTime(),
  ttl = DEFAULT_TTL,
  network,
}: {
  from: Keys.AsymmetricKey;
  amount: BigNumberish;
  validator: string;
  stakingContractHash?: string;
  paymentAmount?: BigNumberish;
  gasPrice?: number;
  timestamp?: number;
  ttl?: number;
  network: string;
}): any {
  const deployParams = new DeployUtil.DeployParams(from.publicKey, network, gasPrice, ttl, [], timestamp);
  const _stakingContractHash = stakingContractHash || (STAKING_CONTRACT as any)[network];
  const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
    Uint8Array.from(Buffer.from(_stakingContractHash, 'hex')),
    'undelegate',
    RuntimeArgs.fromMap({
      delegator: CLValue.publicKey(from.publicKey),
      validator: CLValue.publicKey(PublicKey.fromHex(validator)),
      amount: CLValue.u512(amount),
    })
  );
  const payment = DeployUtil.standardPayment(paymentAmount);
  const deploy = DeployUtil.makeDeploy(deployParams, session, payment);
  const signedDeploy = DeployUtil.signDeploy(deploy, from);

  return DeployUtil.deployToJson(signedDeploy);
}

export async function deploy({ json, rpc }: { json: any; rpc?: string }): Promise<string> {
  const deploy = DeployUtil.deployFromJson(json);
  const rpcUrl = rpc || (RPC as any)[deploy.header.chainName];
  const client = createClient(rpcUrl);
  const txHash = await client.putDeploy(deploy);

  return txHash;
}
