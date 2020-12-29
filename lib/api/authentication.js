'use strict'

const fetch = require('node-fetch')
const open = require('open')

const { CLIENT_ID } = require('../const')
const log = require('../log')
const { delay } = require('../util')

const { getUser } = require('./common')

async function tryUseStoredToken(config) {
  const storedToken = config.token

  if (!storedToken) {
    return null
  }

  log.debug('Found stored token')

  try {
    await getUser(storedToken.access_token)

    log.debug('Stored token is valid')

    return storedToken
  } catch (err) {
    log.debug('Stored token is invalid')

    return null
  }
}

async function login(config) {
  log.debug('Authenticating')

  const loginRes = await fetch(
    'https://github.com/login/device/code',
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        scope: [],
      }),
    }
  )

  if (!loginRes.ok) {
    log.error(await loginRes.text())
    throw new Error('Unable obtain a device code')
  }

  const {
    user_code,
    verification_uri,
    interval,
    device_code,
  } = await loginRes.json()

  log('Type this code in the Web page that will open:', user_code)

  await open(verification_uri)

  const token = await getToken(interval * 1000, device_code)

  log.debug('Storing token')

  config.token = token

  return token
}

async function getToken(intervalMilliseconds, device_code) {
  await delay(intervalMilliseconds)

  log.info('Waiting for authentication')

  // 1 min
  const timeout = Date.now() + 60 * 1000

  while (Date.now() < timeout) {
    await delay(intervalMilliseconds)

    log.debug('Polling for access token')

    const tokenRes = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      }
    )

    if (!tokenRes.ok) {
      throw new Error('Unable to obtain an access token')
    }

    const token = await tokenRes.json()

    if (token.access_token) {
      log.info('Authentication successful!')
      return token
    }
  }

  throw new Error('Unable to obtain an access token')
}

module.exports = {
  tryUseStoredToken,
  login,
  getToken,
}
