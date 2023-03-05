import Arweave from 'arweave'
import * as borsh from '@project-serum/borsh'
import { Connection, PublicKey } from '@solana/web3.js'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv';
dotenv.config();

const RPC = process.env.SOLANA_RPC_URL;
const connection = new Connection(RPC)
const fakekey = JSON.parse(
  fs
    .readFileSync(
      path.join(process.cwd(), 'requiredfiles', 'keypair.json'),
    )
    .toString(),
)

const arweavekey = JSON.parse(
  fs
    .readFileSync(
      path.join(process.cwd(), 'requiredfiles', 'ar2.json'),
    )
    .toString(),
)

export const uploadImageAndMetadataToArweave = async (x, name) => {
  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
    timeout: 20000,
    logging: false,
  });
  const wallet = arweavekey;

  console.log(name);
  const metadata = {
    name: name,
    symbol: 'SOVRN',
    description: 'Sovereign is a chess inspired 3D collectables with the main focus of providing value to the holders with excellent utilities',
    seller_fee_basis_points: 500,
    external_url: 'https://thesovereign.co/',
    attributes: x.attributes,
    collection: { name: 'Sovereign', family: 'Sovereign' },
    properties: {
      files: [
        {
          uri: x.image,
          type: 'image/png',
        },
      ],
      category: 'image',
      maxSupply: 0,
      creators: [
        {
          address: '5RxEEzCQm1AXzPZ6uE1DUWQ6ja9ExQXoafHjafvpkHJu',
          share: 100,
        },
      ],
    },
    image: x['image'],
  };
  const metadataRequest = JSON.stringify(metadata);
  const metadataTransaction = await arweave.createTransaction({
    data: metadataRequest,
  });
  metadataTransaction.addTag('Content-Type', 'application/json');
  await arweave.transactions.sign(metadataTransaction, wallet);
  const metadata_link = `https://arweave.net/${metadataTransaction.id}`;
  console.log(metadata_link);
  let uploadstatus = await arweave.transactions.post(metadataTransaction);
  if (uploadstatus.status !== 200) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await uploadImageAndMetadataToArweave(x, name);
  }
  else {
    const response = await fetch(metadata_link);
    if (response.ok) {
      const metadata = await response.json();
      return metadata_link;
    }
    else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await uploadImageAndMetadataToArweave(x, name);
    }
  }
};
export const getTransactionDetails = async (transactionHash) => {
  let retries = 0;
  const RETRY_DELAY = 5000;
  const MAX_RETRIES = 30;
  if (transactionHash) {
    while (retries < MAX_RETRIES) {
      try {

        const Tx_details = await connection.getParsedTransaction(transactionHash, {
          maxSupportedTransactionVersion: 0,
        });

        if (Tx_details?.meta) {
          const Tx_status = Tx_details.meta.err ? 'Failed' : 'Success';

          const { preTokenBalances, postTokenBalances } = Tx_details.meta;

          if (preTokenBalances && postTokenBalances) {
            const preTokenAmount = preTokenBalances[0]?.uiTokenAmount?.uiAmount;
            const postTokenAmount = postTokenBalances[0]?.uiTokenAmount?.uiAmount;
            const transferfrom = preTokenBalances[0]?.['owner'];
            const totheaccount = preTokenBalances[1]?.['owner'];

            if (preTokenAmount != null && postTokenAmount != null) {
              const tokenchange = preTokenAmount - postTokenAmount;
              return {
                status: Tx_status,
                transferfrom,
                totheaccount,
                tokenchange,
              };
            } else {
              console.log('Token amount not found');
            }
          } else {
            console.log('Token balances not found');
          }
          break;
        } else {
          const errorMessage = `Error getting transaction details for transaction hash ${transactionHash} ${retries}`;
          console.log(errorMessage);
          retries++;
          logdata(`Transaction confirmation #${retries}`);
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        }

      }
      catch (error) {
        retries++;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
    if (retries > 25) {
      logdata(`CHECKUP:- transaction not confirmed ${transactionHash}`)
    }
  }

};

export async function fetchOnChainMetadata(x) {
  const prgmId = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
  const tokenpubaddr = new PublicKey(x);
  const seeds = [Buffer.from('metadata'), prgmId.toBytes(), tokenpubaddr.toBytes()];
  const [metadataPDA, bump] = await PublicKey.findProgramAddress(seeds, prgmId);
  const accountInfo = await connection.getAccountInfo(metadataPDA);
  const borshMetadataLayout = borsh.struct([
    borsh.u8('key'),
    borsh.publicKey('updateAuthority'),
    borsh.publicKey('mint'),
    borsh.str('name'),
    borsh.str('symbol'),
    borsh.str('uri'),
    borsh.u16('Seller Basis Fee'),
    borsh.option(borsh.struct([borsh.u8('usemthood'), borsh.u64('remaining'), borsh.u64('total')]), 'uses'),
  ]);
  if (accountInfo) {
    const metadata = borshMetadataLayout.decode(accountInfo.data);
    if (metadata['updateAuthority'].toBase58() == '5KENMHv1aywjChmd3fnVGcyAR2gzjLYxy7ALm7egG1E8') {
      try {
        const response = await fetch(metadata.uri);
        const data = await response.json();
        if (data['image'].startsWith('https://nftstorage.link/ipfs')) {
          return data;
        } else {
          console.log("Image URL does not start with 'https://nftstorage.link/ipfs'");
        }
      } catch (error) {
        console.log('Error fetching metadata:', error);
      }
    } else {
      console.log('NFT has a different update authority');
    }
  }
}
export async function logdata(Message) {
  const now = new Date();
  const logMessage = { Time: `${now.toISOString()}`, Message: { Message } };
  const logFilePath = path.join(process.cwd(), 'requiredfiles', 'log.json');
  let logs = [];

  try {
    const fileContent = fs.readFileSync(logFilePath);
    logs = JSON.parse(fileContent.toString());
  } catch (err) {
    // ignore any errors when reading the file
  }

  logs.push(logMessage);

  // write the logs back to the file
  fs.writeFileSync(logFilePath, JSON.stringify(logs));
}

export function updatedlog(message) {
  const now = new Date()
  const logMessage1 = {
    Time: `${now.toISOString()}`,
    Message: { message },
  }
  const logFilePath1 = path.join(
    process.cwd(),
    'requiredfiles',
    'updatedlog.json',
  )
  let logs = []
  try {
    const fileContent1 = fs.readFileSync(logFilePath1)
    logs = JSON.parse(fileContent1.toString())
  } catch (err) { }
  logs.push(logMessage1)
  fs.writeFileSync(logFilePath1, JSON.stringify(logs))
}
export function alllog(parameter) {
  const now = new Date()
  const logMessage2 = {
    Time: `${now.toISOString()}`,
    Method: { parameter },
  }
  const logFilePath2 = path.join(
    process.cwd(),
    'requiredfiles',
    'apilog.json',
  )
  let logs = []
  try {
    const fileContent2 = fs.readFileSync(logFilePath)
    logs = JSON.parse(fileContent2.toString())
  } catch (err) { }
  logs.push(logMessage2)
  fs.writeFileSync(logFilePath2, JSON.stringify(logs))
}

export function updatedwithtypelog(message) {
  const now = new Date()
  const logMessage1 = {
    Time: `${now.toISOString()}`,
    Message: { message },
  }
  const logFilePath1 = path.join(
    process.cwd(),
    'requiredfiles',
    'updatedwithtype.json',
  )
  let logs = []
  try {
    const fileContent1 = fs.readFileSync(logFilePath1)
    logs = JSON.parse(fileContent1.toString())
  } catch (err) { }
  logs.push(logMessage1)
  fs.writeFileSync(logFilePath1, JSON.stringify(logs))
}
