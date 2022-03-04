require('dotenv').config()

// Plugins
require('hardhat-deploy')
require('@nomiclabs/hardhat-ethers')

// Tasks
require('./tasks/publish-nfts')

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 300,
          },
        },
      }
    ],
  },

  networks: {
    rinkeby: {
      url: process.env.RINKEBY_RPC_URL,
      accounts: [process.env.RINKEBY_PRIVATE_KEY],
    },
    opkovan: {
      url: process.env.OPKOVAN_RPC_URL,
      accounts: [process.env.OPKOVAN_PRIVATE_KEY],
    },
  },

  namedAccounts: {
    deployer: {
      default: 0,
    },
    publisher: {
      default: 0,
    },
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
}
