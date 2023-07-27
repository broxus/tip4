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
        return this.contract.methods.nftAddress({
                answerId: 0,
                id: id
            }).call();
    }

    async getNftCode() {
        return this.contract.methods.nftCode({
                answerId: 0
            }).call();
    }

    async getNftCodeHash() {
        return this.contract.methods.nftCodeHash({
                answerId: 0
            }).call();
    }

}