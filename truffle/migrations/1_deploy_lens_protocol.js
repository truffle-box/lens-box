const { hexlify, keccak256, RLP } = require("ethers/lib/utils");
const fs = require("fs");

const TREASURY_FEE_BPS = 50;
const LENS_HUB_NFT_NAME = 'Lens Protocol Profiles';
const LENS_HUB_NFT_SYMBOL = 'LPP';

const ModuleGlobals = artifacts.require("ModuleGlobals");
const PublishingLogic = artifacts.require("PublishingLogic");
const InteractionLogic = artifacts.require("InteractionLogic");
const ProfileTokenURILogic = artifacts.require("ProfileTokenURILogic");
const LensHub = artifacts.require("LensHub");
const FollowNFT = artifacts.require("FollowNFT");
const CollectNFT = artifacts.require("CollectNFT");
const TransparentUpgradeableProxy = artifacts.require("TransparentUpgradeableProxy");
const LensPeriphery = artifacts.require("LensPeriphery");
const Currency = artifacts.require("Currency");
const FeeCollectModule = artifacts.require("FeeCollectModule");
const LimitedFeeCollectModule = artifacts.require("LimitedFeeCollectModule");
const TimedFeeCollectModule = artifacts.require("TimedFeeCollectModule");
const LimitedTimedFeeCollectModule = artifacts.require("LimitedTimedFeeCollectModule");
const RevertCollectModule = artifacts.require("RevertCollectModule");
const FreeCollectModule = artifacts.require("FreeCollectModule");
const FeeFollowModule = artifacts.require("FeeFollowModule");
const ProfileFollowModule = artifacts.require("ProfileFollowModule");
const RevertFollowModule = artifacts.require("RevertFollowModule");
// --- COMMENTED OUT AS THIS IS NOT A LAUNCH MODULE ---
// const approvalFollowModule = artifacts.require("ApprovalFollowModule");
const FollowerOnlyReferenceModule = artifacts.require("FollowerOnlyReferenceModule");
const UIDataProvider = artifacts.require("UIDataProvider");
const ProfileCreationProxy = artifacts.require("ProfileCreationProxy");

