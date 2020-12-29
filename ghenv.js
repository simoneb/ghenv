#!/usr/bin/env node

'use strict'

const yargs = require('yargs/yargs')
const { terminalWidth } = require('yargs')
const { hideBin } = require('yargs/helpers')

const log = require('./lib/log')
const {
  setup,
  setupLogging,
  setupConfig,
} = require('./lib/middleware')
const { view, read, write, list, explain } = require('./lib/commands')
const { NAME, pkg } = require('./lib/const')
const { tryLoadConfig } = require('./lib/util')

yargs(hideBin(process.argv))
  .middleware([setupLogging, setupConfig, setup])
  .config(tryLoadConfig())
  .option('repository', {
    group: 'Global Options:',
    description:
      'The name of the repository where to store the processed files. It can be a simple name, in which case the authenticated user account is assumed to be the owner, or in the form {owner}/{name}',
    default: `.${NAME}`,
  })
  .option('pattern', {
    group: 'Global Options:',
    description: 'The pattern to use to match files to include',
    default: '**/.env',
  })
  .option('file-name', {
    group: 'Global Options:',
    description:
      'The name of the file to store in the repository. Defaults to the name of the package as specified in package.json',
    default: pkg.name,
  })
  .option('verbose', {
    alias: 'v',
    count: true,
    description:
      'Increases the level of verbosity of the output. Can be applied multiple times to increase verbosity, e.g. -vv',
  })
  .option('force-create-key', {
    group: 'Advanced Options:',
    alias: 'C',
    boolean: true,
    description: 'Forces the creation of a new encryption key',
  })
  .option('force-download-key', {
    group: 'Advanced Options:',
    alias: 'D',
    boolean: true,
    description: 'Forces the download of the encryption key',
  })
  .option('force-create-workflow', {
    group: 'Advanced Options:',
    alias: 'W',
    boolean: true,
    description: 'Forces the creation of the workflow',
  })
  .command(
    'write',
    'Writes the local files to the remote archive',
    yargs =>
      yargs.option('message', {
        group: 'Command Options:',
        alias: 'm',
        requiresArg: true,
        description:
          'Optional commit message. Placeholder %s is replaced with the name of the file',
      }),
    write
  )
  .command(
    'read',
    'Reads the remote archive and writes to the local file system, creating new files or overwriting existing ones',
    () => {},
    read
  )
  .command(
    ['list', 'ls'],
    'Lists the files that will be processed. Defaults to showing the local files',
    yargs =>
      yargs.option('remote', {
        group: 'Command Options:',
        alias: 'r',
        boolean: true,
        default: false,
        description:
          'When provided, lists remote files instead of the local ones',
      }),
    list
  )
  .command(
    'view',
    'View the contents of the files. Defaults to showing the local files',
    yargs =>
      yargs.option('remote', {
        group: 'Command Options:',
        alias: 'r',
        boolean: true,
        default: false,
        description:
          'When provided, shows the contents of the remote files instead of the local ones',
      }),
    view
  )
  .command(
    'explain',
    'Shows the configuration options that will be used by commands',
    () => {},
    explain
  )
  .command(
    'debug',
    false,
    yargs =>
      yargs.option('remote', {
        group: 'Command Options:',
        alias: 'r',
        boolean: true,
        default: false,
        description:
          'When provided, performs remote inizialization before outputting debug information',
      }),
    console.log
  )
  .demandCommand()
  .strict()
  .fail(function (msg, err, yargs) {
    if (msg) {
      log.warn(msg)
    }

    if (err) {
      log.error(log.isDebug ? err.stack : err)
    }

    if (msg) {
      log()
      yargs.showHelp()
    }

    process.exit(1)
  })
  .wrap(terminalWidth()).argv
