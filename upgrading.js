import { uploadImageAndMetadataToArweave, alllog, updatedlog, getTransactionDetails, fetchOnChainMetadata, logdata, updatedwithtypelog } from './functions.js';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as mpl from '@metaplex-foundation/mpl-token-metadata';
import { web3 } from '@project-serum/anchor';
import path from 'path';
import fs from 'fs';
import express from 'express';
import { Mutex } from 'async-mutex';
import dotenv from 'dotenv';
dotenv.config();

const newnftdata = JSON.parse(
  fs
    .readFileSync(
      path.join(process.cwd(), 'requiredfiles', 'newnftdata.json'),
    )
    .toString(),
)
const fakekey = JSON.parse(
  fs
    .readFileSync(
      path.join(process.cwd(), 'requiredfiles', 'keypair.json'),
    )
    .toString(),
)

const listpath = path.join(process.cwd(), 'requiredfiles', 'list.json');
const newdatapath = path.join(process.cwd(), 'requiredfiles', 'newnftdata.json');

const RPC = process.env.SOLANA_RPC_URL;
const connection = new Connection(RPC);

const mutex = new Mutex();
const reciver_address = process.env.RECIEVER_ADDRESS;
const updateAuthoritySecretKey = fakekey;

const upgrading = express.Router();
upgrading.use(async (req, res) => {
  if (req.method === 'PATCH') {

    if (req.body.Tx_Hash && req.body.Mint_address) {

      const transactionHash = req.body.Tx_Hash;
      alllog(req.method, req.url);
      handleRequest(req, transactionHash)
        .then((result) => {
          res.send(result);
        })
        .catch((error) => {
          console.log(error);
          res.status(500).send('Internal Server Error');
        });
    } else {
      res.status(400).send('Invalid Request');
    }
  } else {
    res.status(404).send('Cannot Find The Page');
  }
});

async function handleRequest(req, transactionHash) {
  const release = await mutex.acquire();
  try {
    const details = await getTransactionDetails(transactionHash);
    if (((details['status']) === 'Success' && (details['transferfrom']) === reciver_address && (details.tokenchange) < -999) || ((details['status']) === 'Success' && (details['totheaccount']) && details.tokenchange > 999)) {
      const PrevDataVerified = await fetchOnChainMetadata(req.body.Mint_address);
      if (PrevDataVerified) {
        const Default_name = PrevDataVerified.name;
        const Skin_Color = PrevDataVerified.attributes.find((attr) => attr.trait_type === 'Skin')['value'];
        const newupgradedata = await getupdaternft(Skin_Color, req.body.Mint_address);
        const uploadmetadata = await uploadImageAndMetadataToArweave(newupgradedata, Default_name);
        logdata({
          type: 'pass the transaction verification, metadata,newmetadta',
          tx_details: details,
          prev_name: Default_name,
          prev_skin_color: Skin_Color,
          new_data: uploadmetadata,
        });
        if (uploadmetadata) {
          const update = await update_uri(updateAuthoritySecretKey, req.body.Mint_address, Default_name, uploadmetadata, transactionHash, newupgradedata);
        }
        return {
          status: "Upgarde succesfull"
        };
      } else {
        return 'Previous Data Not Verified';
      }
    }
  } finally {
    release(); // release the lock
  }
}
const getupdaternft = async (skin_color, mint_address) => {
  const existingNFT = newnftdata.find((obj) => obj.token_mint === mint_address);
  if (existingNFT) {
    let upgrade = existingNFT;
    console.log(upgrade)
    return upgrade;
  }
  else {
    const upgradeable = newnftdata.filter((obj) => obj.Status.toLowerCase() === 'false'.toLocaleLowerCase());
    const skin = skin_color;
    const Randomlyselectionofdata = upgradeable.filter((obj) => obj.attributes.some((attr) => attr.trait_type === 'Skin' &&
      attr.value.toLowerCase() === skin.toLowerCase()));
    const randomupgrade = Randomlyselectionofdata[Math.floor(Math.random() * Randomlyselectionofdata.length)];
    const listContent = fs.readFileSync(listpath, 'utf8');
    const listData = JSON.parse(listContent);
    const nftIndex = listData.findIndex((obj) => obj[mint_address]);
    if (nftIndex !== -1) {
      listData[nftIndex][mint_address].Status = 'Upgrading';
      fs.writeFileSync(listpath, JSON.stringify(listData, null, 2), 'utf8');
    }
    const newdatcontent = fs.readFileSync(newdatapath, 'utf8');
    randomupgrade.Status = 'upgrading';
    randomupgrade.token_mint = mint_address;
    fs.writeFileSync(newdatapath, JSON.stringify(newnftdata, null, 2));
    return randomupgrade;
  }
};

