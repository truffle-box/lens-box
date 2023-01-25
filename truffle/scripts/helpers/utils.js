const fs = require('fs');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const ProtocolState = {
  'Unpaused': 0,
  'PublishingPaused': 1,
  'Paused': 2,
}

function getAddrs() {
  const json = fs.readFileSync('./addresses.json', 'utf8');
  const addrs = JSON.parse(json);
  return addrs;
}

async function initEnv(web3) {
  const accounts = await web3.eth.getAccounts();
  const governance = accounts[1];
  const treasury = accounts[2];
  const user = accounts[3];

  return [governance, treasury, user];
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {ZERO_ADDRESS, ProtocolState, getAddrs, initEnv, delay};
