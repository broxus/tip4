import { Account } from "everscale-standalone-client/nodejs";
import { CallbackType } from "../utils";
import {Address, Contract, toNano, zeroAddress} from "locklift";
import { FactorySource } from "../../build/factorySource";

export class CollectionWithUbgradableNft {
    public contract: Contract<FactorySource["CollectionWithUpgradableNft"]>;
    public owner: Account;
    public address: Address;

    constructor(collection_contract: Contract<FactorySource["CollectionWithUpgradableNft"]>, collection_owner: Account) {
        this.contract = collection_contract;
        this.owner = collection_owner;
        this.address = this.contract.address;
    }

    static async from_addr(addr: Address, owner: Account) {
        const contract = await locklift.factory.getDeployedContract('CollectionWithUpgradableNft', addr);
        return new CollectionWithUbgradableNft(contract, owner);
    }

    async getNftAddress(id: number) {
        return (await this.contract.methods.nftAddress({
                answerId: 0,
                id: id
            }).call());
    }

    async getNftCode() {
        return (await this.contract.methods.nftCode({
                answerId: 0
            }).call());
    }

    async getNftCodeHash() {
        return (await this.contract.methods.nftCodeHash({
                answerId: 0
            }).call());
    }

    async getPlatformCodeInfo() {
        return (await this.contract.methods.platformCodeInfo({answerId: 0}).call());
    }

    async getPlatformCode() {
        return (await this.contract.methods.platformCode({answerId: 0}).call());
    }

    async getNftVersion() {
        return (await this.contract.methods.nftVersion({answerId: 0}).call());
    }

    async getCollectionVersion() {
        return (await this.contract.methods.collectionVersion({answerId: 0}).call());
    }

    async gasUpgradeValue() {
        return (await this.contract.methods.gasUpgradeValue({answerId: 0}).call());
    }

    async setNftCode(initiator: Account, code: string, gasValue: any) {
        return await this.contract.methods.setNftCode({
            code: code
        }).send({
            from: initiator.address,
            amount: gasValue
        });
    }

    async forceUpgradeNft(initiator: Account, offset: number, nfts: [], gasValue: any) {
        return await this.contract.methods.forceUpgradeNft({
            nfts: nfts,
            offset: offset
        }).send({
            from: initiator.address,
            amount: gasValue
        });
    }

    async upgrade(initiator: Account, newVersion: string, remainingGasTo: Address, newCode: any) {
        return await this.contract.methods.upgrade({
            newCode: newCode,
            newVersion: newVersion,
            remainingGasTo: remainingGasTo
        }).send({
            from: initiator.address,
            amount: toNano(4)
        });
    }

    async getEvents(event_name: string) {
        return (await this.contract.getPastEvents({filter: (event) => event.event === event_name})).events;
    }

    async getEvent(event_name: string) {
        const last_event = (await this.getEvents(event_name)).shift();
        if (last_event) {
            return last_event.data;
        }
        return null;
    }

}