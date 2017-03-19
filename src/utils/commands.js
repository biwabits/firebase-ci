/* eslint-disable no-console */
import { log, info, success, error } from './logger'
const exec = require('child_process').exec

export const isPromise = (obj) => obj && typeof obj.then === 'function'

/**
 * @description Run a bash command using exec.
 * @param {Object} opts - Options object
 * @param {Object} opts.command - Command to be executed
 * @param {Object} opts.before - Before callback
 * @param {Object} opts.error - Error callback
 * @param {Object} opts.success - Success Callback
 * @private
 */
export const runCommand = ({ command, beforeMsg, errorMsg, successMsg }) => {
  if (beforeMsg) {
    info(beforeMsg)
  }
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, e) => {
      if (err !== null) {
        if (errorMsg) {
          error(errorMsg, err)
        }
        return reject(err)
      } else {
        log(stdout) // log output
        if (successMsg) {
          success(successMsg, stdout)
        }
        resolve(stdout)
      }
    })
  })
}

/**
 * @description Create a promise that runs commands in waterfall
 * @param {Array} commands - List of commands to run in order
 * @private
 */
export const createCommandsPromise = (commands) => {
  return runCommand(commands[0])
    .then(() => {
      if (commands[1]) {
        return runCommand(commands[1])
      }
      return commands
    })
  // TODO: Implement this method for running more than two commands
  // return reduce(commands, (l, r) => {
  //   if (!isPromise(l)) {
  //     return runCommand(r)
  //   }
  //   if (isPromise(runCommand(r))) {
  //     return l.then(runCommand(r))
  //   }
  //   return l
  // }, {})
}
