const { ProtocolState, initEnv, getAddrs } = require('./helpers/utils');
const LensHub = artifacts.require("LensHub");

const main = async (cb) => {
  try {
    const [governance] = await initEnv(web3);
    const addrs = getAddrs();
    const lensHub = await LensHub.at(addrs['lensHub proxy']);
    console.log((await lensHub.getState({from: governance})).toString());
    await lensHub.setState(ProtocolState.Unpaused, {from: governance});
    console.log((await lensHub.getState({from: governance})).toString());
  } catch(err) {
    console.log(err);
  }
  cb();
}

module.exports = main;