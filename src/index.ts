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
  guardianAddress,
  openfortSmartAccountImplementation,
  openfortSmartAccountProxy,
} from "./constants";
import assert = require("node:assert");
import { getAccount } from "./openfortSmartAccount";
import { entryPoint06Address } from "viem/account-abstraction";

const figlet = require("figlet");
const program = new Command();

console.log(figlet.textSync("Openfort 7702"));

program
  .name("openfort-7702")
  .description("A simple CLI to explore 7702 with Openfort 4337 Smart Account")
  .version("1.0.0");

program
  .command("get-nonce")
  .description("get authority account transaction count")
  .action(async () => {
    const EOAnonce = await publicClient.getTransactionCount({
      address: authority.address,
    });
    console.log(`EOA nonce = ${EOAnonce}`);
    const openfortSmartAccount = await getAccount(authority);
    const AAnonce = await openfortSmartAccount.getNonce();
    console.log(`4337 nonce = ${AAnonce}`);
  });

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
        entryPoint06Address,
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
  .command("test-send-batch")
  .description("send 4337 wei to alice and bob within the same UserOperation")
  .action(async () => {
    console.log(
      `Sending 4337 wei to alice & bob with EOA ${authority.address} in one UserOperation!`,
    );
    const alice = "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f";
    const bob = "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720";
    const openfortSmartAccount = await getAccount(authority);
    const userOp = await bundlerClient.sendUserOperation({
      account: openfortSmartAccount,
      calls: [
        {
          to: alice,
          value: 4337n,
        },
        {
          to: bob,
          value: 4337n,
        },
      ],
    });
    console.log("User operation hash:", userOp);
  });

program.parse();
