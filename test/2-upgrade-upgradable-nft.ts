import {
    deployAccount,
    deployCollectionWithUpgradableNftAndMintNft
} from "./utils";

import { Account } from "everscale-standalone-client/nodejs";

import { expect } from "chai";
import { Address } from "locklift";
import { CollectionWithUpgradableNft } from "./wrappers/collection";
import { NftC } from "./wrappers/nft";
import { BigNumber } from "bignumber.js";

let account1: Account;
let nft: NftC;
let collection: CollectionWithUpgradableNft;

type GasValue = {
    fixedValue: string,
    dynamicValue: string;
}

function calcValue(gas: GasValue){
    const gasK = '10000000';
    const gasPrice = new BigNumber(1).shiftedBy(9).div(gasK);
    return new BigNumber(gas.dynamicValue).times(gasPrice).plus(gas.fixedValue).toNumber();
}

export async function sleep(ms = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe("Test Upgrade Upgradable NFT", async function () {
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
    it('Check version', async function () {
        const nftVersionFromCollection = await collection.getNftVersion();
        const nftVersionFromNft = await nft.getNftVersion();
        const eventNftCodeUpdated = await collection.getEvent('NftCodeUpdated') as any;
        expect(nftVersionFromCollection.toString()).to.be.eq(nftVersionFromNft.toString());
        expect(eventNftCodeUpdated.oldVersion).to.be.eq('0');
        expect(eventNftCodeUpdated.newVersion).to.be.eq('1');
    });
    it('Set new NFT code for collection', async function () {
        const oldCode =  locklift.factory.getContractArtifacts('NftUpgradable').code;
        const newCode =  locklift.factory.getContractArtifacts('NftUpgradableForTest').code;
        expect(oldCode.toString()).to.be.not.eq(newCode.toString());

        const saltStruct = [
          { name: 'collection', type: 'address' }
        ] as const;

        const { hash: codeHash } = await locklift.provider.setCodeSalt({
            code: oldCode,
            salt: {
                structure: saltStruct,
                abiVersion: '2.0',
                data: {
                    collection: collection.address
                }
            }
        });

        const codeHashFromCollection = await collection.getNftCodeHash();
        expect(new BigNumber(codeHashFromCollection.codeHash).isEqualTo(codeHash, 16)).to.be.true;


        const { hash: newCodeHash } = await locklift.provider.setCodeSalt({
            code: newCode,
            salt: {
                structure: saltStruct,
                data: {
                    collection: collection.address
                }
            }
        });

        await locklift.transactions.waitFinalized(collection.setNftCode(account1, newCode, '3000000000'));
        const newCodeFromCollection = await collection.getNftCodeHash();
        expect(new BigNumber(newCodeFromCollection.codeHash).isEqualTo(newCodeHash, 16)).to.be.true;

        const eventNftCodeUpdated = await collection.getEvent('NftCodeUpdated') as any;
        expect(eventNftCodeUpdated.oldVersion).to.be.eq('1');
        expect(eventNftCodeUpdated.newVersion).to.be.eq('2');
    });
    it('Upgrade NFT by user', async function () {
        const gasValue = await collection.gasUpgradeValue();
        const upgradeValue = calcValue(gasValue);
        const oldVersion = await nft.getNftVersion();
        expect(oldVersion.nftVersion).to.be.eq('1');

        await locklift.transactions.waitFinalized(nft.requestUpgrade(account1, account1.address, upgradeValue.toString()));

        const eventUpgradeNftRequested = await collection.getEvent('UpgradeNftRequested') as {
            oldVersion: string;
            newVersion: string;
            initiator: Address;
            nft: Address;
        };
        expect(eventUpgradeNftRequested.oldVersion).to.be.eq('1');
        expect(eventUpgradeNftRequested.newVersion).to.be.eq('2');
        expect(eventUpgradeNftRequested.initiator.toString()).to.be.eq(account1.address.toString());
        expect(eventUpgradeNftRequested.nft.toString()).to.be.eq(nft.address.toString());

        const eventNftUpdated = await nft.getEvent('NftUpgraded') as {
            oldVersion: string;
            newVersion: string;
            initiator: Address;
        };
        expect(eventNftUpdated.oldVersion).to.be.eq('1');
        expect(eventNftUpdated.newVersion).to.be.eq('2');
        expect(eventNftUpdated.initiator.toString()).to.be.eq(account1.address.toString());

        const newNft = locklift.factory.getDeployedContract('NftUpgradableForTest', nft.address);
        const newVersion = await newNft.methods.version({answerId: 0}).call();
        expect(newVersion.nftVersion).to.be.eq('2');

        const bla = (await newNft.methods.bla({}).call()).value0;
        expect(bla).to.be.eq('blablabla');
    });

});