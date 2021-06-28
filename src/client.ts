import { CasperClient, Keys, CasperServiceByJsonRPC } from 'casper-client-sdk';

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
