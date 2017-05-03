/* eslint-disable no-console */
import chalk from 'chalk'
import fs from 'fs'
import { isUndefined } from 'lodash'
const exec = require('child_process').exec
const {
  TRAVIS_BRANCH,
  TRAVIS_PULL_REQUEST,
  FIREBASE_TOKEN
} = process.env

const skipPrefix = 'Skipping Firebase Deploy'
const branchWhitelist = [
  'master',
  'stage',
  'prod'
]

/**
 * Get settings from firebaserc file
 * @return {Object} Firebase settings object
 */
const getSettings = () => {
  try {
    return JSON.parse(fs.readFileSync(`./.firebaserc`, 'utf8'))
  } catch (err) {
    return {}
  }
}

const settings = getSettings()

/**
 * Copy version from main package file into functions package file
 */
const copyVersion = () => {
  console.log(chalk.blue('Copying version into functions package.json...'))
  const pkg = JSON.parse(fs.readFileSync(`./package.json`))
  const functionsPkg = JSON.parse(fs.readFileSync(`./functions/package.json`))
  functionsPkg.version = pkg.version
  fs.writeFileSync(`./functions/package.json`, JSON.stringify(functionsPkg, null, 2), 'utf8')
}

/**
 * @description Deploy to Firebase under specific conditions
 * NOTE: This must remain as callbacks for stdout to be realtime
 * @param {Object} opts - Options object
 * @param {String} opts.only - String corresponding to list of entities
 * to deploy (hosting, functions, database)
 * @param {Function} cb - Callback called when complete (err, stdout)
 * @private
 */
const deployToFirebase = (opts, cb) => {
  // TODO: Install functions npm depdendencies if folder exists
  if (fs.existsSync('functions')) {
    console.log(chalk.green('functions folder exists!'))
  } else {
    console.log(chalk.yellow('functions folder does not exist'))
  }

  if (settings && settings.copyVersion) {
    copyVersion()
  }

  if (isUndefined(TRAVIS_BRANCH) || (opts && opts.test)) {
    const nonCiMessage = `${skipPrefix} - Not a supported CI environment`
    console.log(chalk.blue(nonCiMessage))
    if (cb) {
      return cb(null, nonCiMessage)
    }
    return
  }

  if (!!TRAVIS_PULL_REQUEST && TRAVIS_PULL_REQUEST !== 'false') {
    const pullRequestMessage = `${skipPrefix} - Build is a Pull Request`
    console.log(chalk.blue(pullRequestMessage))
    if (cb) {
      return cb(null, pullRequestMessage)
    }
    return
  }

  if (branchWhitelist.indexOf(TRAVIS_BRANCH) === -1) {
    const nonBuildBranch = `${skipPrefix} - Build is a not a Build Branch - Branch: ${TRAVIS_BRANCH}`
    console.log(chalk.blue(nonBuildBranch))
    if (cb) {
      return cb(null, nonBuildBranch)
    }
    return
  }

  if (!FIREBASE_TOKEN) {
    console.log(chalk.blue('Error: FIREBASE_TOKEN env variable not found.\n' +
      'Run firebase login:ci (from  firebase-tools) to generate a token' +
      'and place it travis environment variables as FIREBASE_TOKEN'
    ))
    cb('Error: FIREBASE_TOKEN env variable not found', null)
    return
  }

  console.log(chalk.blue('Installing firebase-tools...'))

  const onlyString = opts && opts.only ? `--only ${opts.only}` : ''
  const project = TRAVIS_BRANCH
  exec(`npm i -g firebase-tools`, (error, stdout) => {
    if (error !== null) {
      console.log(chalk.red('Error deploying to firebase.'), error ? error.toString() : stdout)
      if (cb) {
        cb(error, null)
        return
      }
    }

    // TODO: Do not attempt to install functions depdendencies if folder does not exist
    console.log(stdout) // log output
    console.log(chalk.green('firebase-tools installed successfully'))
    console.log(chalk.blue('Deploying to Firebase...'))
    exec(`firebase deploy ${onlyString} --token ${FIREBASE_TOKEN} --project ${project}`, (error, stdout) => {
      if (error !== null) {
        console.log(chalk.red('Error deploying to firebase: '), error ? error.toString() : stdout)
        if (cb) {
          cb(error, null)
          return
        }
      }
      console.log(stdout) // log output
      console.log(chalk.green(`Successfully Deployed to ${project}`))
      if (cb) {
        cb(null, stdout)
      }
    })
  })
}
export default deployToFirebase
