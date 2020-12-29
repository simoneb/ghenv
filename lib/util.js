'use strict'

const fs = require('fs')
const crypto = require('crypto')
const { RSA_PKCS1_PADDING } = require('constants')

const archiver = require('archiver')
const concat = require('concat-stream')
const findUp = require('find-up')

const {
  NAME,
  ROOT_DIR,
  ENCRIPTION_ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH,
} = require('./const')
const log = require('./log')

const delay = t => new Promise(r => setTimeout(r, t))

function encryptionKeyFromBuffer(buffer) {
  const key = buffer.subarray(0, KEY_LENGTH)
  const iv = buffer.subarray(
    KEY_LENGTH + 1,
    KEY_LENGTH + 1 + IV_LENGTH
  )
  return { key, iv }
}

function useKeyPair() {
  log.debug('Generating temporary key pair')

  const { publicKey, privateKey } = crypto.generateKeyPairSync(
    'rsa',
    {
      modulusLength: 2048,
      publicKeyEncoding: {
        format: 'pem',
        type: 'spki',
      },
      privateKeyEncoding: {
        format: 'pem',
        type: 'pkcs1',
      },
    }
  )

  const decrypt = content =>
    crypto.privateDecrypt(
      { key: privateKey, padding: RSA_PKCS1_PADDING },
      content
    )

  return { publicKey, decrypt }
}

function generateEncryptionKey() {
  log.debug('Generating encryption key')

  const key = crypto.randomBytes(KEY_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)

  return { key, iv }
}

function encryptionKeyToBuffer({ key, iv }) {
  return Buffer.from(Buffer.concat([key, iv]).toString('hex'))
}

function createArchive(pattern) {
  log.info('Creating archive')

  const zip = archiver('zip')

  return new Promise((resolve, reject) => {
    zip.on('warning', reject)
    zip.on('error', reject)

    zip.on('entry', entry => {
      log.verbose(`Adding ${entry.name} to archive`)
    })

    zip.pipe(concat(resolve))

    zip.glob(pattern, { root: ROOT_DIR }).finalize()
  })
}

function decryptArchive(buffer, encryptionKey) {
  log.verbose('Decrypting archive')

  const { key, iv } = encryptionKeyFromBuffer(encryptionKey)

  const decipher = crypto.createDecipheriv(
    ENCRIPTION_ALGORITHM,
    key,
    iv
  )

  try {
    return Buffer.concat([
      decipher.update(buffer.toString(), 'hex'),
      decipher.final(),
    ])
  } catch (err) {
    log.error('Decryption failed')
    throw err
  }
}

function encryptArchive(buffer, encryptionKey) {
  log.info('Encrypting archive')

  const { key, iv } = encryptionKeyFromBuffer(encryptionKey)

  const cipher = crypto.createCipheriv(ENCRIPTION_ALGORITHM, key, iv)

  return Buffer.from(
    Buffer.concat([cipher.update(buffer), cipher.final()]).toString(
      'hex'
    )
  )
}

function tryLoadConfig() {
  const configPath = findUp.sync([`.${NAME}rc`, `.${NAME}rc.json`])
  return configPath ? JSON.parse(fs.readFileSync(configPath)) : {}
}

module.exports = {
  delay,
  useKeyPair,
  generateEncryptionKey,
  encryptionKeyToBuffer,
  encryptionKeyFromBuffer,
  createArchive,
  decryptArchive,
  encryptArchive,
  tryLoadConfig,
}
