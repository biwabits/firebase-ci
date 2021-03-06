import { functionsExists, functionsNodeModulesExist } from './files'
import { runCommand } from './commands'
import { to } from './async'
import commandExists from 'command-exists'
import { info as logInfo, error } from './logger'

export function getNpxExists() {
  return commandExists.sync('npx')
}

/**
 * Install Firebase tools and run npm install in functions folder
 * @return {Promise} Resolves when dependencies have been installed
 */
export async function installDeps(opts = {}, settings = {}) {
  const { info } = opts
  const { toolsVersion } = settings
  const versionSuffix = toolsVersion ? `@${toolsVersion}` : ''
  const npxExists = getNpxExists()
  // Check version of firebase tools using npx (to allow for locally and
  // globally installed versions of firebase-tools) falling back to npm bin
  const [versionErr, fbVersion] = await to(
    runCommand({
      command: npxExists ? 'npx' : '$(npm bin)/firebase',
      args: npxExists ? ['firebase', '--version'] : ['--version'],
      pipeOutput: false,
      beforeMsg: 'Checking to see if firebase-tools is installed...',
      errorMsg: 'Error checking for firebase-tools.'
    })
  )
  if (versionErr) {
    const getVersionErrMsg =
      'Error attempting to check for firebase-tools version.'
    error(getVersionErrMsg)
    throw new Error(getVersionErrMsg)
  }
  const promises = []
  // Skip installing firebase-tools if specified by config
  if (settings.skipToolsInstall) {
    // Throw for missing version when skipping install
    if (!fbVersion) {
      const missingFbTools =
        'firebase-tools install skipped, and no existing version found!'
      error(missingFbTools)
      throw new Error(missingFbTools)
    }
    logInfo(`Installing of firebase-tools skipped based on config settings.`)
  } else {
    // Log version of firebase-tools if it exists, otherwise install
    if (fbVersion) {
      logInfo(`firebase-tools already exists, version: ${fbVersion}`)
    } else {
      // Install firebase-tools using npm
      promises.push(
        runCommand({
          command: 'npm',
          args: ['i', `firebase-tools${versionSuffix}`, `${info ? '' : '-q'}`],
          beforeMsg: 'firebase-tools does not already exist, installing...',
          errorMsg: 'Error installing firebase-tools.',
          successMsg: 'Firebase tools installed successfully!'
        })
      )
    }
  }
  // Call npm install in functions folder if it exists and does
  // not already contain node_modules
  if (
    functionsExists() &&
    !functionsNodeModulesExist() &&
    !settings.skipFunctionsInstall
  ) {
    promises.push(
      runCommand({
        command: 'npm',
        args: ['i', '--prefix', 'functions'],
        beforeMsg: 'Running npm install in functions folder...',
        errorMsg: 'Error installing functions dependencies.',
        successMsg: 'Functions dependencies installed successfully!'
      })
    )
  }
  // Run installs in parallel for quickest completion
  return Promise.all(promises)
}
