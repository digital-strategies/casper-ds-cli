/* eslint-disable no-underscore-dangle */
import {
  DeployUtil,
  PublicKey,
  Keys,
  RuntimeArgs,
  CLValue,
  CasperServiceByJsonRPC,
  GetBlockResult,
  CasperClient,
} from 'casper-client-sdk';
import { BigNumberish, ethers } from 'ethers';
import moment from 'moment';

import { createClient, createJsonClient } from './client';
import { DEFAULT_TTL, MINUTE_MILLIS, RPC, SECOND_MILLIS, STAKING_CONTRACT } from './constants';

interface IEra {
  id: number;
  startHeight: number;
  startTimestamp: string;
  estimatedEndTimestamp: string;
}

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

export async function deploy({
  json,
  rpc,
  wait,
  balanceAware,
  nextEra,
}: {
  json: any;
  rpc?: string;
  wait: boolean;
  balanceAware: boolean;
  nextEra: boolean;
}): Promise<string> {
  const deploy = DeployUtil.deployFromJson(json);
  const rpcUrl = rpc || (RPC as any)[deploy.header.chainName];
  const client = createClient(rpcUrl);
  const jsonClient = createJsonClient(rpcUrl);

  if (wait) {
    const txTimestamp = new Date(deploy.header.timestamp).getTime();
    const txTimestampWithBuffer = txTimestamp + 5 * SECOND_MILLIS;
    await waitUntil(txTimestampWithBuffer);
    console.log(`✅ tx timestamp reached (${new Date().toISOString()})...`);
  }

  if (nextEra) {
    await waitForNextEraAfterTimestamp(jsonClient, deploy.header.timestamp as any);
  }

  if (balanceAware) {
    const amount = extractAmount(deploy);
    const singerAccountHex = extractSignerAcccountHex(deploy);
    await waitForBalance(client, singerAccountHex, amount);
  }

  const txHash = await client.putDeploy(deploy);

  return txHash;
}

function extractAmount(deploy: DeployUtil.Deploy): BigNumberish {
  try {
    return deploy.session.getArgByName('amount').asBigNumber().toString();
  } catch (e) {
    console.error(e);
    return '0';
  }
}

function extractTargetAccountHash(deploy: DeployUtil.Deploy): string {
  return deploy.session.getArgByName('target').bytes;
}

function extractSignerAcccountHex(deploy: DeployUtil.Deploy): string {
  return deploy.approvals[0].signer;
}

async function waitForBalance(client: CasperClient, accountHex: string, amount: BigNumberish): Promise<void> {
  console.log(`🕒 waiting until account ${accountHex} has at least ${ethers.utils.formatUnits(amount, 9)} CSPR...`);
  let hasEnoughBalance = false;
  let balance: BigNumberish = '0';
  do {
    balance = await client.balanceOfByPublicKey(PublicKey.fromHex(accountHex));
    hasEnoughBalance = balance.gt(amount);

    if (!hasEnoughBalance) {
      await sleep(MINUTE_MILLIS);
    }
  } while (!hasEnoughBalance);

  console.log(`✅ ${accountHex} has ${ethers.utils.formatUnits(balance, 9)} CSPR`);
}

async function waitForNextEraAfterTimestamp(jsonClient: CasperServiceByJsonRPC, txTimestamp: string): Promise<void> {
  const latestEra = await getLatestEra(jsonClient);
  // const now = new Date().getTime();
  const txTimestampTime = new Date(txTimestamp).getTime();
  const eraStartTime = new Date(latestEra.startTimestamp).getTime();
  const eraEndTime = new Date(latestEra.estimatedEndTimestamp).getTime();

  const isBeforeLatestEra = txTimestampTime < eraStartTime;

  if (isBeforeLatestEra) {
    console.log('✅ next era already reached');
    return;
  }

  await waitUntil(eraEndTime);

  await waitForNextEra(jsonClient, latestEra.id);
}

async function waitForNextEra(jsonClient: CasperServiceByJsonRPC, eraId: number): Promise<void> {
  console.log(`🕒 waiting until era ${eraId + 1}...`);
  let latestEraId = await getLatestEraId(jsonClient);

  while (latestEraId <= eraId) {
    await sleep(MINUTE_MILLIS);
    latestEraId = await getLatestEraId(jsonClient);
  }

  console.log(`✅ era ${eraId + 1} reached`);
}

async function getLatestEraId(jsonClient: CasperServiceByJsonRPC): Promise<number> {
  const block = await jsonClient.getLatestBlockInfo();
  return block.block.header.era_id;
}

async function getLatestEra(jsonClient: CasperServiceByJsonRPC): Promise<IEra> {
  const avgBlocksInEra = 109;
  let step = avgBlocksInEra;
  let direction = -1;

  const startBlock = await jsonClient.getLatestBlockInfo();
  // const startBlock = await jsonClient.getBlockInfoByHeight(511);
  const eraId = startBlock.block.header.era_id;
  let blockHeight = startBlock.block.header.height;
  let block: GetBlockResult;

  while (step > 1) {
    step = Math.ceil(step / 2);
    blockHeight += step * direction;

    block = await jsonClient.getBlockInfoByHeight(blockHeight);

    direction = block.block.header.era_id === eraId ? -1 : 1;
    // console.log(`current block: ${block.block.header.height}; era: ${block.block.header.era_id}; target era: ${eraId}`);
  }

  // console.log('reached step = 1');
  let prevBlock = block;
  do {
    blockHeight += direction;
    prevBlock = block;
    block = await jsonClient.getBlockInfoByHeight(blockHeight);

    // console.log(`current block: ${block.block.header.height}; era: ${block.block.header.era_id}; target era: ${eraId}`);
  } while (prevBlock.block.header.era_id === block.block.header.era_id);

  const eraStart =
    prevBlock.block.header.era_id === eraId ? prevBlock.block.header.timestamp : block.block.header.timestamp;

  const ret = {
    id: eraId,
    startHeight: prevBlock.block.header.era_id === eraId ? prevBlock.block.header.height : block.block.header.height,
    startTimestamp: eraStart as any,
    // eslint-disable-next-line newline-per-chained-call
    estimatedEndTimestamp: moment(eraStart).add(2, 'hours').add(1, 'minute').add(10, 'seconds').toISOString(),
  };

  console.log('ℹ latest era:', ret);

  return ret;
}

async function waitUntil(timestamp: number | string): Promise<void> {
  const diff = new Date(timestamp).getTime() - new Date().getTime();
  if (diff > 0) {
    console.log(
      `🕒 waiting ${moment.duration(diff, 'milliseconds').humanize()} until timestamp: ${new Date(
        timestamp
      ).toISOString()}`
    );
    await sleep(diff);
  }
}

const maxSleep = 0x7fffffff;
async function sleep(ms: number): Promise<void> {
  if (ms > maxSleep) {
    await sleep(maxSleep);
    return sleep(ms - maxSleep);
  }

  return new Promise((resolve) => setTimeout(resolve, ms));
}
