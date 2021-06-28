import { CasperClient, Keys, CasperServiceByJsonRPC } from 'casper-client-sdk';
// import { CASPER_NODE_URL } from './env';

// const casperPubPath = './casper_public.pem';
// const casperPkPath = './casper_private.pem';

// export const client = new CasperClient(CASPER_NODE_URL);

// export const jsonRpcClient = new CasperServiceByJsonRPC(CASPER_NODE_URL);

// export const keypair = Keys.Ed25519.parseKeyFiles(casperPubPath, casperPkPath);

// console.info(`Casper wallet is ${keypair.accountHex()}`);

export function readKeypair(pubPath: string, privPath: string) {
  const keypair = Keys.Ed25519.parseKeyFiles(pubPath, privPath);
  console.info(`Signer wallet is ${keypair.accountHex()}`);

  return keypair;
}

export function createClient(rpcUrl: string) {
  return new CasperClient(rpcUrl);
}

export function createJsonClient(rpcUrl: string) {
  return new CasperServiceByJsonRPC(rpcUrl);
}
