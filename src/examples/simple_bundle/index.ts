require('dotenv').config();

import * as fs from 'fs';
import * as path from 'path';

import {Keypair, Connection} from '@solana/web3.js';
import * as bip39 from 'bip39';
import {derivePath} from 'ed25519-hd-key';
import {searcherClient} from '../../sdk/block-engine/searcher';
import {onBundleResult, sendBundles} from './utils';

// BIP-44 standard deterministic wallets
// m     = master seed
// 44'   = purpose (BIP44)
// 501'  = coin type (501 is Solana's coin type)
// 0'    = account index
// 0'    = change (0 for external, 1 for internal)
export function createKeypairFromMnemonic(
  mnemonic: string,
  accountIndex: number
) {
  // Validate a mnemonic
  const isValid = bip39.validateMnemonic(mnemonic);
  if (!isValid) {
    throw new Error('Invalid mnemonic');
  }

  const path = `m/44'/501'/${accountIndex}'/0'`;
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const derivedSeed = derivePath(path, seed.toString('hex')).key;
  return Keypair.fromSeed(derivedSeed);
}

const main = async () => {
  const blockEngineUrl = 'mainnet.block-engine.jito.wtf';
  console.log('BLOCK_ENGINE_URL:', blockEngineUrl);

  // const authKeypairPath = '/Users/john/code/solana/keys/J1tozVnYoUrJc9NnjKzbaQEdU9kmTuYKWbdMjRbSpBtC.json';
  // console.log('AUTH_KEYPAIR_PATH:', authKeypairPath);
  // const decodedKey = new Uint8Array(
  //   JSON.parse(Fs.readFileSync(authKeypairPath).toString()) as number[]
  // );
  // const keypair = Keypair.fromSecretKey(decodedKey);

  const johnPhantomMnemonic = fs.readFileSync(
    '/Users/john/code/solana/keys/john.phantom.phrase',
    'utf8'
  );
  const keypair = createKeypairFromMnemonic(johnPhantomMnemonic, 0);
  console.log(keypair.publicKey.toBase58());

  // const _accounts = (process.env.ACCOUNTS_OF_INTEREST || '').split(',');
  // console.log('ACCOUNTS_OF_INTEREST:', _accounts);
  // const accounts = _accounts.map(a => new PublicKey(a));

  const bundleTransactionLimit = 5;

  const engineURLs = [
    'mainnet.block-engine.jito.wtf',
    'amsterdam.mainnet.block-engine.jito.wtf',
    'frankfurt.mainnet.block-engine.jito.wtf',
    'ny.mainnet.block-engine.jito.wtf',
    'tokyo.mainnet.block-engine.jito.wtf',
    'slc.mainnet.block-engine.jito.wtf',
    'dallas.testnet.block-engine.jito.wtf',
    'ny.testnet.block-engine.jito.wtf',
  ];

  // const client = searcherClient('tokyo.mainnet.block-engine.jito.wtf');

  const clients = engineURLs.map(url => searcherClient(url));

  const rpcUrl =
    'https://mainnet.helius-rpc.com/?api-key=9a45287f-daed-4752-882d-908d0fbc0d25';

  console.log('RPC_URL:', rpcUrl);
  const conn = new Connection(rpcUrl, 'confirmed');

  // const client = await sendBundles(
  //   clients,
  //   bundleTransactionLimit,
  //   keypair,
  //   conn
  // );

  const client = await sendBundles(
    clients,
    bundleTransactionLimit,
    keypair,
    conn
  );

  console.log('client:', client);

  onBundleResult(client);

  // client.bundleResults
};

main()
  .then(() => {
    console.log('Sending bundle');
  })
  .catch(e => {
    throw e;
  });
