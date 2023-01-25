const { waitForTx, initEnv, getAddrs, ZERO_ADDRESS } = require('./helpers/utils');
const LensHub = artifacts.require('LensHub');

const main = async (cb) => {
  try {
    const [governance, , user] = await initEnv(web3);
    const addrs = getAddrs();
    const lensHub = await LensHub.at(addrs['lensHub proxy']);
    await lensHub.whitelistProfileCreator(user, true, {from: governance, gas: "0xffffff"});

    const inputStruct = {
      'to': user,
      'handle': 'zer0dot',
      'imageURI': 'https://ipfs.io/ipfs/QmY9dUwYu67puaWBMxRKW98LPbXCznPwHUbhX5NeWnCJbX',
      'followModule': ZERO_ADDRESS,
      'followModuleInitData': [],
      'followNFTURI': 'https://ipfs.io/ipfs/QmTFLSXdEQ6qsSzaXaCSNtiv6wA56qq87ytXJ182dXDQJS',
    };

    await lensHub.createProfile(inputStruct, {from: user});

    console.log(`Total supply (should be 1): ${await lensHub.totalSupply({from: governance})}`);
    console.log(
      `Profile owner: ${await lensHub.ownerOf(1, {from: governance})}, user address (should be the same): ${user}`
    );
    console.log(`Profile ID by handle: ${await lensHub.getProfileIdByHandle('zer0dot', {from: governance})}`);
  } catch(err) {
    console.log(err);
  }
  cb();
}

module.exports = main;