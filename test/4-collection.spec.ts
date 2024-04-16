import { Contract, Address, toNano, zeroAddress } from 'locklift';
import { expect } from 'chai';
import { BigNumber } from 'bignumber.js';

import JsonTemplate from '../metadata-template.json';
import { CollectionAbi, NftAbi } from '../build/factorySource';

describe('Collection', () => {
  let owner: Address;
  let user: Address;

  let collection: Contract<CollectionAbi>;
  let nft: Contract<NftAbi>;

  before('deploy contracts', async () => {
    await locklift.deployments.fixture({ exclude: ['nft', 'callbacks'] });

    owner = locklift.deployments.getAccount('OwnerWallet').account.address;
    user = locklift.deployments.getAccount('UserWallet').account.address;

    collection = locklift.deployments.getContract<CollectionAbi>('Collection');
  });

  describe('ownable', () => {
    it('should return valid owner', async () => {
      const currentOwner = await collection.methods
        .owner()
        .call()
        .then((r) => r.value0);

      return expect(currentOwner.toString()).to.be.equal(owner.toString());
    });

    it('should throw 100 error code for ownership transfer called from user', async () => {
      const { traceTree } = await locklift.tracing.trace(
        collection.methods
          .transferOwnership({ newOwner: user })
          .send({ from: user, amount: toNano(0.5), bounce: true }),
        { allowedCodes: { compute: [100] } },
      );

      return expect(traceTree)
        .to.call('transferOwnership')
        .count(1)
        .and.to.have.error(100);
    });

    it('should transfer ownership to user', async () => {
      const { traceTree } = await locklift.tracing.trace(
        collection.methods
          .transferOwnership({ newOwner: user })
          .send({ from: owner, amount: toNano(0.5) }),
      );

      return expect(traceTree)
        .to.call('transferOwnership')
        .count(1)
        .and.to.emit('OwnershipTransferred')
        .count(1)
        .withNamedArgs({ newOwner: user, oldOwner: owner });
    });

    it('should transfer ownership back to owner', async () => {
      const { traceTree } = await locklift.tracing.trace(
        collection.methods
          .transferOwnership({ newOwner: owner })
          .send({ from: user, amount: toNano(0.5) }),
      );

      return expect(traceTree)
        .to.call('transferOwnership')
        .count(1)
        .and.to.emit('OwnershipTransferred')
        .count(1)
        .withNamedArgs({ newOwner: owner, oldOwner: user });
    });
  });

  describe('tip-4.1', () => {
    it('should return total supply 0', async () => {
      const totalSupply = await collection.methods
        .totalSupply({ answerId: 0 })
        .call()
        .then((r) => r.count);

      return expect(totalSupply).to.be.equal('0');
    });

    it('should return right salted Nft code and its hash', async () => {
      const collectionNftCode = await collection.methods
        .nftCode({ answerId: 0 })
        .call()
        .then((r) => r.code);
      const collectionNftCodeHash = await collection.methods
        .nftCodeHash({ answerId: 0 })
        .call()
        .then((r) => new BigNumber(r.codeHash));

      const NftCode = locklift.factory.getContractArtifacts('Nft').code;
      const NftCodeWithSalt = await locklift.provider
        .setCodeSalt({
          code: NftCode,
          salt: {
            structure: [{ 'name': 'collection', 'type': 'address' }] as const,
            data: { collection: collection.address },
          },
        });

      expect(collectionNftCodeHash.isEqualTo(NftCodeWithSalt.hash, 16)).to.be.true;
      return expect(collectionNftCode).to.be.equal(NftCodeWithSalt.code);
    });

    it('should return valid address for minted NFT', async () => {
      nft = await collection.methods
        .nftAddress({ answerId: 0, id: 0 })
        .call()
        .then((r) => locklift.factory.getDeployedContract('Nft', r.nft));

      const { traceTree } = await locklift.tracing.trace(
        collection.methods
          .mintNft({ _owner: user, _json: JSON.stringify(JsonTemplate.nfts[0]) })
          .send({ from: owner, amount: toNano(5) })
      );

      return expect(traceTree)
        .to.call('mintNft')
        .count(1)
        .and.to.emit('NftCreated')
        .count(1)
        .withNamedArgs({
          id: '0',
          nft: nft.address,
          owner: user,
          manager: user,
          creator: owner
        });
    });

    it('should return total supply 1', async () => {
      const totalSupply = await collection.methods
        .totalSupply({ answerId: 0 })
        .call()
        .then((r) => r.count);

      return expect(totalSupply).to.be.equal('1');
    });

    it('should burn NFT with ID 0', async () => {
      const { traceTree } = await locklift.tracing.trace(
        nft.methods
          .burn({ sendGasTo: user, callbackTo: zeroAddress, callbackPayload: '' })
          .send({ from: user, amount: toNano(3) })
      );

      return expect(traceTree)
        .to.call('acceptNftBurn')
        .count(1)
        .and.to.emit('NftBurned')
        .count(1)
        .withNamedArgs({
          id: '0',
          nft: nft.address,
          owner: user,
          manager: user
        });
    });

    it('should return total supply 0', async () => {
      const totalSupply = await collection.methods
        .totalSupply({ answerId: 0 })
        .call()
        .then((r) => r.count);

      return expect(totalSupply).to.be.equal('0');
    });
  });

  describe('tip-4.2', () => {
    it('should return JSON of collection', async () => {
      const collectionJson = await collection.methods
        .getJson({ answerId: 0 })
        .call()
        .then((r) => r.json);

      return expect(collectionJson).to.be.equal(JSON.stringify(JsonTemplate.collection));
    });
  });

  describe('tip-4.3', () => {
    it('should return IndexBasis code and its hash', async () => {
      const collectionIndexBasisCode = await collection.methods
        .indexBasisCode({ answerId: 0 })
        .call()
        .then((r) => r.code);
      const collectionIndexBasisCodeHash = await collection.methods
        .indexBasisCodeHash({ answerId: 0 })
        .call()
        .then((r) => new BigNumber(r.hash));

      const IndexBasisArtifacts = locklift.factory.getContractArtifacts('IndexBasis');

      expect(collectionIndexBasisCodeHash.isEqualTo(IndexBasisArtifacts.codeHash, 16)).to.be.true;
      return expect(collectionIndexBasisCode).to.be.equal(IndexBasisArtifacts.code);
    });

    it('should return Index code and its hash', async () => {
      const collectionIndexCode = await collection.methods
        .indexCode({ answerId: 0 })
        .call()
        .then((r) => r.code);
      const collectionIndexCodeHash = await collection.methods
        .indexCodeHash({ answerId: 0 })
        .call()
        .then((r) => new BigNumber(r.hash));

      const IndexArtifacts = locklift.factory.getContractArtifacts('Index');

      expect(collectionIndexCodeHash.isEqualTo(IndexArtifacts.codeHash, 16)).to.be.true;
      return expect(collectionIndexCode).to.be.equal(IndexArtifacts.code);
    });

    it('should return valid address for deployed IndexBasis', async () => {
      const index = await collection.methods
        .resolveIndexBasis({ answerId: 0 })
        .call()
        .then((r) => locklift.factory.getDeployedContract('IndexBasis', r.indexBasis));

      const indexCollection = await index.methods
        .getInfo({ answerId: 0 })
        .call()
        .then((r) => r.collection);

      return expect(indexCollection.toString()).to.be.equal(collection.address.toString());
    });
  });

  describe('tip-6', () => {
    it('should return true for tip-4.1 interface', async () => {
      const isSupported = await collection.methods
        .supportsInterface({
          answerId: 0,
          interfaceID: new BigNumber('0x1217aaab').toString(10)
        })
        .call()
        .then((r) => r.value0);

      return expect(isSupported).to.be.true;
    });

    it('should return true for tip-4.2 interface', async () => {
      const isSupported = await collection.methods
        .supportsInterface({
          answerId: 0,
          interfaceID: new BigNumber('0x24d7d5f5').toString(10)
        })
        .call()
        .then((r) => r.value0);

      return expect(isSupported).to.be.true;
    });

    it('should return true for tip-4.3 interface', async () => {
      const isSupported = await collection.methods
        .supportsInterface({
          answerId: 0,
          interfaceID: new BigNumber('0x4387bbfb').toString(10)
        })
        .call()
        .then((r) => r.value0);

      return expect(isSupported).to.be.true;
    });

    it('should return true for tip-6 interface', async () => {
      const isSupported = await collection.methods
        .supportsInterface({
          answerId: 0,
          interfaceID: new BigNumber('0x3204ec29').toString(10)
        })
        .call()
        .then((r) => r.value0);

      return expect(isSupported).to.be.true;
    });

    it('should return false for unknown interface', async () => {
      const isSupported = await collection.methods
        .supportsInterface({
          answerId: 0,
          interfaceID: new BigNumber('0x3204ec25').toString(10)
        })
        .call()
        .then((r) => r.value0);

      return expect(isSupported).to.be.false;
    });
  });

  describe('mint and batch mint', () => {
    it('should 100 error code for mint called from user', async () => {
      const { traceTree } = await locklift.tracing.trace(
        collection.methods
          .mintNft({ _owner: user, _json: JSON.stringify(JsonTemplate.nfts[0]) })
          .send({ from: user, amount: toNano(3), bounce: true }),
        { allowedCodes: { compute: [100] } },
      );

      return expect(traceTree).to.have.error(100);
    });

    it('should 100 error code for batch mint called from user', async () => {
      const { traceTree } = await locklift.tracing.trace(
        collection.methods
          .batchMintNft({ _owner: user, _jsons: [JSON.stringify(JsonTemplate.nfts[0])] })
          .send({ from: user, amount: toNano(3), bounce: true }),
        { allowedCodes: { compute: [100] } },
      );

      return expect(traceTree).to.have.error(100);
    });

    it('should throw VALUE_IS_LESS_THAN_REQUIRED for mint', async () => {
      const { traceTree } = await locklift.tracing.trace(
        collection.methods
          .mintNft({ _owner: user, _json: JSON.stringify(JsonTemplate.nfts[0]) })
          .send({ from: owner, amount: toNano(0.5), bounce: true }),
        { allowedCodes: { compute: [104] } },
      );

      return expect(traceTree).to.have.error(104);
    });

    it('should throw VALUE_IS_LESS_THAN_REQUIRED for batch mint', async () => {
      const { traceTree } = await locklift.tracing.trace(
        collection.methods
          .batchMintNft({ _owner: user, _jsons: [JSON.stringify(JsonTemplate.nfts[0])] })
          .send({ from: owner, amount: toNano(3), bounce: true }),
        { allowedCodes: { compute: [104] } },
      );

      return expect(traceTree).to.have.error(104);
    });

    it('should mint 3 NFTs by batchMint', async () => {
      const { traceTree } = await locklift.tracing.trace(
        collection.methods
          .batchMintNft({
            _owner: user,
            _jsons: [
              JSON.stringify(JsonTemplate.nfts[0]),
              JSON.stringify(JsonTemplate.nfts[0]),
              JSON.stringify(JsonTemplate.nfts[0])
            ]
          })
          .send({ from: owner, amount: toNano(11) })
      );

      const totalSupply = await collection.methods
        .totalSupply({ answerId: 0 })
        .call()
        .then((r) => r.count);

      const events = traceTree?.findEventsForContract({
        contract: collection,
        name: 'NftCreated' as const
      });

      expect(totalSupply).to.be.equal('3');
      return expect(events?.length).to.be.equal(3);
    });
  });
});
