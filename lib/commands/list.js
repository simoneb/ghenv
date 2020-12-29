'use strict'

const glob = require('readdir-glob')
const unzipper = require('unzipper')

const { downloadArchive } = require('../api/common')
const { HOST_ROOT } = require('../const')
const log = require('../log')

async function list({
  repo,
  token,
  fileName,
  pattern,
  remote,
  config,
}) {
  const names = await (remote
    ? listRemote(repo, token, fileName, config)
    : listLocal(pattern))

  log(names.join('\n'))
}

function listLocal(pattern) {
  return new Promise((resolve, reject) => {
    const globber = glob(HOST_ROOT, {
      pattern,
      ignore: ['node_modules'],
    })

    const files = []

    globber.on('match', files.push.bind(files))
    globber.on('error', reject)
    globber.on('end', () => resolve(files.map(f => f.relative)))
  })
}

async function listRemote(repo, token, fileName, config) {
  const archive = await downloadArchive(
    repo,
    token,
    fileName,
    config.encryptionKey
  )
  const zip = await unzipper.Open.buffer(archive)

  return zip.files.map(f => f.path)
}

module.exports = list
module.exports.listLocal = listLocal
