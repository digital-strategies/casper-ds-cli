export const SECOND_MILLIS = 1000;
export const MINUTE_MILLIS = 60 * SECOND_MILLIS;
export const HOUR_MILLIS = 60 * MINUTE_MILLIS;
export const DEFAULT_TTL = 6 * HOUR_MILLIS;
export const MAINNET_RPC = 'http://134.209.243.124:7777/rpc';
export const TESTNET_RPC = 'https://node-clarity-testnet.make.services/rpc';
export const RPC = {
  casper: MAINNET_RPC,
  'casper-test': TESTNET_RPC,
};
// export const MAINNET_STAKING_CONTRACT_HASH = '73c9589d8bebbf6dc853707c5e157145c2d8ac8765f93ba3342a7cc2908b2346';
export const MAINNET_STAKING_CONTRACT_HASH = 'ccb576d6ce6dec84a551e48f0d0b7af89ddba44c7390b690036257a04a3ae9ea';
export const TESTNET_STAKING_CONTRACT_HASH = '68e15f19eb37e6062c1a73d26acf3793bf39027713db6c4ff2baad6e7a5054f1';
export const STAKING_CONTRACT = {
  casper: MAINNET_STAKING_CONTRACT_HASH,
  'casper-test': TESTNET_STAKING_CONTRACT_HASH,
};
