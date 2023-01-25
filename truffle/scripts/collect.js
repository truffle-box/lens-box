const { getAddrs, initEnv, waitForTx } = require('./helpers/utils');
const LensHub = artifacts.require("LensHub");
const CollectNFT = artifacts.require("CollectNFT");

const main = async (cb) => {
  try {
    const [, , user] = await initEnv(web3);
    const addrs = getAddrs();
    const lensHub = await LensHub.at(addrs['lensHub proxy']);

    await lensHub.collect(1, 1, [], {from: user});

    const collectNFTAddr = await lensHub.getCollectNFT(1, 1, {from: user});
    const collectNFT = await CollectNFT.at(collectNFTAddr);

    const publicationContentURI = await lensHub.getContentURI(1, 1, {from: user});
    const totalSupply = await collectNFT.totalSupply({from: user});
    const ownerOf = await collectNFT.ownerOf(1, {from: user});
    const collectNFTURI = await collectNFT.tokenURI(1, {from: user});

    console.log(`Collect NFT total supply (should be 1): ${totalSupply}`);
    console.log(
      `Collect NFT owner of ID 1: ${ownerOf}, user address (should be the same): ${user}`
    );
    console.log(
      `Collect NFT URI: ${collectNFTURI}, publication content URI (should be the same): ${publicationContentURI}`
    );
  } catch(err) {
    console.log(err);
  }
  cb();
}

module.exports = main;