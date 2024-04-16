import { Account } from "everscale-standalone-client/nodejs";
import { CallbackType } from "../utils";
import { Address, Contract, zeroAddress } from "locklift";
import { FactorySource } from "../../build/factorySource";

export class NftCUBG {
    public contract: Contract<FactorySource["NftUpgradableForTest"]>;
    public owner: Account;
    public address: Address;

    constructor(nft_contract: Contract<FactorySource["NftUpgradableForTest"]>, nft_owner: Account) {
        this.contract = nft_contract;
        this.owner = nft_owner;
        this.address = this.contract.address;
    }

    static async from_addr(addr: Address, owner: Account) {
        const contract = locklift.factory.getDeployedContract('NftUpgradableForTest', addr);
        return new NftCUBG(contract, owner);
    }

    async getInfo() {
        return (await this.contract.methods.getInfo({answerId: 0}).call());
    }

    async getBla() {
        return (await this.contract.methods.bla({}).call());
    }

    async getNftVersion() {
        return (await this.contract.methods.version({answerId: 0}).call());
    }

    async changeManager(initiator: Account, newManager: Address, sendGasTo: Address, callbacks: CallbackType[], gasValue: any) {
        return await locklift.tracing.trace(this.contract.methods.changeManager({
                newManager,
                sendGasTo: sendGasTo == zeroAddress ? this.owner.address: sendGasTo,
                callbacks
            }).send({
            from: initiator.address,
            amount: gasValue
        }));
    }

    async requestUpgrade(initiator: Account, gasValue: any) {
        return await this.contract.methods
            .requestUpgrade({ sendGasTo: initiator.address })
            .send({
                from: initiator.address,
                amount: gasValue
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
