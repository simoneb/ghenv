'use strict'

const path = require('path')

const pkgDir = require('pkg-dir')

const NAME = 'ghenv'
const CLIENT_ID = 'Iv1.4e246f0573d8d315'
const HOST_ROOT = pkgDir.sync()
const GHENV_ROOT = pkgDir.sync(__dirname)
const hostPkg = require(path.join(HOST_ROOT, 'package.json'))
const ghenvPkg = require(path.join(GHENV_ROOT, 'package.json'))
const ENCRIPTION_ALGORITHM = 'aes-192-cbc'
const GITHUB_API = 'https://api.github.com'
const WORKFLOW_NAME = `${NAME}.yml`
const WORKFLOW_PATH = `.github/workflows/${WORKFLOW_NAME}`
const ENCRYPTION_KEY_SECRET_NAME = 'ENCRYPTION_KEY'
const WORKFLOW_LOCAL_PATH = path.join(
  GHENV_ROOT,
  `lib/assets/${WORKFLOW_NAME}`
)
const KEY_LENGTH = 24
const IV_LENGTH = 16
const APP_PAGE = `https://github.com/apps/${NAME}`
const IGNORE_PATTERNS = ['node_modules/**']

module.exports = {
  NAME,
  APP_PAGE,
  CLIENT_ID,
  ENCRIPTION_ALGORITHM,
  GITHUB_API,
  WORKFLOW_NAME,
  WORKFLOW_PATH,
  WORKFLOW_LOCAL_PATH,
  ENCRYPTION_KEY_SECRET_NAME,
  HOST_ROOT,
  KEY_LENGTH,
  IV_LENGTH,
  IGNORE_PATTERNS,
  hostPkg,
  ghenvPkg,
}