async function update_uri(updateAuthoritySecretKey, mint_account, name, new_uri, transactionHash, newupgradedata) {
  let mint_pubkey = new PublicKey(mint_account);
  let update_authority_key = Keypair.fromSecretKey(new Uint8Array(updateAuthoritySecretKey));
  let update_authority = update_authority_key.publicKey.toBase58();
  const data_v2 = {
    name: name,
    symbol: 'SOVERGN',
    uri: new_uri,
    sellerFeeBasisPoints: 500,
    creators: [
      {
        address: new PublicKey('GCRpypd75YYJmwi1ZWswntpLeHQepq1Ct1u3romcHtRC'),
        share: 0,
        verified: true,
      },
      {
        address: new PublicKey('9rWmyA7CEYCoqdQkHoGNv8HMR3L7DUhPKEntf7uVFe2E'),
        share: 0,
        verified: false,
      },
      {
        address: new PublicKey('5RxEEzCQm1AXzPZ6uE1DUWQ6ja9ExQXoafHjafvpkHJu'),
        share: 100,
        verified: false,
      },
    ],
    collection: {
      verified: true,
      key: new PublicKey('DpvdmDb7LNnHgAtVagJ5G4y6QwYTBjsb8u6xSit7ip7L'),
    },
    uses: null,
  };
  let ix;
  const args = {
    updateMetadataAccountArgsV2: {
      data: data_v2,
      isMutable: true,
      updateAuthority: new PublicKey(update_authority),
      primarySaleHappened: true,
    },
  };
  const prgmId = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
  const seeds = [
    Buffer.from('metadata'),
    prgmId.toBytes(),
    mint_pubkey.toBytes(),
  ];
  const [metadataPDA, bump] = await PublicKey.findProgramAddress(seeds, prgmId);
  const accounts = {
    metadata: metadataPDA,
    updateAuthority: new PublicKey(update_authority),
  };
  ix = mpl.createUpdateMetadataAccountV2Instruction(accounts, args);
  const tx = new web3.Transaction();
  tx.add(ix);
  const txid = await web3.sendAndConfirmTransaction(connection, tx, [
    update_authority_key,
  ]);

  if (txid) {
    console.log(txid)
    logdata({
      type: 'Update Done',
      tx_details: transactionHash,
      token: mint_account,
    });
    updatedlog({
      type: 'Update Done',
      tx_details: transactionHash,
      token: mint_account
    });
    updatedwithtypelog({
      type: newupgradedata.attributes[1]["value"],
      token: mint_account,
    });

    const listContent = fs.readFileSync(listpath, 'utf8');
    const listData = JSON.parse(listContent);
    const nftIndex = listData.findIndex((obj) => obj[mint_account]);
    if (nftIndex !== -1) {
      listData[nftIndex][mint_account].Status = 'upgraded';
      listData[nftIndex][mint_account].Upgraded_Uri = new_uri;
      listData[nftIndex][mint_account].Upgraded_Transaction_details = transactionHash;
      fs.writeFileSync(listpath, JSON.stringify(listData, null, 2), 'utf8');
    }
    const newdatcontent = fs.readFileSync(newdatapath, 'utf8');
    const nftDataIndex = newnftdata.findIndex((obj) => obj.token_mint === mint_account);
    if (nftDataIndex !== -1) {
      newnftdata[nftDataIndex].Status = 'upgraded';
      fs.writeFileSync(newdatapath, JSON.stringify(newnftdata, null, 2));
    }
    fs.writeFileSync(newdatapath, JSON.stringify(newnftdata, null, 2));
  }
}
export default upgrading;
