'use strict'

const {
  tryUseStoredToken,
  login,
} = require('../../api/authentication')
const { getUser, tryGetRepo } = require('../../api/common')
const { APP_PAGE } = require('../../const')

const { setupRepo } = require('./setupRepo')

async function setup(yargs) {
  // skip setup for commands which accept a remote option when it's off
  if ('remote' in yargs && !yargs.remote) {
    return
  }

  const storedToken = await tryUseStoredToken(yargs.config)
  const token = storedToken || (await login(yargs.config))

  const user = await getUser(token.access_token)

  const parts = yargs.repository.split('/')
  const [owner, name] = parts[1] ? parts : [user.login, parts[0]]
  const repositoryPath = `${owner}/${name}`

  const repo = await tryGetRepo(repositoryPath, token.access_token)

  if (!repo) {
    throw new Error(
      `Repository ${repositoryPath} does not exist or is not accessible.

- create a private repository named ${name} in account ${owner}: https://github.com/new
- authorize the application to access the repository: ${APP_PAGE}`
    )
  }

  if (!repo.private) {
    throw new Error(`Repository ${repo.html_url} must be private`)
  }

  await setupRepo(repo, token, yargs)

  return { repo, token, user }
}

module.exports = { setup }
