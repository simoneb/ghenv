'use strict'

const log = require('../log')

const { listLocal } = require('./list')

async function explain({ repo, pattern, fileName }) {
  log`{bold Repository:} ${repo.html_url}`
  log`{bold File name:} ${fileName}`
  log`{bold Pattern:} ${pattern}`
  log`{bold Matched files:}`

  const files = await listLocal(pattern)

  log(files.map(f => `- ${f}`).join('\n'))
}

module.exports = explain
