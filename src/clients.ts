import { createPublicClient, createWalletClient, http } from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import { network } from "./constants";

export const publicClient = createPublicClient({
  chain: network,
  transport: http(),
});

export const walletClient = createWalletClient({
  chain: network,
  transport: http(),
});

export const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http("http://localhost:4337"),
});
