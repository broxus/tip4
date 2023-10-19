import {
    deployAccount,
    sleep,
    deployCollectionWithUbgradableNftAndMintNft
} from "./utils";

import { Account } from "everscale-standalone-client/nodejs";

const logger = require('mocha-logger');
const { expect } = require('chai');
import {Contract, lockliftChai} from "locklift";
import chai from "chai";
import {FactorySource} from "../build/factorySource";
import {CollectionWithUbgradableNft} from "./wrappers/collection";
import {NftC} from "./wrappers/nft";
import BigNumber from "bignumber.js";
chai.use(lockliftChai);
const fs = require('fs')


let account1: Account;
let nft: NftC;
let collection: CollectionWithUbgradableNft;

describe("Test Ubgradable NFT", async function () {
    it('Deploy account', async function () {
        account1 = await deployAccount(0, 20);
    });
    it('Deploy NFT-Collection and Mint Nft', async function () {
        let accForNft: Account[] = [];
        accForNft.push(account1);
        const [coll, nftS] = await deployCollectionWithUbgradableNftAndMintNft(account1, 1, "metadata-template.json", accForNft);
        nft = nftS[0];
        collection = coll;
    });
    it('Check address NFT', async function () {
        const expectedNftAddress = await collection.getNftAddress(0);
        expect(expectedNftAddress.nft.toString()).to.be.eq(nft.address.toString());
    });
    it('Check NFT info', async function () {
        const nftInfo = await nft.getInfo();
        expect(nftInfo.owner.toString()).to.be.eq(account1.address.toString());
        expect(nftInfo.manager.toString()).to.be.eq(account1.address.toString());
        expect(nftInfo.collection.toString()).to.be.eq(collection.address.toString());
    });

    const saltStruct = [
      { name: 'collection', type: 'address' }
    ] as const;

    it('Check NFT code', async function () {
        const nftCodeFromCollection = await collection.getNftCodeHash();
        // splitTVC

        const nftCode = locklift.factory.getContractArtifacts('NftUpgradable').code;
        const { hash: codeHash } = await locklift.provider.setCodeSalt({
            code: nftCode,
            salt: {
                structure: saltStruct,
                data: {
                    collection: collection.address
                }
            }
        })
        expect(new BigNumber(nftCodeFromCollection.codeHash).toString(16)).to.be.eq(codeHash.toString());
    });
});