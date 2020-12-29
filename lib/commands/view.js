'use strict'

const fs = require('fs')

const unzipper = require('unzipper')

const { downloadArchive } = require('../api/common')
const log = require('../log')

const { listLocal } = require('./list')

async function view({
  repo,
  token,
  fileName,
  config,
  pattern,
  remote,
}) {
  return remote
    ? viewRemote(repo, token, fileName, config)
    : viewLocal(pattern)
}

module.exports = view

async function viewLocal(pattern) {
  const files = await listLocal(pattern)

  for (const file of files) {
    viewHeader(file)
    log(fs.readFileSync(file))
  }
}

async function viewRemote(repo, token, fileName, config) {
  const archive = await downloadArchive(
    repo,
    token,
    fileName,
    config.encryptionKey
  )
  const zip = await unzipper.Open.buffer(archive)

  for (const file of zip.files) {
    viewHeader(file.path)
    log(await file.buffer())
  }
}

function viewHeader(filePath) {
  const l = 30 - filePath.length
  const h = '-'.repeat(l / 2)

  log`${h} {bold ${filePath}} ${h}`
}
