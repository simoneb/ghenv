'use strict'

const { createSecret, tryGetSecret } = require('../../api/secret')
const {
  ensureWorkflow,
  dispatchWorkflow,
  waitForWorkflowToComplete,
  getWorkflowRunArtifact,
  getArtifactContent,
} = require('../../api/workflow')
const { ENCRYPTION_KEY_SECRET_NAME } = require('../../const')
const log = require('../../log')
const {
  encryptionKeyToBuffer,
  generateEncryptionKey,
  useKeyPair,
} = require('../../util')

async function setupRepo(repo, token, yargs) {
  await ensureWorkflow(repo, token, yargs)
  await ensureLocalEncryptionKey(repo, token, yargs)
}

module.exports = {
  setupRepo,
}

async function ensureLocalEncryptionKey(
  repo,
  token,
  { forceCreateKey, forceDownloadKey, config }
) {
  if (forceCreateKey) {
    log.info('Forcing creation and upload of encryption key')
    return createAndStoreEncryptionKey(repo, token, config)
  }

  if (forceDownloadKey) {
    log.info('Forcing download of encryption key')
    return downloadAndStoreEncryptionKey(repo, token, config)
  }

  const encryptionKeySecret = await tryGetEncryptionKeySecret(
    repo,
    token
  )

  if (!encryptionKeySecret) {
    log.info('GitHub secret does not exist')

    const encryptionKey = config.encryptionKey

    if (encryptionKey) {
      log.info('Local encryption key exists, uploading')

      return uploadEncryptionKey(repo, token, encryptionKey)
    }

    log.info(
      'Local encryption key does not exist, creating and uploading a new one'
    )

    return createAndStoreEncryptionKey(repo, token, config)
  }

  log.debug('GitHub secret exists')

  if (config.encryptionKey) {
    return log.debug('Local encryption key exists')
  }

  log.info('Local encryption key does not exist, downloading')

  return downloadAndStoreEncryptionKey(repo, token, config)
}

async function downloadAndStoreEncryptionKey(repo, token, config) {
  const encryptionKey = await downloadEncryptionKey(repo, token)

  config.encryptionKey = encryptionKey
}

async function createAndStoreEncryptionKey(repo, token, config) {
  const encryptionKey = await createEncryptionKeyAndSecret(
    repo,
    token
  )

  config.encryptionKey = encryptionKey
}

async function downloadEncryptionKey(repo, token) {
  const { publicKey, decrypt } = useKeyPair()

  await dispatchWorkflow(repo, token, publicKey)

  const workflowRun = await waitForWorkflowToComplete(repo, token)
  const artifact = await getWorkflowRunArtifact(workflowRun, token)
  const artifactContent = await getArtifactContent(artifact, token)

  return decrypt(artifactContent)
}

async function createEncryptionKeyAndSecret(repo, token) {
  const encryptionKeyBuffer = encryptionKeyToBuffer(
    generateEncryptionKey()
  )

  await uploadEncryptionKey(repo, token, encryptionKeyBuffer)

  return encryptionKeyBuffer
}

function uploadEncryptionKey(repo, token, encryptionKeyBuffer) {
  return createSecret(
    repo,
    token,
    ENCRYPTION_KEY_SECRET_NAME,
    encryptionKeyBuffer
  )
}

async function tryGetEncryptionKeySecret(repo, token) {
  return await tryGetSecret(repo, token, ENCRYPTION_KEY_SECRET_NAME)
}
