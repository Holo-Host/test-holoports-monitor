const exec = require('child_process').exec

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

/**
 * Execute ssh command in an async way on multiple holoports
 * @param  {Array} holoports List of holoports in a format { IP, name }
 * @param  {String} command Name of the function to execute
 * @return {Promise} Promise that resolves to an outcome of a command execution on each holoport
 */
module.exports.execSshCommand = async (holoports, command) => {
  // Check if ssh key path was passed to script
  if (!argv.sshKeyPath)
    throw new Error(`script requires --ssh-key-path option.`)

  // Set one timestamp for all the calls
  const timestamp = Date.now()

  // Convert array of holoports into array of promises each resolving to ping-result-object
  if(command === 'getStatus')
    return await Promise.allSettled(holoports.map((hp) => getStatus(hp)))
  else if(command === 'switchChannel')
    return await Promise.allSettled(holoports.map((hp) => switchChannel(hp)))
  else if(command === 'rebootHoloports')
    return await Promise.allSettled(holoports.map((hp) => rebootHoloports(hp)))
  else
    throw new Error(`Unknown command: ${command}`)
}

/**
 * Gets status of holoports by executing an ssh command remotely.
 * In case of a failure to execute returns the reason of a failure reported by bash.
 * @param {*} hp holoport data in a format { IP, name }
 * @return {Promise} resolves to an object describing status of the holoport
 */
const getStatus = async (hp) => {
  return new Promise(function(resolve, reject) {
    exec(`./scripts/get-status.sh ${hp.IP} ${argv.sshKeyPath}`, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.log(`Error for ${hp.IP}`)
        reject(
          {
            name: hp.name,
            IP: hp.IP,
            timestamp: timestamp,
            sshSuccess: false,
            holoNetwork: null,
            channel: null,
            hostingInfo: null,
            holoportModel: null,
            error: stderr
          }
        )
      } else {
        // parse stdout to get details
        const outcome = stdout.split(" ");
        console.log(`Success for ${hp.IP}`)
        resolve({
          name: hp.name,
            IP: hp.IP,
            timestamp: timestamp,
            sshSuccess: true,
            holoNetwork: outcome[0],
            channel: outcome[1],
            hostingInfo: outcome[2],
            holoportModel: outcome[3],
            error: null
        })
      }
    })
  })
}

const switchChannel = async (holoport) => {
  // Check if target-channel was passed to script
  if (!argv.targetChannel)
    throw new Error(`switchChannel requires --target-channel option.`)

  const command = `ssh root@${holoport.IP} -i ${argv.sshKeyPath} hpos-update ${argv.targetChannel}`

  return new Promise(function(resolve, reject) {
    exec(command, { timeout: 4000 }, (error, stdout, stderr) => {
      resolve({
        name: holoport.name,
        IP: holoport.IP,
        timestamp: Date.now(),
        success: stdout.trim() === `Switching HoloPort to channel: ${argv.targetChannel}`,
      })
    })
  })
}

// this will always error?
const rebootHoloports = async (holoport) => {
  const command = `ssh root@${holoport.IP} -i ${argv.sshKeyPath} "rm -rf /var/lib/holochain-rsm && rm -rf /var/lib/configure-holochain && reboot"`

  return new Promise(function(resolve, reject) {
    exec(command, { timeout: 4000 }, (error, stdout, stderr) => {
      resolve({
        name: holoport.name,
        IP: holoport.IP,
        timestamp: Date.now(),
        success: stderr.trim() === `Connection to ${holoport.IP} closed by remote host.`,
      })
    })
  })
}

