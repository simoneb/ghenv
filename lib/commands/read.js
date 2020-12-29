'use strict'

const unzipper = require('unzipper')

const { downloadArchive } = require('../api/common')
const { ROOT_DIR } = require('../const')
const log = require('../log')

async function read({ repo, token, fileName, config }) {
  const archive = await downloadArchive(
    repo,
    token,
    fileName,
    config.encryptionKey
  )
  const zip = await unzipper.Open.buffer(archive)

  log.info('Replacing local files')

  await zip.extract({
    path: ROOT_DIR,
    verbose: true,
  })
}

module.exports = read
