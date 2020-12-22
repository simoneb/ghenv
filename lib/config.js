'use strict'

const Conf = require('conf')

const config = new Conf({
  // data is stored on the local file system
  // assuming this is secure enough for all practical purposes
  encryptionKey: 'encryption key does not need to be secret',
})

const ENCRYPTION_KEY = 'ENCRYPTION_KEY'
const TOKEN = 'TOKEN'

module.exports = {
  get encryptionKey() {
    return config.has(ENCRYPTION_KEY)
      ? Buffer.from(config.get(ENCRYPTION_KEY), 'hex')
      : null
  },
  set encryptionKey(buffer) {
    config.set(ENCRYPTION_KEY, buffer.toString('hex'))
  },
  get token() {
    return config.get(TOKEN)
  },
  set token(value) {
    config.set(TOKEN, value)
  },
}
