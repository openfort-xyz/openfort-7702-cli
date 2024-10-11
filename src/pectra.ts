import { defineChain } from "viem";

export const pectra = defineChain({
  id: 7_011_893_082,
  name: "Pectra",
  network: "pectra-devnet",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.pectra-devnet-3.ethpandaops.io"],
    },
  },
});
