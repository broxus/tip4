import { toNano, getRandomNonce } from 'locklift';

export default async (): Promise<void> => {
  const owner = locklift.deployments.getAccount('OwnerWallet');

  await locklift.deployments.deploy({
    deployConfig: {
      contract: 'CallbacksTest',
      publicKey: owner.signer.publicKey,
      initParams: { _nonce: getRandomNonce() },
      constructorParams: {},
      value: toNano(2),
    },
    deploymentName: 'CallbacksTest',
    enableLogs: true,
  });
};

export const tag = 'callbacks';
