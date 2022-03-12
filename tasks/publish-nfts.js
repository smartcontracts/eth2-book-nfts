// TODO: Make this script much more robust.
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const pinataSDK = require('@pinata/sdk')
const { task, types } = require('hardhat/config')
const { reqenv } = require('@eth-optimism/core-utils')
const yesno = require('yesno')

task('publish-nfts')
  .addParam('recipient', 'NFT recipient address', null, types.string)
  .addParam('image', 'path to NFT image', null, types.string)
  .addParam('name', 'name of NFT', null, types.string)
  .addParam('description', 'description of NFT', null, types.string)
  .addParam('url', 'external url of NFT', null, types.string)
  .setAction(async (args, hre) => {
    // For now these will live in fixed positions
    const pathIpfshashData = path.resolve(__dirname, `../ipfs/${hre.network.name}/ipfshash.json`)
    const pathIpfsImagesFolder = path.resolve(__dirname, `../ipfs/${hre.network.name}/images/`)
    const pathIpfsMetadataFolder = path.resolve(__dirname, `../ipfs/${hre.network.name}/metadata/`)

    // Load and validate environment variables
    dotenv.config()
    reqenv('PINATA_API_KEY')
    reqenv('PINATA_SECRET_API_KEY')

    // For now, only accept PNG files
    if (!args.image.endsWith('.png')) {
      throw new Error('image must be a PNG file')
    }

    console.log(`Image path: ${args.image}`)
    console.log(`Name: ${args.name}`)
    console.log(`Description: ${args.description}`)
    console.log(`URL: ${args.url}`)
    console.log(`Recipient: ${args.recipient}`)
    const ok = await yesno({
      question: 'Does this look OK?',
    })

    if (!ok) {
      throw new Error('Aborting')
    }

    // Initialize pinata
    const pinata = pinataSDK(
      process.env.PINATA_API_KEY,
      process.env.PINATA_SECRET_API_KEY
    )

    // Test Pinata connection
    console.log('Testing Pinata connection...')
    const auth = await pinata.testAuthentication()
    if (!auth.authenticated) {
      throw new Error(`pinata authentication failed: ${auth}`)
    }
    console.log('Pinata connection successful')

    // Determine next image index to use
    const nextImageIndex = fs
      .readdirSync(pathIpfsImagesFolder)
      .map((file) => {
        return parseInt(file.split('.')[0])
      })
      .reduce((a, b) => {
        return Math.max(a, b)
      }, -1) + 1

    console.log(`Next image index: ${nextImageIndex}`)

    // Copy image to image folder
    fs.copyFileSync(
      args.image,
      path.join(pathIpfsImagesFolder, `${nextImageIndex}.png`)
    )

    // Push image folder to IPFS
    console.log('Pushing image folder to IPFS...')
    const imagePublishResult = await pinata.pinFromFS(
      pathIpfsImagesFolder,
      {
        pinataMetadata: {
          name: 'ETH2NFT Images'
        },
        pinataOptions: {
          cidVersion: 0
        }
      }
    )

    // Write metadata to metadata folder
    fs.writeFileSync(
      path.join(pathIpfsMetadataFolder, `${nextImageIndex}.json`),
      JSON.stringify({
        name: args.name,
        description: args.description,
        external_url: args.url,
        image: `ipfs://${imagePublishResult['IpfsHash']}/${nextImageIndex}.png`
      }, null, 2)
    )

    // Push metadata folder to IPFS
    console.log('Pushing metadata folder to IPFS...')
    const metadataPublishResult = await pinata.pinFromFS(
      path.resolve(__dirname, pathIpfsMetadataFolder),
      {
        pinataMetadata: {
          name: 'ETH2NFT Metadata'
        },
        pinataOptions: {
          cidVersion: 0
        }
      }
    )

    // Write IPFS hash to file
    fs.writeFileSync(
      pathIpfshashData,
      JSON.stringify({
        images: imagePublishResult['IpfsHash'],
        metadata: metadataPublishResult['IpfsHash']
      }, null, 2)
    )

    // Set up ETH2NFT connection
    console.log('Setting up ETH2NFT connection...')
    const deployment = await hre.deployments.get('ETH2NFT')
    const ETH2NFT = new hre.ethers.Contract(
      deployment.address,
      deployment.abi,
      await hre.ethers.getSigner(
        (await hre.getNamedAccounts()).publisher
      )
    )

    // Update baseURI with new NFT
    console.log('Updating baseURI...')
    const tx = await ETH2NFT.setBaseURI(`ipfs://${metadataPublishResult['IpfsHash']}/`)
    console.log(`Transaction hash: ${tx.hash}`)
    console.log('Waiting for transaction to be mined...')
    await tx.wait()
    console.log('Transaction mined!')

    // Mint the new token
    console.log('Minting token...')
    const mintTx = await ETH2NFT.mint(args.recipient, nextImageIndex)
    console.log(`Transaction hash: ${mintTx.hash}`)
    console.log('Waiting for transaction to be mined...')
    await mintTx.wait()
    console.log('Transaction mined!')
  })
