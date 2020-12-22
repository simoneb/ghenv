'use strict'

const chalk = require('chalk')

const noop = () => {}

const log = (...args) => console.log(chalk(...args))
log.error = (...args) => console.error(chalk.red(...args))
log.warn = (...args) => console.log(chalk.yellow(...args))
log.info = (...args) => console.log(chalk.white('|', ...args))
log.verbose = noop
log.debug = noop

module.exports = log

log.setLevel = level => {
  if (level > 0) {
    log.isVerbose = true
    log.verbose = (...args) =>
      console.log(chalk.blueBright('|', ...args))
  }

  if (level > 1) {
    log.isDebug = true
    log.debug = (...args) => console.log(chalk.grey('|', ...args))
  }
}
