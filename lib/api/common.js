'use strict'

const util = require('util')

const fetch = require('node-fetch')

const { GITHUB_API } = require('../const')
const log = require('../log')
const { decryptArchive } = require('../util')

async function createOrUpdateFile(
  repo,
  filePath,
  token,
  contentBuffer,
  existingFileSha,
  message = `${existingFileSha ? 'update' : 'create'} %s`
) {
  const commitMessage = /%s/.test(message)
    ? util.format(message, filePath)
    : message

  log.verbose(
    `Committing file ${filePath} with message "${commitMessage}"`
  )

  const contentRes = await fetch(`${repo.url}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      accept: 'application/vnd.github.v3+json',
      authorization: `bearer ${token.access_token}`,
    },
    body: JSON.stringify({
      message: commitMessage,
      content: contentBuffer.toString('base64'),
      sha: existingFileSha,
    }),
  })

  const content = await contentRes.json()

  if (!contentRes.ok) {
    throw new Error(
      `Could not ${
        existingFileSha ? 'update' : 'create'
      } file ${filePath} in ${repo.full_name}`
    )
  }

  return content
}

async function tryGetFile(repo, filePath, token) {
  const contentRes = await fetch(`${repo.url}/contents/${filePath}`, {
    method: 'GET',
    headers: {
      accept: 'application/vnd.github.v3+json',
      authorization: `bearer ${token.access_token}`,
    },
  })

  if (!contentRes.ok) {
    return
  }

  return contentRes.json()
}

async function getUser(accessToken) {
  const userRes = await fetch(`${GITHUB_API}/user`, {
    headers: {
      accept: 'application/vnd.github.v3+json',
      authorization: `bearer ${accessToken}`,
    },
  })

  if (!userRes.ok) {
    throw new Error('Could not load user')
  }

  return userRes.json()
}

async function tryGetRepo(repositoryPath, accessToken) {
  log.debug(`Trying to get repository ${repositoryPath}`)

  const repoRes = await fetch(
    `${GITHUB_API}/repos/${repositoryPath}`,
    {
      headers: {
        accept: 'application/vnd.github.v3+json',
        authorization: `bearer ${accessToken}`,
      },
    }
  )

  if (!repoRes.ok) {
    return
  }

  const repo = await repoRes.json()

  log.debug(`Found repository ${repo.html_url}`)

  return repo
}

async function getRepoPublicKey(repo, token) {
  const publicKeyRes = await fetch(
    `${repo.url}/actions/secrets/public-key`,
    {
      headers: {
        accept: 'application/vnd.github.v3+json',
        authorization: `bearer ${token.access_token}`,
      },
    }
  )

  const publicKey = await publicKeyRes.json()

  if (!publicKeyRes.ok) {
    throw new Error('Could not retrive repository public key')
  }

  return publicKey
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

module.exports = {
  createOrUpdateFile,
  tryGetFile,
  tryGetRepo,
  getUser,
  getRepoPublicKey,
  downloadArchive,
}
