const { defaultAbiCoder } = require('ethers/lib/utils');
const { getAddrs, initEnv, waitForTx, ZERO_ADDRESS } = require('./helpers/utils');
const LensHub = artifacts.require("LensHub");

const main = async (cb) => {
  try {
    const [governance, , user] = await initEnv(web3);
    const addrs = getAddrs();
    const freeCollectModuleAddr = addrs['free collect module'];
    const lensHub = await LensHub.at(addrs['lensHub proxy']);

    await lensHub.whitelistCollectModule(freeCollectModuleAddr, true, {from: governance});

    const inputStruct = {
      'profileId': 1,
      'contentURI': 'https://ipfs.io/ipfs/Qmby8QocUU2sPZL46rZeMctAuF5nrCc7eR1PPkooCztWPz',
      'collectModule': freeCollectModuleAddr,
      'collectModuleInitData': defaultAbiCoder.encode(['bool'], [true]),
      'referenceModule': ZERO_ADDRESS,
      'referenceModuleInitData': [],
    };

    await lensHub.post(inputStruct, {from: user});
    console.log(await lensHub.getPub(1, 1, {from: governance}));
  } catch(err) {
    console.log(err);
  }
  cb();
}

module.exports = main;