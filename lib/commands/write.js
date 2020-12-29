'use strict'

const { tryGetFile, createOrUpdateFile } = require('../api/common')
const log = require('../log')
const { encryptArchive, createArchive } = require('../util')

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

module.exports = write
