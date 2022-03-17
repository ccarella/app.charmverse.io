import { useEffect, useState } from 'react';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import Safe from '@gnosis.pm/safe-core-sdk';
import EthersAdapter from '@gnosis.pm/safe-ethers-lib';
import { switchActiveNetwork } from '../BountyPaymentButton';

export default function useSafe ({ chainId, safeAddress }: { chainId: number, safeAddress: string }) {

  const [safe, setSafe] = useState<Safe | null>(null);
  const { account, library } = useWeb3React();

  async function loadSafe () {
    await switchActiveNetwork(chainId);
    const signer = await library.getSigner(account);
    const ethAdapterOwner1 = new EthersAdapter({
      ethers,
      signer
    });
    const _safe = await Safe.create({ ethAdapter: ethAdapterOwner1, safeAddress });
    return _safe;
  }

  useEffect(() => {
    if (safeAddress && account) {
      loadSafe().then(setSafe);
    }
  }, [safeAddress, account]);

  return safe;
}
