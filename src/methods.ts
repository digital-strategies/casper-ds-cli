/* eslint-disable no-underscore-dangle */
import { DeployUtil, PublicKey, Keys, RuntimeArgs, CLValue } from 'casper-client-sdk';
import { BigNumberish, ethers } from 'ethers';
import moment from 'moment';

import { createClient } from './client';
import { DEFAULT_TTL, RPC, SECOND_MILLIS, STAKING_CONTRACT } from './constants';

export function transfer({
  from,
  to,
  amount,
  memo = 0,
  gasPrice = 1,
  paymentAmount = ethers.utils.parseUnits('0.00001', 9),
  timestamp = new Date().getTime(),
  ttl = DEFAULT_TTL,
  network,
}: {
  from: Keys.AsymmetricKey;
  to: string;
  amount: BigNumberish;
  memo?: number;
  gasPrice?: number;
  paymentAmount?: BigNumberish;
  timestamp?: number | string;
  ttl?: number;
  network: string;
}): any {
  // for native-transfers payment price is fixed
  // const paymentAmount = ethers.utils.parseUnits('0.00001', 9);

  const deployParams = new DeployUtil.DeployParams(
    from.publicKey,
    network,
    gasPrice,
    ttl,
    [],
    new Date(timestamp).getTime()
  );

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
  timestamp?: number | string;
  ttl?: number;
  network: string;
}): any {
  const deployParams = new DeployUtil.DeployParams(
    from.publicKey,
    network,
    gasPrice,
    ttl,
    [],
    new Date(timestamp).getTime()
  );
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

export async function deploy({ json, rpc, wait }: { json: any; rpc?: string; wait: boolean }): Promise<string> {
  const deploy = DeployUtil.deployFromJson(json);
  const rpcUrl = rpc || (RPC as any)[deploy.header.chainName];
  const client = createClient(rpcUrl);

  if (wait) {
    const txTimestamp = new Date(deploy.header.timestamp).getTime();
    const txTimestampWithBuffer = txTimestamp + 5 * SECOND_MILLIS;
    const diff = txTimestampWithBuffer - new Date().getTime();
    if (diff > 0) {
      console.log(
        `Waiting ${moment.duration(diff, 'milliseconds').humanize()} to execute tx at ~${new Date(
          txTimestamp
        ).toISOString()}`
      );
    }
    await sleep(diff);
    console.log(`Executing now (${new Date().toISOString()})...`);
  }

  const txHash = await client.putDeploy(deploy);

  return txHash;
}

const maxSleep = 0x7fffffff;
async function sleep(ms: number): Promise<void> {
  if (ms > maxSleep) {
    await sleep(maxSleep);
    return sleep(ms - maxSleep);
  }

  return new Promise((resolve) => setTimeout(resolve, ms));
}
