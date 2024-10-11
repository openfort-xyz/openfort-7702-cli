import { publicClient, bundlerClient } from "./clients";
import {
  hashAuthorization,
  recoverAuthorizationAddress,
} from "viem/experimental";
import type { SignedAuthorization } from "viem/experimental";
import { Command } from "commander";
import { authority } from "./account";
import { encodeFunctionData, parseAbi, parseSignature } from "viem";
import { sendTransaction } from "viem/actions";
import { anvil } from "viem/chains";

import {
  entryPointV7,
  guardianAddress,
  openfortSmartAccountImplementation,
  openfortSmartAccountProxy,
} from "./constants";
import assert = require("node:assert");
import { getAccount } from "./openfortSmartAccount";

const figlet = require("figlet");
const program = new Command();

console.log(figlet.textSync("Openfort 7702"));

program
  .name("openfort-7702")
  .description("A simple CLI to explore 7702 with Openfort 4337 Smart Account")
  .version("1.0.0");

program
  .command("get-authorization-hash")
  .description("get 7702 authorization hash")
  .option(
    "-a, --address <address>",
    "delegation designator",
    openfortSmartAccountProxy,
  )
  .action(async ({ address: delegationDesignator }) => {
    const nonce = await publicClient.getTransactionCount({
      address: authority.address,
    });

    const authorization = hashAuthorization({
      contractAddress: delegationDesignator,
      chainId: anvil.id,
      nonce: nonce + 1,
    });
    console.log("Authorization hash:", authorization);
  });

program
  .command("sign-authorization")
  .description("sign 7702 authorization hash")
  .requiredOption("-h, --hash <hash>", "authorization hash")
  .action(async ({ hash }) => {
    const signature = await authority.sign({
      hash: hash,
    });
    console.log("Signature:", signature);
  });

program
  .command("activate-delegation")
  .description("send a 7702 delegation transaction")
  .requiredOption("-s, --signature <signature>", "signature")
  .requiredOption(
    "-a, --address <address>",
    "delegation designator",
    openfortSmartAccountProxy,
  )
  .action(async ({ signature, address: delegationDesignator }) => {
    const nonce = await publicClient.getTransactionCount({
      address: authority.address,
    });

    const authorization: SignedAuthorization = {
      contractAddress: delegationDesignator,
      chainId: anvil.id,
      nonce: nonce + 1,
      ...parseSignature(signature),
    };

    const recoveredAuthorizationAddress = await recoverAuthorizationAddress({
      authorization,
    });

    assert(
      recoveredAuthorizationAddress === authority.address,
      "Recovered authorization address does not match authority address",
    );

    const data = encodeFunctionData({
      abi: parseAbi([
        "function initializeAccount(address,address,uint256,uint256,uint256,uint256,address)",
      ]),
      args: [
        openfortSmartAccountImplementation,
        entryPointV7,
        172800n,
        129600n,
        43200n,
        432000n,
        guardianAddress,
      ],
    });

    const hash = await sendTransaction(publicClient, {
      account: authority,
      authorizationList: [authorization],
      data: data,
      to: authority.address,
    });
    console.log("Transaction sent:", hash);
  });

program
  .command("send-batch")
  .description("send a batch transaction with EOA")
  .action(async () => {
    console.log("Sending batch transaction...");
    const alice = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const bob = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const openfortSmartAccount = await getAccount(authority);

    const userOp = await bundlerClient.prepareUserOperation({
      account: openfortSmartAccount,
      calls: [
        {
          to: alice,
          value: 4242n,
        },
        {
          to: bob,
          value: 1337n,
        },
      ],
    });
    // const userOp = bundlerClient.sendUserOperation({
    //   account: openfortSmartAccount,
    //   calls: [
    //     {
    //       to: alice,
    //       value: 4242n,
    //     },
    //     {
    //       to: bob,
    //       value: 1337n,
    //     },
    //   ],
    // });
    console.log("User operation:", userOp);
  });

program.parse();
