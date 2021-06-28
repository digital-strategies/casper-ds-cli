const axios = require('axios');

const RPC_URL = 'https://node-clarity-mainnet.make.services/rpc';

const body = {
  jsonrpc: '2.0',
  id: '33',
  method: 'account_put_deploy',
  params: {
    deploy: {
      hash: 'f5941df6161f8118e8035521ced260ec3689940dab4a4f7a70f2c5ca7199508c',
      header: {
        account: '0181dd6e2f7ed815c0246f210aa169882f8e821d874a43f817f77a795147beed61',
        timestamp: '2021-06-24T21:33:44.277Z',
        // "timestamp":"2021-06-24T21:33:44.277Z",
        ttl: '30m',
        gas_price: 1,
        body_hash: '392764d6905dd26b6a808c48e41cc35175ce41f34e0f0e75772081b80bb50aa0',
        dependencies: [],
        chain_name: 'casper',
      },
      payment: {
        ModuleBytes: {
          module_bytes: '',
          args: [['amount', { cl_type: 'U512', bytes: '040065cd1d', parsed: 'null' }]],
        },
      },
      session: {
        StoredContractByHash: {
          hash: '73c9589d8bebbf6dc853707c5e157145c2d8ac8765f93ba3342a7cc2908b2346',
          entry_point: 'undelegate',
          args: [
            [
              'delegator',
              {
                cl_type: 'PublicKey',
                bytes: '0181dd6e2f7ed815c0246f210aa169882f8e821d874a43f817f77a795147beed61',
                parsed: 'null',
              },
            ],
            [
              'validator',
              {
                cl_type: 'PublicKey',
                bytes: '0190c434129ecbaeb34d33185ab6bf97c3c493fc50121a56a9ed8c4c52855b5ac1',
                parsed: 'null',
              },
            ],
            ['amount', { cl_type: 'U512', bytes: '0500e40b5402', parsed: 'null' }],
          ],
        },
      },
      approvals: [
        {
          signer: '0181dd6e2f7ed815c0246f210aa169882f8e821d874a43f817f77a795147beed61',
          signature:
            '019ba1f298654794c85d567d46f87b06e8b8c4c4e94a6bf53f3dc81ede1f1f6fb9f6070be904366d0eaeda1a2fdbe2326d1334c377f3af85338e6cfd467834ff0d',
        },
      ],
    },
  },
};

async function sendRpcRequest(body) {
  const { data } = await axios.default.post(RPC_URL, body, {
    headers: { 'Content-Type': 'application/json' },
  });

  return data;
}

// sendRpcRequest({"jsonrpc":"2.0","id":"33","method":"account_put_deploy","params":{}}).then(console.log).then(console.error)
sendRpcRequest(body).then(console.log).then(console.error);
