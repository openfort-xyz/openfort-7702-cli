import { createPublicClient, createWalletClient, http } from "viem";
import { eip7702Actions } from "viem/experimental";
import { createBundlerClient } from "viem/account-abstraction";
import { authority } from "./account";
import { anvil } from "viem/chains";

export const publicClient = createPublicClient({
  chain: anvil,
  transport: http(),
});

export const walletClient = createWalletClient({
  account: authority,
  chain: anvil,
  transport: http(),
}).extend(eip7702Actions());

export const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http("http://localhost:4337"),
});
