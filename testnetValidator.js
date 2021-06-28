// eslint-disable-next-line import/no-extraneous-dependencies
const fetch = require('node-fetch');
const ethers = require('ethers');

// WIP

async function getBestPeer() {
  const stakes = await getPeersStake();
  const highestStake = stakes.sort((a, b) => {
    if (ethers.BigNumber.from(b.amount).gt(ethers.BigNumber.from(a.amount))) {
      return 1;
    }
    if (ethers.BigNumber.from(b.amount).eq(ethers.BigNumber.from(a.amount))) {
      return 0;
    }

    return -1;
  })[0];
  console.log(highestStake);

  const nodes = await getConnectedNodes();

  console.log(nodes);
}

async function getPeersStake() {
  const res = await fetch('https://node-clarity-testnet.make.services/rpc', {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9,pl;q=0.8',
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      pragma: 'no-cache',
      'sec-ch-ua': '" Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"',
      'sec-ch-ua-mobile': '?0',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
    },
    referrer: 'https://testnet.cspr.live/',
    referrerPolicy: 'strict-origin-when-cross-origin',
    body: '{"jsonrpc":"2.0","id":"0","method":"state_get_auction_info","params":[]}',
    method: 'POST',
    mode: 'cors',
  });

  const json = await res.json();

  return json.result.auction_state.bids.map((bid) => ({
    address: bid.public_key,
    amount: bid.bid.staked_amount,
  }));
}

async function getConnectedNodes() {
  const res = await fetch('https://node-clarity-testnet.make.services/rpc', {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9,pl;q=0.8',
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      pragma: 'no-cache',
      'sec-ch-ua': '" Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"',
      'sec-ch-ua-mobile': '?0',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
    },
    referrer: 'https://testnet.cspr.live/',
    referrerPolicy: 'strict-origin-when-cross-origin',
    body: '{"jsonrpc":"2.0","id":"1","method":"info_get_status","params":[]}',
    method: 'POST',
    mode: 'cors',
  });

  const json = await res.json();

  return json.result.peers.map((peer) => peer.address.split(':')[0]);
}
