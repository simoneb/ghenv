'use strict'

const fs = require('fs')

const unzipper = require('unzipper')
const glob = require('readdir-glob')

const { tryGetFile, createOrUpdateFile } = require('./api/common')
const { ROOT_DIR } = require('./const')
const log = require('./log')
const {
  encryptArchive,
  createArchive,
  decryptArchive,
} = require('./util')

async function write({
  repo,
  token,
  pattern,
  fileName,
  message,
  config,
}) {
  const archive = await createArchive(pattern)
  const encryptedArchive = encryptArchive(
    archive,
    config.encryptionKey
  )
  const existingArchive = await tryGetFile(repo, fileName, token)

  if (!existingArchive) {
    log.info(
      `File ${fileName} does not exist in repository, creating`
    )
  } else {
    log.info(
      `File ${fileName} already exists in repository, updating`
    )
  }

  return await createOrUpdateFile(
    repo,
    fileName,
    token,
    encryptedArchive,
    existingArchive ? existingArchive.sha : undefined,
    message
  )
}

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
    const globber = glob(ROOT_DIR, { pattern })

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

async function downloadArchive(repo, token, fileName, encryptionKey) {
  log.verbose('Downloading archive')

  const file = await tryGetFile(repo, fileName, token)

  if (!file) {
    throw new Error(
      `Could not find file "${fileName}" in repository ${repo.html_url}`
    )
  }

  const encryptedArchive = Buffer.from(file.content, file.encoding)

  return decryptArchive(encryptedArchive, encryptionKey)
}

async function explain({ repo, pattern, fileName }) {
  log`{bold Repository:} ${repo.html_url}`
  log`{bold File name:} ${fileName}`
  log`{bold Pattern:} ${pattern}`
  log`{bold Matched files:}`

  const files = await listLocal(pattern)

  log(files.map(f => `- ${f}`).join('\n'))
}

module.exports = {
  read,
  view,
  write,
  list,
  explain,
}
