import { Address, Contract, toNano, zeroAddress } from 'locklift';
import { expect } from 'chai';
import { BigNumber } from 'bignumber.js';

import JsonTemplate from '../metadata-template.json';
import { CollectionAbi, NftAbi, CallbacksTestAbi } from '../build/factorySource';

describe('NFT', () => {
  let owner: Address;
  let user: Address;

  let collection: Contract<CollectionAbi>;
  let nft: Contract<NftAbi>;
  let callbacks: Contract<CallbacksTestAbi>;

  before('deploy contracts', async () => {
    await locklift.deployments.fixture();

    owner = locklift.deployments.getAccount('OwnerWallet').account.address;
    user = locklift.deployments.getAccount('UserWallet').account.address;

    collection = locklift.deployments.getContract<CollectionAbi>('Collection');
    nft = locklift.deployments.getContract<NftAbi>('Nft');
    callbacks = locklift.deployments.getContract<CallbacksTestAbi>('CallbacksTest');
  });

  describe('tip-4.1', () => {
    it('should return NFT info', async () => {
      const info = await nft.methods
        .getInfo({ answerId: 0 })
        .call();

      expect(info.id).to.be.equal('0');
      expect(info.collection.toString()).to.be.equal(collection.address.toString());
      expect(info.owner.toString()).to.be.equal(user.toString());
      return expect(info.manager.toString()).to.be.equal(user.toString());
    });

    describe('ownership changes from non-manager and non-owner of NFT', () => {
      it('should throw SENDER_IS_NOT_MANAGER for changeManager', async () => {
        const { traceTree } = await locklift.tracing.trace(
          nft.methods
            .changeManager({ newManager: owner, sendGasTo: owner, callbacks: [] })
            .send({ from: owner, amount: toNano(1), bounce: true }),
          { allowedCodes: { compute: [103] } },
        );

        return expect(traceTree).to.have.error(103);
      });

      it('should throw SENDER_IS_NOT_MANAGER for changeOwner', async () => {
        const { traceTree } = await locklift.tracing.trace(
          nft.methods
            .changeOwner({ newOwner: owner, sendGasTo: owner, callbacks: [] })
            .send({ from: owner, amount: toNano(1), bounce: true }),
          { allowedCodes: { compute: [103] } },
        );

        return expect(traceTree).to.have.error(103);
      });

      it('should throw SENDER_IS_NOT_MANAGER for transfer', async () => {
        const { traceTree } = await locklift.tracing.trace(
          nft.methods
            .transfer({ to: owner, sendGasTo: owner, callbacks: [] })
            .send({ from: owner, amount: toNano(1), bounce: true }),
          { allowedCodes: { compute: [103] } },
        );

        return expect(traceTree).to.have.error(103);
      });
    });

    describe('change NFT manager', () => {
      it('should change manager to "owner"', async () => {
        await locklift.transactions.waitFinalized(
          nft.methods
            .changeManager({ newManager: owner, sendGasTo: user, callbacks: [] })
            .send({ from: user, amount: toNano(1) }),
        );

        const info = await nft.methods
          .getInfo({ answerId: 0 })
          .call();

        expect(info.owner.toString()).to.be.equal(user.toString());
        return expect(info.manager.toString()).to.be.equal(owner.toString());
      });
    })

    describe('ownership changes from owner of NFT', () => {
      it('should throw SENDER_IS_NOT_MANAGER for changeManager from user', async () => {
        const { traceTree } = await locklift.tracing.trace(
          nft.methods
            .changeManager({ newManager: user, sendGasTo: user, callbacks: [] })
            .send({ from: user, amount: toNano(1), bounce: true }),
          { allowedCodes: { compute: [103] } },
        );

        return expect(traceTree).to.have.error(103);
      });

      it('should throw SENDER_IS_NOT_MANAGER for changeOwner from user', async () => {
        const { traceTree } = await locklift.tracing.trace(
          nft.methods
            .changeOwner({ newOwner: user, sendGasTo: user, callbacks: [] })
            .send({ from: user, amount: toNano(1), bounce: true }),
          { allowedCodes: { compute: [103] } },
        );

        return expect(traceTree).to.have.error(103);
      });

      it('should throw SENDER_IS_NOT_MANAGER for transfer from user', async () => {
        const { traceTree } = await locklift.tracing.trace(
          nft.methods
            .transfer({ to: user, sendGasTo: user, callbacks: [] })
            .send({ from: user, amount: toNano(1), bounce: true }),
          { allowedCodes: { compute: [103] } },
        );

        return expect(traceTree).to.have.error(103);
      });
    });

    describe('ownership changes from manager of NFT', () => {
      it('should change owner to "owner"', async () => {
        await locklift.transactions.waitFinalized(
          nft.methods
            .changeOwner({ newOwner: owner, sendGasTo: owner, callbacks: [] })
            .send({ from: owner, amount: toNano(2) })
        );

        const info = await nft.methods
          .getInfo({ answerId: 0 })
          .call();

        expect(info.owner.toString()).to.be.equal(owner.toString());
        return expect(info.manager.toString()).to.be.equal(owner.toString());
      });

      it('should transfer NFT to "user"', async () => {
        await locklift.transactions.waitFinalized(
          nft.methods
            .transfer({ to: user, sendGasTo: owner, callbacks: [] })
            .send({ from: owner, amount: toNano(2) })
        );

        const info = await nft.methods
          .getInfo({ answerId: 0 })
          .call();

        expect(info.owner.toString()).to.be.equal(user.toString());
        return expect(info.manager.toString()).to.be.equal(user.toString());
      });
    });
  });

  describe('tip-4.2', () => {
    it('should return JSON of NFT', async () => {
      const nftJson = await nft.methods
        .getJson({ answerId: 0 })
        .call()
        .then((r) => r.json);

      return expect(nftJson).to.be.equal(JSON.stringify(JsonTemplate.nfts[0]));
    });
  });

  describe('tip-4.3', () => {
    it('should return Index code and its hash', async () => {
      const nftIndexCode = await nft.methods
        .indexCode({ answerId: 0 })
        .call()
        .then((r) => r.code);
      const nftIndexCodeHash = await nft.methods
        .indexCodeHash({ answerId: 0 })
        .call()
        .then((r) => new BigNumber(r.hash));

      const IndexArtifacts = locklift.factory.getContractArtifacts('Index');

      expect(nftIndexCodeHash.isEqualTo(IndexArtifacts.codeHash, 16)).to.be.true;
      return expect(nftIndexCode).to.be.equal(IndexArtifacts.code);
    });

    it('should return valid address for Index by owner', async () => {
      const index = await nft.methods
        .resolveIndex({ answerId: 0, collection: zeroAddress, owner: user })
        .call()
        .then((r) => locklift.factory.getDeployedContract('Index', r.index));

      const indexInfo = await index.methods
        .getInfo({ answerId: 0 })
        .call();

      expect(indexInfo.collection.toString()).to.be.equal(collection.address.toString());
      expect(indexInfo.owner.toString()).to.be.equal(user.toString());
      return expect(indexInfo.nft.toString()).to.be.equal(nft.address.toString());
    });

    it('should return valid address for Index by collection and owner', async () => {
      const index = await nft.methods
        .resolveIndex({ answerId: 0, collection: collection.address, owner: user })
        .call()
        .then((r) => locklift.factory.getDeployedContract('Index', r.index));

      const indexInfo = await index.methods
        .getInfo({ answerId: 0 })
        .call();

      expect(indexInfo.collection.toString()).to.be.equal(collection.address.toString());
      expect(indexInfo.owner.toString()).to.be.equal(user.toString());
      return expect(indexInfo.nft.toString()).to.be.equal(nft.address.toString());
    });

    it('should change indexes after transfer', async () => {
      const indexByUser = await nft.methods
        .resolveIndex({ answerId: 0, collection: zeroAddress, owner: user })
        .call()
        .then((r) => r.index);
      const indexByUserAndCollection = await nft.methods
        .resolveIndex({ answerId: 0, collection: collection.address, owner: user })
        .call()
        .then((r) => r.index);

      await locklift.transactions.waitFinalized(
        nft.methods
          .transfer({ to: owner, sendGasTo: user, callbacks: [] })
          .send({ from: user, amount: toNano(2) })
      );

      const isIndexByUserDeployed = await locklift.provider
        .getFullContractState({ address: indexByUser })
        .then((r) => !!r.state?.isDeployed);
      const isIndexByUserAndCollectionDeployed = await locklift.provider
        .getFullContractState({ address: indexByUserAndCollection })
        .then((r) => !!r.state?.isDeployed);

      expect(isIndexByUserDeployed).to.be.false;
      expect(isIndexByUserAndCollectionDeployed).to.be.false;

      const indexByUserAfter = await nft.methods
        .resolveIndex({ answerId: 0, collection: zeroAddress, owner: owner })
        .call()
        .then((r) => r.index);
      const indexByUserAndCollectionAfter = await nft.methods
        .resolveIndex({ answerId: 0, collection: collection.address, owner: owner })
        .call()
        .then((r) => r.index);
      const isIndexByUserAfterDeployed = await locklift.provider
        .getFullContractState({ address: indexByUserAfter })
        .then((r) => !!r.state?.isDeployed);
      const isIndexByUserAndCollectionAfterDeployed = await locklift.provider
        .getFullContractState({ address: indexByUserAndCollectionAfter })
        .then((r) => !!r.state?.isDeployed);

      expect(isIndexByUserAfterDeployed).to.be.true;
      return expect(isIndexByUserAndCollectionAfterDeployed).to.be.true;
    });
  });

  describe('tip-6', () => {
    it('should return true for tip-4.1 interface', async () => {
      const isSupported = await nft.methods
        .supportsInterface({
          answerId: 0,
          interfaceID: new BigNumber('0x78084f7e').toString(10)
        })
        .call()
        .then((r) => r.value0);

      return expect(isSupported).to.be.true;
    });

    it('should return true for tip-4.2 interface', async () => {
      const isSupported = await nft.methods
        .supportsInterface({
          answerId: 0,
          interfaceID: new BigNumber('0x24d7d5f5').toString(10)
        })
        .call()
        .then((r) => r.value0);

      return expect(isSupported).to.be.true;
    });

    it('should return true for tip-4.3 interface', async () => {
      const isSupported = await nft.methods
        .supportsInterface({
          answerId: 0,
          interfaceID: new BigNumber('0x4df6250b').toString(10)
        })
        .call()
        .then((r) => r.value0);

      return expect(isSupported).to.be.true;
    });

    it('should return true for tip-6 interface', async () => {
      const isSupported = await nft.methods
        .supportsInterface({
          answerId: 0,
          interfaceID: new BigNumber('0x3204ec29').toString(10)
        })
        .call()
        .then((r) => r.value0);

      return expect(isSupported).to.be.true;
    });

    it('should return false for unknown interface', async () => {
      const isSupported = await nft.methods
        .supportsInterface({
          answerId: 0,
          interfaceID: new BigNumber('0x3204ec25').toString(10)
        })
        .call()
        .then((r) => r.value0);

      return expect(isSupported).to.be.false;
    });
  });

  describe('burn', () => {
    it('should throw SENDER_IS_NOT_MANAGER for burn from non-manager', async () => {
      const { traceTree } = await locklift.tracing.trace(
        nft.methods
          .burn({ sendGasTo: user, callbackTo: zeroAddress, callbackPayload: '' })
          .send({ from: user, amount: toNano(1), bounce: true }),
        { allowedCodes: { compute: [103] } },
      );

      return expect(traceTree).to.have.error(103);
    });

    it('should burn NFT and destroy its indexes', async () => {
      const indexByUser = await nft.methods
        .resolveIndex({ answerId: 0, collection: zeroAddress, owner: owner })
        .call()
        .then((r) => r.index);
      const indexByUserAndCollection = await nft.methods
        .resolveIndex({ answerId: 0, collection: collection.address, owner: owner })
        .call()
        .then((r) => r.index);

      const { traceTree } = await locklift.tracing.trace(
        nft.methods
          .burn({ sendGasTo: owner, callbackTo: zeroAddress, callbackPayload: '' })
          .send({ from: owner, amount: toNano(1) })
      );

      const isIndexByUserDeployed = await locklift.provider
        .getFullContractState({ address: indexByUser })
        .then((r) => !!r.state?.isDeployed);
      const isIndexByUserAndCollectionDeployed = await locklift.provider
        .getFullContractState({ address: indexByUserAndCollection })
        .then((r) => !!r.state?.isDeployed);
      const isNftDeployed = await nft
        .getFullState()
        .then((r) => !!r.state?.isDeployed);

      expect(isIndexByUserDeployed).to.be.false;
      expect(isIndexByUserAndCollectionDeployed).to.be.false;
      expect(isNftDeployed).to.be.false;
      return expect(traceTree)
        .to.call('acceptNftBurn')
        .count(1)
        .and.to.emit('NftBurned')
        .count(1)
        .withNamedArgs({
          id: '0',
          nft: nft.address,
          owner: owner,
          manager: owner,
        });
    });
  });

  describe('callbacks', () => {
    it('mint new NFT', async () => {
      const { traceTree } = await locklift.tracing.trace(
        collection.methods
          .mintNft({ _json: JSON.stringify(JsonTemplate.nfts[0]), _owner: user })
          .send({ from: owner, amount: toNano(3) }),
      );

      const nftAddress = traceTree?.findEventsForContract({ contract: collection, name: 'NftCreated' as const })[0];
      nft = locklift.factory.getDeployedContract('Nft', nftAddress!.nft);
    });

    it('should change manager and receive callback', async () => {
      const { traceTree } = await locklift.tracing.trace(
        nft.methods
          .changeManager({
            newManager: owner,
            sendGasTo: user,
            callbacks: [[callbacks.address, { value: toNano(0.1), payload: '' }]],
          })
          .send({ from: user, amount: toNano(1) }),
      );

      return expect(traceTree)
        .to.call('onNftChangeManager')
        .count(1)
        .withNamedArgs({
          id: '1',
          owner: user,
          oldManager: user,
          newManager: owner,
          collection: collection.address,
          sendGasTo: user,
        });
    });

    it('should change owner and receive callback', async () => {
      const { traceTree } = await locklift.tracing.trace(
        nft.methods
          .changeOwner({
            newOwner: owner,
            sendGasTo: owner,
            callbacks: [[callbacks.address, { value: toNano(0.1), payload: '' }]],
          })
          .send({ from: owner, amount: toNano(1) }),
      );

      return expect(traceTree)
        .to.call('onNftChangeOwner')
        .count(1)
        .withNamedArgs({
          id: '1',
          manager: owner,
          oldOwner: user,
          newOwner: owner,
          collection: collection.address,
          sendGasTo: owner,
        });
    });

    it('should transfer NFT and receive callback', async () => {
      const { traceTree } = await locklift.tracing.trace(
        nft.methods
          .transfer({
            to: user,
            sendGasTo: owner,
            callbacks: [[callbacks.address, { value: toNano(0.1), payload: '' }]],
          })
          .send({ from: owner, amount: toNano(1) }),
      );

      return expect(traceTree)
        .to.call('onNftTransfer')
        .count(1)
        .withNamedArgs({
          id: '1',
          oldOwner: owner,
          newOwner: user,
          oldManager: owner,
          newManager: user,
          collection: collection.address,
          gasReceiver: owner,
        });
    });

    it('should burn NFT and receive callback', async () => {
      const { traceTree } = await locklift.tracing.trace(
        nft.methods
          .burn({
            sendGasTo: user,
            callbackTo: callbacks.address,
            callbackPayload: '',
          })
          .send({ from: user, amount: toNano(1) }),
      );

      return expect(traceTree)
        .to.call('onAcceptNftBurn')
        .count(1)
        .withNamedArgs({
          _collection: collection.address,
          _id: '1',
          _nft: nft.address,
          _owner: user,
          _manager: user,
          _remainingGasTo: user,
        });
    });
  });
});
