/* eslint-disable camelcase */
import { json2csvAsync, csv2jsonAsync } from 'json-2-csv';
import fs from 'fs';
import path from 'path';
import { BigNumberish, ethers } from 'ethers';
import moment from 'moment';

import { createJsonClient } from './client';
import { MAINNET_RPC } from './constants';
import { GetDeployResult } from 'casper-client-sdk';

interface IUndelegation {
  block: number;
  era: number;
  timestamp: string;
  address: string;
  deployHash: string;
  amountCspr: string;
  amountMotes: string;
  success: 'Y' | 'N';
}

const MIN_BLOCK = 116858;
const MIN_UNDELEGATE_COST = ethers.utils.parseUnits('0.4', 9).toNumber();
const MAX_UNDELEGATE_COST = ethers.utils.parseUnits('0.5', 9).toNumber();

const client = createJsonClient(MAINNET_RPC);

const filePath = path.resolve('undelegations.csv');

let undelegations: IUndelegation[] = [];

export default async function findUndelegations(): Promise<void> {
  process.on('SIGINT', handleExit);
  process.on('uncaughtException', handleExit);
  process.on('unhandledRejection', handleExit);

  undelegations = await loadCsv();
  console.info(`loaded ${undelegations.length} undelegations`);

  const startBlock = getStartBlock(undelegations);
  console.info(`start block is ${startBlock}`);

  await scanBlocksForUndelegations(startBlock);

  await saveToFile();
}

async function loadCsv(): Promise<IUndelegation[]> {
  try {
    const res = fs.readFileSync(filePath).toString();
    const rows = await csv2jsonAsync(res);
    return rows;
  } catch (e) {
    console.info('file does not exist', filePath);
    return [];
  }
}

function getStartBlock(undelegations: IUndelegation[]): number {
  const blocks = [...undelegations.map((u) => u.block), MIN_BLOCK];

  return Math.max(...blocks) + 1;
}

async function scanBlocksForUndelegations(startBlock: number): Promise<void> {
  const latestBlock = await client.getLatestBlockInfo();
  const { height } = latestBlock.block.header;

  for (let i = startBlock; i <= height; i++) {
    console.log(`scanning block ${i}...`);
    await findUndelegationsInBlock(i);
  }

  // console.log(latestBlock);
}

async function findUndelegationsInBlock(height: number): Promise<void> {
  const block = await client.getBlockInfoByHeight(height);
  const { era_id } = block.block.header;

  if ((block.block as any).body?.deploy_hashes.length > 0) {
    console.log((block.block as any).body?.deploy_hashes);

    await findUndelegationsInDeploys(era_id, height, (block.block as any).body?.deploy_hashes);
  }
}

async function findUndelegationsInDeploys(eraId: number, height: number, deployHashes: string[]): Promise<void> {
  for (const hash of deployHashes) {
    const deploy = await client.getDeployInfo(hash);

    const executionResult = deploy.execution_results[0].result;
    if (isUndelegation(executionResult)) {
      storeDeploy(eraId, height, deploy);

      // console.log(deploy);
      // throw new Error('sdsdf');
    }
  }
}

function isUndelegation(executionResult: any) {
  const cost = Number(executionResult?.Success?.cost || executionResult?.Failure?.cost);
  return cost > MIN_UNDELEGATE_COST && cost < MAX_UNDELEGATE_COST;
}

function extractCost(executionResult: any) {
  return Number(executionResult?.Success?.cost || executionResult?.Failure?.cost);
}

function storeDeploy(eraId: number, height: number, deploy: GetDeployResult) {
  const executionResult = deploy.execution_results[0].result;
  const success = isSuccess(executionResult);
  const { header } = deploy.deploy;
  const amountMotes = extractAmount(deploy.deploy.session);
  const amountCspr = ethers.utils.formatUnits(amountMotes, 9);

  const undelegation: IUndelegation = {
    era: eraId,
    block: height,
    deployHash: deploy.deploy.hash,
    timestamp: new Date(header.timestamp).toISOString(),
    address: header.account,
    amountCspr,
    amountMotes,
    success: success ? 'Y' : 'N',
  };

  undelegations.push(undelegation);
}

function isSuccess(executionResult: any) {
  return !!executionResult?.Success;
}

function extractAmount(session: any): string {
  const [key] = Object.keys(session);
  const { args } = session[key];

  let cost = '0';

  args.forEach(([argType, attrs]: [string, any]) => {
    if (argType === 'amount') {
      cost = attrs.parsed;
    }
  });

  return cost;
}

// function addSender(email: IEmail): void {
//   const address = email.headers.fromAddress;
//   const name = email.headers.fromName || address.split('@')[0];
//   const receivedDate = moment(new Date(email.headers.date)).format(dateFormat);
//   const existingSender = senders.find((sender) => sender.address === address);

//   if (existingSender) {
//     if (moment(receivedDate, dateFormat).isAfter(moment(existingSender.lastReceivedDate, dateFormat))) {
//       existingSender.lastReceivedDate = receivedDate;
//     }
//   } else {
//     senders.push({
//       address,
//       name,
//       lastReceivedDate: receivedDate,
//     });
//   }
// }

async function saveToFile(): Promise<void> {
  const csv = await json2csvAsync(undelegations);

  fs.writeFileSync(filePath, csv);
  console.info(`saved ${undelegations.length} unique undelegations`);
}

async function handleExit(e: any): Promise<void> {
  console.error(e);
  await saveToFile();
  process.exit(0);
}

findUndelegations();
