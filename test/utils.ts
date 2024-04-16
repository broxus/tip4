import { FactorySource } from "../build/factorySource";
import { Address, Contract, WalletTypes, toNano, getRandomNonce } from "locklift";
import { Account } from "everscale-standalone-client/nodejs";
import { NftC } from "./wrappers/nft";
import { CollectionWithUpgradableNft } from "./wrappers/collection";
import { expect } from "chai";
import { readFileSync } from "fs";

const logger = require("mocha-logger");


export type AddressN = `0:${string}`
export const isValidEverAddress = (address: string): address is AddressN => /^(?:-1|0):[0-9a-fA-F]{64}$/.test(address);
export declare type CollectionType = Contract<FactorySource["Collection"]>;

export type CallbackType = [Address, {
    value: string | number;
} & {
    payload: string;
}];

export async function sleep(ms = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const deployAccount = async function (key_number = 0, initial_balance = 10) {
    const signer = (await locklift.keystore.getSigner(key_number.toString()))!;
    const { account } = (await locklift.factory.accounts.addNewAccount({
    type: WalletTypes.EverWallet, // or WalletTypes.HighLoadWallet,
    //Value which will send to the new account from a giver
    value: toNano(initial_balance),
    //owner publicKey
    publicKey: signer!.publicKey,
    nonce: getRandomNonce()
    }));

    await locklift.provider.sendMessage({
        sender: account.address,
        recipient: account.address,
        amount: toNano(0.1),
        bounce: false
    });

    const accountBalance = await locklift.provider.getBalance(account.address);
    expect(Number(accountBalance)).to.be.above(0, 'Bad user balance');

    logger.log(`User address: ${account.address.toString()}`);

    return account;
}

export const deployCollectionWithUpgradableNftAndMintNft = async function (account: Account, remainOnNft: 1, pathJsonFile: "metadata-template.json", accForNft: Account[]) {
    const Nft = locklift.factory.getContractArtifacts("NftUpgradable");
    const Index = locklift.factory.getContractArtifacts("Index");
    const IndexBasis = locklift.factory.getContractArtifacts("IndexBasis");
    const Platform = locklift.factory.getContractArtifacts("Platform");
    const signer = await locklift.keystore.getSigner('0');

    remainOnNft = remainOnNft || 0;
    accForNft = accForNft || "";

    let array_json: any;
    const data = readFileSync(pathJsonFile, 'utf8');
    if (data) array_json = JSON.parse(data);

    const { contract: collection } = await locklift.factory.deployContract({
        contract: "CollectionWithUpgradableNft",
        publicKey: (signer?.publicKey) as string,
        constructorParams: {
            codeNft: Nft.code,
            codePlatform: Platform.code,
            codeIndex: Index.code,
            codeIndexBasis: IndexBasis.code,
            owner: account.address,
            remainOnNft: toNano(remainOnNft),
            json: JSON.stringify(array_json.collection)
        },
        initParams: {
            nonce_: locklift.utils.getRandomNonce()
        },
        value: toNano(4)
    });

    logger.log(`Collection address: ${collection.address.toString()}`);

    let nftMinted : NftC[] = [];

    if (array_json.nfts) {
        let ch = 0;
        for (const element of array_json.nfts) {
            let item = {
                "type": "Basic NFT",
                "name": element.name,
                "description": element.description,
                "preview": {
                    "source": element['preview_url'],
                    "mimetype": "image/png"
                },
                "files": [
                    {
                        "source": element.url,
                        "mimetype": "image/png"
                    }
                ],
                "external_url": "https://"
            }
            let payload = JSON.stringify(item);

            await locklift.tracing.trace(
                 collection.methods.mintNft ({
                _owner: accForNft[0].address,
                _json: payload
                 }).send({
                        from: account.address,
                        amount: toNano(6),
                 })
            );

            // console.log('tx:' + tx.id.hash);

            let totalMinted = await collection.methods.totalMinted({ answerId: 0 }).call();
            let nftAddress = await collection.methods.nftAddress({ answerId: 0, id: (Number(totalMinted.count) - 1).toFixed() }).call();
            let nftCN = await NftC.from_addr(nftAddress.nft, accForNft[ch]);
            nftMinted.push(nftCN);
            logger.log(`Nft address: ${nftAddress.nft.toString()} owner: ${accForNft[ch].address.toString()}`);
            ch++;
        }
    }

    return [new CollectionWithUpgradableNft(collection, account), nftMinted] as const;
}
export const deployNFT = async function (account: Account, collection: CollectionType, nft_name: string, nft_description: string, nft_url: string, externalUrl: string, ownerNFT = account) {
    let item = {
        "type": "Basic NFT",
        "name": nft_name,
        "description": nft_description,
        "preview": {
            "source": nft_url,
            "mimetype": "image/png"
        },
        "files": [
            {
                "source": nft_url,
                "mimetype": "image/png"
            }
        ],
        "external_url": externalUrl
    }
    let payload = JSON.stringify(item)

    const collectionNFT = locklift.factory.getDeployedContract("Collection", collection.address);

    await locklift.tracing.trace(
        collectionNFT.methods.mintNft({
            _owner: ownerNFT.address,
            _json: payload
        }).send({
            from: account.address,
            amount: toNano(2)
        }));

    let totalMinted = await collectionNFT.methods.totalMinted({ answerId: 0 }).call();
    let nftAddress = await collectionNFT.methods.nftAddress({ answerId: 0, id: (Number(totalMinted.count) - 1).toFixed() }).call();
    return NftC.from_addr(nftAddress.nft, ownerNFT);
}
