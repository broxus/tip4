import { toNano } from 'locklift';

import JsonTemplate from '../metadata-template.json';
import { CollectionAbi } from '../build/factorySource';

export default async (): Promise<void> => {
  const owner = locklift.deployments.getAccount('OwnerWallet');
  const user = locklift.deployments.getAccount('UserWallet');
  const collection = locklift.deployments.getContract<CollectionAbi>('Collection');

  const { traceTree } = await locklift.tracing.trace(
    collection.methods
      .mintNft({
        _owner: user.account.address,
        _json: JSON.stringify(JsonTemplate.nfts[0]),
      })
      .send({ from: owner.account.address, amount: toNano(5) })
  );

  const nftAddress = traceTree
    ?.findEventsForContract({
      contract: collection,
      name: 'NftCreated' as const
    })[0].nft;

  if (nftAddress) {
    console.log(`Contract Nft deployed, address: ${nftAddress}, deploymentName: Nft`);

    await locklift.deployments.saveContract({
      deploymentName: 'Nft',
      address: nftAddress,
      contractName: 'Nft',
    });
  }
};

export const tag = 'nft';

export const dependencies = ['collection'];
