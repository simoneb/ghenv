'use strict'

const unzipper = require('unzipper')

const { downloadArchive } = require('../api/common')
const { HOST_ROOT } = require('../const')
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
    path: HOST_ROOT,
    verbose: true,
  })
}

module.exports = read
