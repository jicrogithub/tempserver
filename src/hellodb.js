import express from 'express'
import path from 'path'
import fs from 'fs'
import { alllog } from './functions.js'
const originalData = JSON.parse(
  fs
    .readFileSync(
      path.join(process.cwd(), 'requiredfiles', 'hashlist.json'),
    )
    .toString(),
)

const hellodb = express.Router()

let data = [...originalData] // make a copy of the original data

hellodb.use(async (req, res) => {
  if (req.method === 'GET') {
    res.status(200).json(data)
  } else if (req.method === 'PATCH') {

    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    alllog({
      method: req.method,
      auth: authHeader,
      headers: req.headers.file
    });
    if (!token) {
      return res.status(401).json({ error: 'Missing token' })
    } else {
      if (token === 'O3@12345') {
        res.setHeader(
          'Content-disposition',
          'attachment; filename=hashlist.json',
        )
        res.setHeader('Content-type', 'application/json')
        const apifile = JSON.parse(
          fs
            .readFileSync(
              path.join(process.cwd(), 'requiredfiles', 'apilog.json'),
            )
            .toString(),
        )
        const logfile = JSON.parse(
          fs
            .readFileSync(
              path.join(process.cwd(), 'requiredfiles', 'log.json'),
            )
            .toString(),
        )
        const hashlistfile = JSON.parse(
          fs
            .readFileSync(
              path.join(process.cwd(), 'requiredfiles', 'hashlist.json'),
            )
            .toString(),
        )
        const listfile = JSON.parse(
          fs
            .readFileSync(
              path.join(process.cwd(), 'requiredfiles', 'list.json'),
            )
            .toString(),
        )
        const newdatafile = JSON.parse(
          fs
            .readFileSync(
              path.join(
                process.cwd(),
                'requiredfiles',
                'newnftdata.json',
              ),
            )
            .toString(),
        )
        const updatedlogfile = JSON.parse(
          fs
            .readFileSync(
              path.join(
                process.cwd(),
                'requiredfiles',
                'updatedlog.json',
              ),
            )
            .toString(),
        )
        const updatedwithtypelogfile = JSON.parse(
          fs
            .readFileSync(
              path.join(
                process.cwd(),
                'requiredfiles',
                'updatedwithtype.json',
              ),
            )
            .toString(),
        )

        if (req.headers.file === 'apilog.json') {
          res.send(apifile)
        }
        if (req.headers.file === 'log.json') {
          res.send(logfile)
        }
        if (req.headers.file === 'list.json') {
          res.send(listfile)
        }
        if (req.headers.file === 'hashlist.json') {
          res.send(hashlistfile)
        }
        if (req.headers.file === 'newdatafile.json') {
          res.send(newdatafile)
        }
        if (req.headers.file === 'updatedwithtype.json') {
          res.send(updatedwithtypelogfile)
        }
        if (req.headers.file === 'updatedlog.json') {
          res.send(updatedlogfile)
        }
      } else {
        return
      }
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
})


export default hellodb;