module.exports = async function (deployer, networks, accounts) {
  // Note that the use of these signers is a placeholder and is not meant to be used in
  // production.
  const deployerAddress = accounts[0];
  const governanceAddress = accounts[1];
  const treasuryAddress = accounts[2];
  const proxyAdminAddress = deployerAddress;
  const profileCreatorAddress = deployerAddress;

  // Nonce management in case of deployment issues
  let deployerNonce = await web3.eth.getTransactionCount(deployerAddress);
  console.log(deployerNonce);

  console.log('\n\t-- Deploying Module Globals --');
  await deployer.deploy(ModuleGlobals, governanceAddress, treasuryAddress, TREASURY_FEE_BPS, { nonce: deployerNonce++ });
  let moduleGlobals = await ModuleGlobals.deployed();

  console.log('\n\t-- Deploying Logic Libs --');
  await deployer.deploy(PublishingLogic, { nonce: deployerNonce++ });
  await deployer.deploy(InteractionLogic, { nonce: deployerNonce++ });
  await deployer.deploy(ProfileTokenURILogic, { nonce: deployerNonce++ });

  let publishingLogic = await PublishingLogic.deployed();
  let interactionLogic = await InteractionLogic.deployed();
  let profileTokenURILogic = await ProfileTokenURILogic.deployed();
  const hubLibs = {
    'PublishingLogic': publishingLogic.address,
    'InteractionLogic': interactionLogic.address,
    'ProfileTokenURILogic': profileTokenURILogic.address,
  };

  // Here, we pre-compute the nonces and addresses used to deploy the contracts.
  // const nonce = await deployer.getTransactionCount();
  const followNFTNonce = hexlify(deployerNonce + 1);
  const collectNFTNonce = hexlify(deployerNonce + 2);
  const hubProxyNonce = hexlify(deployerNonce + 3);

  const followNFTImplAddress =
    '0x' + keccak256(RLP.encode([deployerAddress, followNFTNonce])).substr(26);
  const collectNFTImplAddress =
    '0x' + keccak256(RLP.encode([deployerAddress, collectNFTNonce])).substr(26);
  const hubProxyAddress =
    '0x' + keccak256(RLP.encode([deployerAddress, hubProxyNonce])).substr(26);
  
  // Next, we deploy first the hub implementation, then the followNFT implementation, the collectNFT, and finally the
  // hub proxy with initialization.
  console.log('\n\t-- Deploying Hub Implementation --');
  await LensHub.link(hubLibs);
  await deployer.deploy(LensHub, followNFTImplAddress, collectNFTImplAddress, { nonce: deployerNonce++, gas: 25000000 });
  let lensHubImpl = await LensHub.deployed();

  console.log('\n\t-- Deploying Follow & Collect NFT Implementations --');
  await deployer.deploy(FollowNFT, hubProxyAddress, { nonce: deployerNonce++ });
  await deployer.deploy(CollectNFT, hubProxyAddress, { nonce: deployerNonce++ });

  let data = await web3.eth.abi.encodeFunctionCall({
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "newGovernance",
        "type": "address"
      }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }, [LENS_HUB_NFT_NAME, LENS_HUB_NFT_SYMBOL, governanceAddress]);

  console.log('\n\t-- Deploying Hub Proxy --');
  await deployer.deploy(TransparentUpgradeableProxy, lensHubImpl.address, proxyAdminAddress, data, { nonce: deployerNonce++ });
  let proxy = await TransparentUpgradeableProxy.deployed();

  let lensHub = await LensHub.at(proxy.address);

  console.log('\n\t-- Deploying Lens Periphery --');
  await deployer.deploy(LensPeriphery, lensHub.address, { nonce: deployerNonce++ });
  const lensPeriphery = await LensPeriphery.deployed();

  // Currency
  console.log('\n\t-- Deploying Currency --');
  await deployer.deploy(Currency, { nonce: deployerNonce++ });
  const currency = await Currency.deployed();

  // Deploy collect modules
  console.log('\n\t-- Deploying feeCollectModule --');
  await deployer.deploy(FeeCollectModule, lensHub.address, moduleGlobals.address, {
    nonce: deployerNonce++,
  });
  const feeCollectModule = await FeeCollectModule.deployed();

  console.log('\n\t-- Deploying limitedFeeCollectModule --');
  await deployer.deploy(LimitedFeeCollectModule, lensHub.address, moduleGlobals.address, {
    nonce: deployerNonce++,
  });
  const limitedFeeCollectModule = await LimitedFeeCollectModule.deployed();

  console.log('\n\t-- Deploying timedFeeCollectModule --');
  await deployer.deploy(TimedFeeCollectModule, lensHub.address, moduleGlobals.address, {
    nonce: deployerNonce++,
  })
  const timedFeeCollectModule = await TimedFeeCollectModule.deployed();

  console.log('\n\t-- Deploying limitedTimedFeeCollectModule --');
  await deployer.deploy(LimitedTimedFeeCollectModule,
    lensHub.address,
    moduleGlobals.address,
    { nonce: deployerNonce++ }
  );
  const limitedTimedFeeCollectModule = await LimitedFeeCollectModule.deployed();

  console.log('\n\t-- Deploying revertCollectModule --');
  await deployer.deploy(RevertCollectModule, { nonce: deployerNonce++ });
  const revertCollectModule = await RevertCollectModule.deployed();

  console.log('\n\t-- Deploying freeCollectModule --');
  await deployer.deploy(FreeCollectModule, lensHub.address, { nonce: deployerNonce++ });
  const freeCollectModule = await FreeCollectModule.deployed();

  // Deploy follow modules
  console.log('\n\t-- Deploying feeFollowModule --');
  await deployer.deploy(FeeFollowModule, lensHub.address, moduleGlobals.address, {
    nonce: deployerNonce++,
  });
  const feeFollowModule = await FeeFollowModule.deployed();

  console.log('\n\t-- Deploying profileFollowModule --');
  await deployer.deploy(ProfileFollowModule, lensHub.address, {
    nonce: deployerNonce++,
  });
  const profileFollowModule = await ProfileFollowModule.deployed();

  console.log('\n\t-- Deploying revertFollowModule --');
  await deployer.deploy(RevertFollowModule, lensHub.address, {
    nonce: deployerNonce++,
  })
  const revertFollowModule = await RevertFollowModule.deployed();

  // --- COMMENTED OUT AS THIS IS NOT A LAUNCH MODULE ---
  // console.log('\n\t-- Deploying approvalFollowModule --');
  // await deployer.deploy(ApprovalFollowModule, lensHub.address, { nonce: deployerNonce++ })
  // const approvalFollowModule = await ApprovalFollowModule.deployed();

  // Deploy reference module
  console.log('\n\t-- Deploying followerOnlyReferenceModule --');
  await deployer.deploy(FollowerOnlyReferenceModule, lensHub.address, {
    nonce: deployerNonce++,
  })
  const followerOnlyReferenceModule = await FollowerOnlyReferenceModule.deployed();

  // Deploy UIDataProvider
  console.log('\n\t-- Deploying UI Data Provider --');
  await deployer.deploy(UIDataProvider, lensHub.address, {
    nonce: deployerNonce++,
  })
  const uiDataProvider = await UIDataProvider.deployed();

  console.log('\n\t-- Deploying Profile Creation Proxy --');
  await deployer.deploy(ProfileCreationProxy, profileCreatorAddress, lensHub.address, {
    nonce: deployerNonce++,
  })
  const profileCreationProxy = await ProfileCreationProxy.deployed();

  // Whitelist the collect modules
  console.log('\n\t-- Whitelisting Collect Modules --');
  let governanceNonce = await web3.eth.getTransactionCount(governanceAddress);
  await lensHub.whitelistCollectModule(feeCollectModule.address, true, { nonce: governanceNonce++, from: governanceAddress })
  await lensHub.whitelistCollectModule(limitedFeeCollectModule.address, true, {
    nonce: governanceNonce++, from: governanceAddress
  });
  await lensHub.whitelistCollectModule(timedFeeCollectModule.address, true, {
    nonce: governanceNonce++, from: governanceAddress
  });
  await lensHub.whitelistCollectModule(limitedTimedFeeCollectModule.address, true, {
    nonce: governanceNonce++, from: governanceAddress
  });
  await lensHub.whitelistCollectModule(revertCollectModule.address, true, { nonce: governanceNonce++, from: governanceAddress });
  await lensHub.whitelistCollectModule(freeCollectModule.address, true, { nonce: governanceNonce++, from: governanceAddress });

  // Whitelist the follow modules
  console.log('\n\t-- Whitelisting Follow Modules --');
  await lensHub.whitelistFollowModule(feeFollowModule.address, true, { nonce: governanceNonce++, from: governanceAddress });
  await lensHub.whitelistFollowModule(profileFollowModule.address, true, { nonce: governanceNonce++, from: governanceAddress });
  await lensHub.whitelistFollowModule(revertFollowModule.address, true, { nonce: governanceNonce++, from: governanceAddress });

  // --- COMMENTED OUT AS THIS IS NOT A LAUNCH MODULE ---
  // await lensHub.whitelistFollowModule(approvalFollowModule.address, true, { nonce: governanceNonce++ });
  // Whitelist the reference module

  console.log('\n\t-- Whitelisting Reference Module --');
  await lensHub.whitelistReferenceModule(followerOnlyReferenceModule.address, true, {
    nonce: governanceNonce++, from: governanceAddress
  });

  // Whitelist the currency
  console.log('\n\t-- Whitelisting Currency in Module Globals --');
  await moduleGlobals.whitelistCurrency(currency.address, true, { nonce: governanceNonce++, from: governanceAddress });

  // Whitelist the profile creation proxy
  console.log('\n\t-- Whitelisting Profile Creation Proxy --');
  await lensHub.whitelistProfileCreator(profileCreationProxy.address, true, {
    nonce: governanceNonce++, from: governanceAddress
  });

  // Save and log the addresses
  const addrs = {
    'lensHub proxy': lensHub.address,
    'lensHub impl:': lensHubImpl.address,
    'publishing logic lib': publishingLogic.address,
    'interaction logic lib': interactionLogic.address,
    'profile token uri logic lib': profileTokenURILogic.address,
    'follow NFT impl': followNFTImplAddress,
    'collect NFT impl': collectNFTImplAddress,
    'currency': currency.address,
    'lens periphery': lensPeriphery.address,
    'module globals': moduleGlobals.address,
    'fee collect module': feeCollectModule.address,
    'limited fee collect module': limitedFeeCollectModule.address,
    'timed fee collect module': timedFeeCollectModule.address,
    'limited timed fee collect module': limitedTimedFeeCollectModule.address,
    'revert collect module': revertCollectModule.address,
    'free collect module': freeCollectModule.address,
    'fee follow module': feeFollowModule.address,
    'profile follow module': profileFollowModule.address,
    'revert follow module': revertFollowModule.address,
    // --- COMMENTED OUT AS THIS IS NOT A LAUNCH MODULE ---
    // 'approval follow module': approvalFollowModule.address,
    'follower only reference module': followerOnlyReferenceModule.address,
    'UI data provider': uiDataProvider.address,
    'Profile creation proxy': profileCreationProxy.address,
  };
  const json = JSON.stringify(addrs, null, 2);
  console.log(json);

  fs.writeFileSync('addresses.json', json, 'utf-8');
};