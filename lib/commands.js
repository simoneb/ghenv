'use strict'

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

async function write({ repo, token, pattern, fileName, message }) {
  const archive = await createArchive(pattern)
  const encryptedArchive = encryptArchive(archive)
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

async function read({ repo, token, fileName }) {
  const archive = await downloadArchive(repo, token, fileName)
  const zip = await unzipper.Open.buffer(archive)

  log.info('Replacing local files')

  await zip.extract({
    path: ROOT_DIR,
    verbose: true,
  })
}

async function list({ repo, token, fileName, pattern, remote }) {
  const names = await (remote
    ? listRemote(repo, token, fileName)
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

async function listRemote(repo, token, fileName) {
  const archive = await downloadArchive(repo, token, fileName)
  const zip = await unzipper.Open.buffer(archive)

  return zip.files.map(f => f.path)
}

async function view({ repo, token, fileName }) {
  const archive = await downloadArchive(repo, token, fileName)
  const zip = await unzipper.Open.buffer(archive)

  for (const file of zip.files) {
    const l = 30 - file.path.length
    const h = '-'.repeat(l / 2)

    log`${h} {bold ${file.path}} ${h}`
    log(await file.buffer())
  }
}

async function downloadArchive(repo, token, fileName) {
  log.verbose('Downloading archive')

  const file = await tryGetFile(repo, fileName, token)

  if (!file) {
    throw new Error(
      `Could not find file "${fileName}" in repository ${repo.html_url}`
    )
  }

  const encryptedArchive = Buffer.from(file.content, file.encoding)

  return decryptArchive(encryptedArchive)
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
