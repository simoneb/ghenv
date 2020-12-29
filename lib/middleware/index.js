'use strict'

const log = require('../log')
const createConfig = require('../config')
const { setup } = require('./setup')

function setupLogging(yargs) {
  log.setLevel(yargs.verbose)
}

function setupConfig({ repository }) {
  return {
    config: createConfig(repository),
  }
}

module.exports = {
  setup,
  setupLogging,
  setupConfig,
}
