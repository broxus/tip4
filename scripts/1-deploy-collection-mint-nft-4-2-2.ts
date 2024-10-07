import { Migration } from "./migration";
import { BigNumber } from "bignumber.js";
import { readFileSync } from "fs";
import prompts from "prompts";
import { Address } from "locklift";

const migration = new Migration();

export type AddressN = `0:${string}`;
export const isValidEverAddress = (address: string): address is AddressN =>
  /^(?:-1|0):[0-9a-fA-F]{64}$/.test(address);

async function main() {
  const signer = await locklift.keystore.getSigner("0");
  const account = await migration.loadAccount("Account1");

  const response = await prompts([
    {
      type: "text",
      name: "owner",
      message: "Get Collection Owner Address (default " + account.address + ")",
      validate: (value: any) =>
        isValidEverAddress(value) || value === ""
          ? true
          : "Invalid Everscale address",
    },
    {
      type: "text",
      name: "collectionUrl",
      message: "Get collectionUrl to Collection metadata"
    },
    {
      type: "text",
      name: "baseNftUrl",
      message: "Get baseNftUrl to metadata"
    },
    {
      type: "number",
      name: "count",
      message: "Get count nft for mint"
    },
  ]);

  const requiredGas = new BigNumber(response.count)
    .times(3.4)
    .plus(5)
    .shiftedBy(9);
  const balanceStart = await locklift.provider.getBalance(account.address);

  if (requiredGas.gt(balanceStart)) {
    throw Error(
      "NOT ENOUGH BALANCE ON " +
        account.address +
        ". REQUIRES: " +
        requiredGas.shiftedBy(-9).toString() +
        " EVER"
    );
  }

  const Nft = locklift.factory.getContractArtifacts("Nft_TIP4_2_2");
  const Index = locklift.factory.getContractArtifacts("Index");
  const IndexBasis = locklift.factory.getContractArtifacts("IndexBasis");

  console.log("Start deploy collection");

  const { contract: collection } = await locklift.factory.deployContract({
    contract: "Collection_TIP4_2_2",
    publicKey: signer?.publicKey as string,
    constructorParams: {
      codeNft: Nft.code,
      codeIndex: Index.code,
      codeIndexBasis: IndexBasis.code,
      owner: account.address,
      remainOnNft: locklift.utils.toNano(0.2),
      baseNftUrl: response.baseNftUrl,
      collectionUrl: response.collectionUrl
    },
    initParams: {
      nonce_: locklift.utils.getRandomNonce(),
    },
    value: locklift.utils.toNano(4),
  });

  // const collection = (await locklift.factory.getDeployedContract('Collection', new Address('0:432da1db5a47e400ab62570938ec95310610fa483483b3fd7fa25db98cd144e0')));
  console.log("Collection", collection.address);
  migration.store(collection, "Collection_TIP_4_2_2");

  let address_list;
  const data = readFileSync("address.json", "utf8");
  if (data) address_list = JSON.parse(data);
  console.log(address_list)
  console.log(address_list[0])

  for (let i=0; i < address_list.length; i++) {

    let address = account.address
    if (address_list.length > 0) {
      address = new Address(address_list[i])
    }
    await collection.methods
        .mintNft({
          _owner: address
        }).send({
          from: account.address,
          amount: locklift.utils.toNano(5),
        });

      //console.log(` Tx: ${tx.transaction.id}`)
    }

  if (response.owner) {
    console.log(`Transfer ownership for collection`);
    await collection.methods
      .transferOwnership({
        newOwner: response.owner,
      })
      .send({
        from: account.address,
        amount: locklift.utils.toNano(1),
      });
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
