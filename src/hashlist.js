
import express from 'express';
import fs from 'fs'
import path from 'path'
import { logdata, getTransactionDetails, uploadImageAndMetadataToArweave, fetchOnChainMetadata } from './functions.js'
const hashlist = express.Router();

function filterByStatus(status) {
  const unupatedhashlist = JSON.parse(
    fs
      .readFileSync(
        path.join(process.cwd(), 'requiredfiles', 'list.json'),
      )
      .toString(),

  )
  const filtered = {};
  for (const [key, value] of Object.entries(unupatedhashlist)) {
    for (const key in value) {
      if (value[key]['Status'].toLowerCase() === status) {
        filtered[value.mintaddress] = Object.assign(Object.assign({}, filtered[value.mintaddress]), value);
      }
    }
  }
  if (status === 'all') {
    for (const [key, value] of Object.entries(unupatedhashlist)) {
      for (const key in value) {
        filtered[value.mintaddress] = Object.assign(Object.assign({}, filtered[value.mintaddress]), value);
      }
    }
  }
  return {
    status: status === 'upgraded'
      ? 'Updated'
      : status === 'upgrading'
        ? 'Updating'
        : status === 'upgraded'
          ? 'Updated'
          : 'All',
    data: Object.values(filtered),
  };
}

hashlist.use(async (req, res) => {
  if (req.method === 'GET') {
    const status = req.query.status
      ? req.query.status.toLowerCase()
      : '';
    if (status) {
      if (status === 'unupgraded' ||
        status === 'upgraded' ||
        status == 'upgrading') {
        const filtered = filterByStatus(status);
        res.status(200).json(filtered);
      }
      else {
        res.status(405).json({ error: `${status} not found` });
      }
    }
    else {
      const allstatus = filterByStatus('all');
      res.status(200).json(allstatus);
    }
  }
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
});
export default hashlist;
