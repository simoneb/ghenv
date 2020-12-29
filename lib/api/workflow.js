'use strict'

const fs = require('fs')

const fetch = require('node-fetch')
const semver = require('semver')
const unzipper = require('unzipper')

const {
  WORKFLOW_PATH,
  pkg,
  WORKFLOW_LOCAL_PATH,
  WORKFLOW_NAME,
} = require('../const')
const log = require('../log')
const { delay } = require('../util')

const { tryGetFile, createOrUpdateFile } = require('./common')

async function ensureWorkflow(repo, token, { forceCreateWorkflow }) {
  log.debug('Trying to get remote workflow')

  let repoWorkflow = await tryGetFile(repo, WORKFLOW_PATH, token)

  const workflowContentString = fs
    .readFileSync(WORKFLOW_LOCAL_PATH, 'utf8')
    .replace('${version}', pkg.version)

  const workflowContentBuffer = Buffer.from(
    workflowContentString,
    'utf8'
  )

  if (!repoWorkflow) {
    log.debug('Remote workflow does not exist, creating')

    repoWorkflow = await createOrUpdateFile(
      repo,
      WORKFLOW_PATH,
      token,
      workflowContentBuffer
    )

    return log.debug(`Created workflow ${WORKFLOW_PATH}`)
  }

  const existingWorkflowContent = Buffer.from(
    repoWorkflow.content,
    repoWorkflow.encoding
  ).toString('utf8')

  const [, existingVersion] = /VERSION: (.+)/.exec(
    existingWorkflowContent
  )

  log.debug(
    `Remote workflow version is ${existingVersion}, local is ${pkg.version}`
  )

  const outdated = semver.gt(pkg.version, existingVersion)

  if (!outdated) {
    log.debug('Remote workflow is up to date')
  }

  if (forceCreateWorkflow || outdated) {
    if (outdated) {
      log.verbose('Remote workflow is outdated, replacing')
    } else {
      log.info('Forcing creation of remote workflow')
    }

    repoWorkflow = await createOrUpdateFile(
      repo,
      WORKFLOW_PATH,
      token,
      workflowContentBuffer,
      repoWorkflow.sha
    )

    log.debug('Replaced remote workflow')
  }
}

async function getArtifactContent(artifact, token) {
  log.debug('Downloading artifact')

  const artifactRes = await fetch(artifact.archive_download_url, {
    headers: {
      authorization: `bearer ${token.access_token}`,
    },
  })

  if (!artifactRes.ok) {
    throw new Error('Could not download artifact')
  }

  const file = await new Promise(r =>
    artifactRes.body.pipe(unzipper.ParseOne()).on('entry', r)
  )

  return file.buffer()
}

async function getWorkflowRunArtifact(workflowRun, token) {
  log.debug('Getting workflow run artifacts')

  const artifactsRes = await fetch(workflowRun.artifacts_url, {
    headers: {
      accept: 'application/vnd.github.v3+json',
      authorization: `bearer ${token.access_token}`,
    },
  })

  if (!artifactsRes.ok) {
    throw new Error('Could not get workflow run artifacts')
  }

  const {
    artifacts: [artifact],
  } = await artifactsRes.json()

  if (!artifact) {
    throw new Error('Could not find artifact')
  }

  return artifact
}

async function waitForWorkflowToComplete(repo, token) {
  log.info('Waiting for workflow run to complete')

  // 1 min
  const timeout = Date.now() + 60 * 1000

  const params = new URLSearchParams({
    // looks like including branch and or event does not respect page size
    // we're only interested in the last one here
    per_page: 1,
    page: 1,
  })

  while (Date.now() < timeout) {
    await delay(4000)

    const workflowRunsRes = await fetch(
      `${repo.url}/actions/workflows/${WORKFLOW_NAME}/runs?${params}`,
      {
        headers: {
          accept: 'application/vnd.github.v3+json',
          authorization: `bearer ${token.access_token}`,
        },
      }
    )

    if (!workflowRunsRes.ok) {
      throw new Error('Could not get workflow run')
    }

    const {
      workflow_runs: [lastWorkflowRun],
    } = await workflowRunsRes.json()

    log.debug('Polling workflow run:', lastWorkflowRun.status)

    if (lastWorkflowRun.status === 'completed') {
      log.debug('Workflow run completed')
      return lastWorkflowRun
    }
  }
}

async function dispatchWorkflow(repo, token, publicKeyPem) {
  const dispatchRes = await fetch(
    `${repo.url}/actions/workflows/${WORKFLOW_NAME}/dispatches`,
    {
      method: 'POST',
      headers: {
        authorization: `bearer ${token.access_token}`,
      },
      body: JSON.stringify({
        ref: repo.default_branch,
        inputs: {
          PUBLIC_KEY_BASE64: Buffer.from(publicKeyPem).toString(
            'base64'
          ),
        },
      }),
    }
  )

  if (!dispatchRes.ok) {
    throw new Error('Could not dispatch workflow')
  }
}

module.exports = {
  ensureWorkflow,
  dispatchWorkflow,
  waitForWorkflowToComplete,
  getWorkflowRunArtifact,
  getArtifactContent,
}
