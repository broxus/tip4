import { toNano, getRandomNonce } from 'locklift';
import JsonTemplate from '../metadata-template.json';

export default async (): Promise<void> => {
  const owner = locklift.deployments.getAccount('OwnerWallet');

  const IndexCode = locklift.factory.getContractArtifacts('Index').code;
  const IndexBasisCode =
    locklift.factory.getContractArtifacts('IndexBasis').code;
  const NftCode = locklift.factory.getContractArtifacts('Nft').code;

  await locklift.deployments.deploy({
    deployConfig: {
      contract: 'Collection',
      publicKey: owner.signer.publicKey,
      initParams: { nonce_: getRandomNonce() },
      constructorParams: {
        codeNft: NftCode,
        codeIndex: IndexCode,
        codeIndexBasis: IndexBasisCode,
        owner: owner.account.address,
        remainOnNft: toNano(0.2),
        json: JSON.stringify(JsonTemplate.collection),
      },
      value: toNano(2),
    },
    deploymentName: 'Collection',
    enableLogs: true,
  });
};

export const tag = 'collection';

export const dependencies = ['owner-wallet'];
