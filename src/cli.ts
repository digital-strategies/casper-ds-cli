/* eslint-disable prefer-destructuring */
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import moment from 'moment';
import { ethers } from 'ethers';

import { DEFAULT_TTL, RPC, STAKING_CONTRACT } from './constants';
import { deploy, transfer, undelegate } from './methods';
import { readKeypair } from './client';

interface IDeployParams {
  json: string;
  rpc?: string;
}

interface ITransferParams {
  amount: string;
  to: string;
  pub: string;
  pk: string;
  ttl?: number;
  gasprice?: number;
  timestamp?: number;
  memo?: number;
  network?: string;
  broadcast?: boolean;
  cleanjson?: boolean;
  rpc?: string;
}

interface IUndelegateParams {
  amount: string;
  validator: string;
  contract?: string;
  payment?: string;
  pub: string;
  pk: string;
  ttl?: number;
  gasprice?: number;
  timestamp?: number;
  network?: string;
  broadcast?: boolean;
  cleanjson?: boolean;
  rpc?: string;
}

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <command> [options]')
  .command({
    command: 'transfer',
    describe: 'create transfer tx',
    builder: (yargs) =>
      yargs
        .option('network', {
          describe: 'network',
          choices: ['casper', 'casper-test'],
          demandOption: true,
        })
        .option('amount', {
          describe: 'amount to send in motes (1 CSPR = 1 000 000 000 motes)',
          demandOption: true,
          number: false,
        })
        .option('to', {
          describe: 'recipient address (hex)',
          demandOption: true,
        })
        .option('pub', {
          describe: 'path to public key',
          default: './public_key.pem',
        })
        .option('pk', {
          describe: 'path to private key',
          default: './secret_key.pem',
        })
        .option('ttl', {
          describe: 'time to live (ms)',
          default: DEFAULT_TTL,
          defaultDescription: moment.duration(DEFAULT_TTL, 'milliseconds').humanize(),
        })
        .option('gasprice', {
          describe: 'gas price',
          default: 1,
        })
        .option('timestamp', {
          describe: 'timestamp (unix in ms)',
          default: () => new Date().getTime(),
          defaultDescription: 'current',
        })
        .option('memo', {
          describe: 'memo (transfer id)',
          default: 0,
        })
        .option('broadcast', {
          describe: 'broadcast to network instead of returning signed tx',
          boolean: true,
        })
        .option('cleanjson', {
          describe: 'return signed tx in clean JSON, not formatted for CLI',
          boolean: true,
        })
        .option('rpc', {
          describe: 'RPC URL (used if broadcast = true)',
          defaultDescription: JSON.stringify(RPC),
        }),
    handler: () => {},
  })
  .command({
    command: 'undelegate',
    describe: 'create undelegate tx',
    builder: (yargs) =>
      yargs
        .option('network', {
          describe: 'network',
          choices: ['casper', 'casper-test'],
          demandOption: true,
        })
        .option('amount', {
          describe: 'amount to undelegate in motes (1 CSPR = 1 000 000 000 motes)',
          demandOption: true,
          number: false,
        })
        .option('validator', {
          describe: 'validator address (hex) from which to undelegate',
          demandOption: true,
        })
        .option('pub', {
          describe: 'path to public key',
          default: './public_key.pem',
        })
        .option('pk', {
          describe: 'path to private key',
          default: './secret_key.pem',
        })
        .option('ttl', {
          describe: 'time to live (ms)',
          default: DEFAULT_TTL,
          defaultDescription: moment.duration(DEFAULT_TTL, 'milliseconds').humanize(),
        })
        .option('gasprice', {
          describe: 'gas price',
          default: 1,
        })
        .option('payment', {
          describe: 'amount to pay for the execution of the tx in motes (1 CSPR = 1 000 000 000 motes)',
          default: ethers.utils.parseUnits('0.5', 9).toString(),
        })
        .option('timestamp', {
          describe: 'timestamp (unix in ms)',
          default: () => new Date().getTime(),
          defaultDescription: 'current',
        })
        .option('broadcast', {
          describe: 'broadcast to network instead of returning signed tx',
          boolean: true,
        })
        .option('cleanjson', {
          describe: 'return signed tx in clean JSON, not formatted for CLI',
          boolean: true,
        })
        .option('rpc', {
          describe: 'RPC URL (used if broadcast = true)',
          defaultDescription: JSON.stringify(RPC),
        })
        .option('contract', {
          describe: 'staking contract hash',
          defaultDescription: JSON.stringify(STAKING_CONTRACT),
        }),
    handler: () => {},
  })
  .command({
    command: 'deploy',
    describe: 'deploy transaction from JSON',
    builder: (yargs) =>
      yargs
        .option('json', {
          describe: 'json string',
          demandOption: true,
        })
        .option('rpc', {
          describe: 'RPC URL',
          defaultDescription: JSON.stringify(RPC),
        }),
    handler: () => {},
  })
  .demandCommand().argv;

async function handler(argv: { [key: string]: any }) {
  const method = argv._[0];

  if (method === 'deploy') {
    await handleDeploy(argv as any);
  } else if (method === 'transfer') {
    await handleTransfer(argv as any);
  } else if (method === 'undelegate') {
    await handleUndelegate(argv as any);
  }
}

async function handleDeploy(argv: IDeployParams) {
  const txHash = await deploy({ json: JSON.parse(argv.json), rpc: argv.rpc });
  console.log(`\nTx hash:\n\n${txHash}`);
}

async function handleTransfer(argv: ITransferParams) {
  const keypair = readKeypair(argv.pub, argv.pk);
  const json = transfer({
    from: keypair,
    to: argv.to,
    amount: argv.amount,
    network: argv.network,
    gasPrice: argv.gasprice,
    memo: argv.memo,
    timestamp: argv.timestamp,
    ttl: argv.ttl,
  });

  if (argv.broadcast) {
    await handleDeploy({ json, rpc: argv.rpc });
  } else {
    stringifyJsonDeploy(json, argv.cleanjson);
  }
}

async function handleUndelegate(argv: IUndelegateParams) {
  const keypair = readKeypair(argv.pub, argv.pk);
  const json = undelegate({
    from: keypair,
    amount: argv.amount,
    validator: argv.validator,
    network: argv.network,
    gasPrice: argv.gasprice,
    timestamp: argv.timestamp,
    ttl: argv.ttl,
    paymentAmount: argv.payment,
    stakingContractHash: argv.contract,
  });

  if (argv.broadcast) {
    await handleDeploy({ json, rpc: argv.rpc });
  } else {
    stringifyJsonDeploy(json, argv.cleanjson);
  }
}

function stringifyJsonDeploy(json: any, clean: boolean) {
  let stringified = JSON.stringify(json);
  if (!clean) {
    stringified = JSON.stringify(stringified);
  }
  console.log(`\nSigned transaction:\n\n${stringified}`);
}

handler(argv);
