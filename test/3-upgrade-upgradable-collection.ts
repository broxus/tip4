import {
    deployAccount,
    deployCollectionWithUpgradableNftAndMintNft
} from "./utils";

import { Account } from "everscale-standalone-client/nodejs";

import { expect } from "chai";
import { CollectionWithUpgradableNft } from "./wrappers/collection";
import { NftC } from "./wrappers/nft";
import { BigNumber } from "bignumber.js";


let account1: Account;
let nft: NftC;
let collection: CollectionWithUpgradableNft;


describe("Test Upgrade Upgradable Collection", async function () {
    it('Deploy account', async function () {
        account1 = await deployAccount(0, 20);
    });
    it('Deploy NFT-Collection and Mint Nft', async function () {
        let accForNft: Account[] = [];
        accForNft.push(account1);
        const [coll, nftS] = await deployCollectionWithUpgradableNftAndMintNft(account1, 1, "metadata-template.json", accForNft);
        nft = nftS[0];
        collection = coll;
    });
    it('Upgrade Collection', async function () {
        const oldCollectionVersion = await collection.getCollectionVersion();
        expect(oldCollectionVersion.version).to.be.eq('1');

        const expectedVersion = new BigNumber(oldCollectionVersion.version).plus(1).toString();
        const newCode = locklift.factory.getContractArtifacts('CollectionWithUpgradableNftTest').code;

        await collection.upgrade(
          account1,
          expectedVersion,
          account1.address,
          newCode
          );

        const newCollection = locklift.factory.getDeployedContract('CollectionWithUpgradableNftTest', collection.address);

        const bla = (await newCollection.methods.bla({}).call()).value0;
        expect(bla).to.be.eq('blablabla');

        const newVersion = await newCollection.methods.collectionVersion({answerId: 0}).call();
        expect(newVersion.version).to.be.eq('2');
    });

});