'use strict'

const Conf = require('conf')
const log = require('./log')

const ENCRYPTION_KEY = 'ENCRYPTION_KEY'
const TOKEN = 'TOKEN'

function createConfig(repository) {
  log.verbose(`Initializing config for repository ${repository}`)

  const userConfig = new Conf({
    configName: 'user',
    // data is stored on the local file system
    // assuming this is secure enough for all practical purposes
    encryptionKey: `user encryption key`,
  })

  const repositoryConfig = new Conf({
    configName: repository,
    encryptionKey: `repository ${repository} encryption key`,
  })

  return {
    get encryptionKey() {
      return repositoryConfig.has(ENCRYPTION_KEY)
        ? Buffer.from(repositoryConfig.get(ENCRYPTION_KEY), 'hex')
        : null
    },
    set encryptionKey(buffer) {
      repositoryConfig.set(ENCRYPTION_KEY, buffer.toString('hex'))
    },
    get token() {
      return userConfig.get(TOKEN)
    },
    set token(value) {
      userConfig.set(TOKEN, value)
    },
  }
}

module.exports = createConfig
