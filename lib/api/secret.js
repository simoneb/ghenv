'use strict'

const fetch = require('node-fetch')
const sodium = require('tweetsodium')

const log = require('../log')

const { getRepoPublicKey } = require('./common')

async function createSecret(
  repo,
  token,
  secretName,
  secretValueBuffer
) {
  log.debug('Getting repository public key')

  const repoPublicKey = await getRepoPublicKey(repo, token)

  const keyBuffer = Buffer.from(repoPublicKey.key, 'base64')

  const encryptedSecretBase64 = Buffer.from(
    sodium.seal(secretValueBuffer, keyBuffer)
  ).toString('base64')

  log.debug(`Creating secret ${secretName}`)

  const secretRes = await fetch(
    `${repo.url}/actions/secrets/${secretName}`,
    {
      method: 'PUT',
      headers: {
        accept: 'application/vnd.github.v3+json',
        authorization: `bearer ${token.access_token}`,
      },
      body: JSON.stringify({
        encrypted_value: encryptedSecretBase64,
        key_id: repoPublicKey.key_id,
      }),
    }
  )

  if (!secretRes.ok) {
    throw new Error(`Could not create secret ${secretName}`)
  }

  log.debug(`Secret ${secretName} created`)

  return secretRes
}

async function tryGetSecret(repo, token, secretName) {
  const secretRes = await fetch(
    `${repo.url}/actions/secrets/${secretName}`,
    {
      headers: {
        accept: 'application/vnd.github.v3+json',
        authorization: `bearer ${token.access_token}`,
      },
    }
  )

  const secret = await secretRes.json()

  if (!secretRes.ok) {
    return
  }

  return secret
}

module.exports = {
  createSecret,
  tryGetSecret,
}
