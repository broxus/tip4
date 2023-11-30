import { Migration } from "./migration";
import prompts from "prompts";

const migration = new Migration();

export type AddressN = `0:${string}`;
export const isValidEverAddress = (address: string): address is AddressN =>
  /^(?:-1|0):[0-9a-fA-F]{64}$/.test(address);

async function main() {
  const response = await prompts([
    {
      type: "text",
      name: "owner",
      message: "Collection new owner address",
      validate: (value: string) =>
        isValidEverAddress(value) ? true : "Invalid Everscale address",
    },
  ]);
  const account = await migration.loadAccount("Account1");
  const collection = migration.loadContract("Collection", "SimilarCollection");

  if (response.owner) {
    await locklift.transactions.waitFinalized(
      collection.methods
        .transferOwnership({
          newOwner: response.owner,
        })
        .send({
          from: account.address,
          amount: locklift.utils.toNano(1),
        })
    );
    console.log("Transfer ownership to: " + response.owner);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
