import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';

import {SearcherClient} from '../../sdk/block-engine/searcher';
import {Bundle} from '../../sdk/block-engine/types';
import {isError} from '../../sdk/block-engine/utils';

const MEMO_PROGRAM_ID = 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo';

export const sendBundles = async (
  clients: SearcherClient[],
  bundleTransactionLimit: number,
  keypair: Keypair,
  conn: Connection
) => {
  const _tipAccount = (await clients[0].getTipAccounts())[0];
  console.log('tip account:', _tipAccount);
  const tipAccount = new PublicKey(_tipAccount);

  const balance = await conn.getBalance(keypair.publicKey);
  console.log('current account has balance: ', balance);

  let isLeaderSlot = false;
  let client: SearcherClient = clients[0];

  while (!isLeaderSlot) {
    isLeaderSlot = false;
    for (const c of clients) {
      const next_leader = await c.getNextScheduledLeader();
      const num_slots = next_leader.nextLeaderSlot - next_leader.currentSlot;
      console.log(`next jito leader slot in ${num_slots} slots`);
      isLeaderSlot = num_slots <= 2;
      if (isLeaderSlot) {
        client = c;
        break;
      }
    }
    console.log('waiting for leader slot...');
    await new Promise(r => setTimeout(r, 500));
  }

  // while (!isLeaderSlot) {
  //   const next_leader = await clients.getNextScheduledLeader();
  //   const num_slots = next_leader.nextLeaderSlot - next_leader.currentSlot;
  //   isLeaderSlot = num_slots <= 2;
  //   console.log(`next jito leader slot in ${num_slots} slots`);
  // }

  const blockHash = await conn.getLatestBlockhash();
  const b = new Bundle([], bundleTransactionLimit);

  console.log(blockHash.blockhash);

  const bundles = [b];

  let maybeBundle = b.addTransactions(
    buildMemoTransaction(keypair, 'jito test 1', blockHash.blockhash),
    buildMemoTransaction(keypair, 'jito test 2', blockHash.blockhash)
  );
  if (isError(maybeBundle)) {
    throw maybeBundle;
  }

  maybeBundle = maybeBundle.addTipTx(
    keypair,
    110_000,
    tipAccount,
    blockHash.blockhash
  );

  if (isError(maybeBundle)) {
    throw maybeBundle;
  }

  bundles.map(async b => {
    try {
      const resp = await client.sendBundle(b);
      console.log('resp:', resp);
    } catch (e) {
      console.error('error sending bundle:', e);
    }
  });

  console.log('return from sendBundles');
  return client;
};

export const onBundleResult = (c: SearcherClient) => {
  console.log('onBundleResult');
  c.onBundleResult(
    result => {
      console.log('received bundle result:', result);
    },
    e => {
      throw e;
    }
  );
  console.log('onBundleResult done');
};

const buildMemoTransaction = (
  keypair: Keypair,
  message: string,
  recentBlockhash: string
): VersionedTransaction => {
  const ix = new TransactionInstruction({
    keys: [
      {
        pubkey: keypair.publicKey,
        isSigner: true,
        isWritable: true,
      },
    ],
    programId: new PublicKey(MEMO_PROGRAM_ID),
    data: Buffer.from(message),
  });

  const instructions = [ix];

  const messageV0 = new TransactionMessage({
    payerKey: keypair.publicKey,
    recentBlockhash: recentBlockhash,
    instructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(messageV0);

  tx.sign([keypair]);

  console.log('txn signature is: ', bs58.encode(tx.signatures[0]));
  return tx;
};
