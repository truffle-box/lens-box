const { getAddrs, initEnv } = require('./helpers/utils');
const LensHub = artifacts.require("LensHub");
const FollowNFT = artifacts.require("FollowNFT");

const main = async (cb) => {
  try {
    const [, , user] = await initEnv(web3);
    const addrs = getAddrs();
    const lensHub = await LensHub.at(addrs['lensHub proxy']);

    await lensHub.follow([1], [[]], {from: user});

    const followNFTAddr = await lensHub.getFollowNFT(1, {from: user});
    const followNFT = await FollowNFT.at(followNFTAddr);

    const totalSupply = await followNFT.totalSupply({from: user});
    const ownerOf = await followNFT.ownerOf(1, {from: user});

    console.log(`Follow NFT total supply (should be 1): ${totalSupply}`);
    console.log(
      `Follow NFT owner of ID 1: ${ownerOf}, user address (should be the same): ${user}`
    );
  } catch(err) {
    console.log(err);
  }
  cb();
}

module.exports = main;