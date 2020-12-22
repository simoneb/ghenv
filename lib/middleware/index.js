'use strict'

const log = require('../log')
const { setup } = require('./setup')

function setupLogging(argv) {
  log.setLevel(argv.verbose)
}

module.exports = {
  setup,
  setupLogging,
}
