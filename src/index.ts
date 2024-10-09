import { walletClient, bundlerClient, publicClient } from "./clients";
import {
  hashAuthorization,
  recoverAuthorizationAddress,
} from "viem/experimental";
import type { SignedAuthorization } from "viem/experimental";
// src/cli.js
import { Command } from "commander";
import { authority } from "./account";
import { encodeFunctionData, parseAbi, parseSignature } from "viem";
import { sendTransaction } from "viem/actions";
import { anvil } from "viem/chains";
import { openfortSmartAccount } from "./constants";
import assert = require("node:assert");

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
    openfortSmartAccount,
  )
  .action(async ({ address: delegationDesignator }) => {
    console.log("walletClient.account.address", walletClient.account.address);
    console.log("delegationDesignator", delegationDesignator);
    const nonce = await publicClient.getTransactionCount({
      address: walletClient.account.address,
    });
    console.log("nonce", nonce);
    const authorization = hashAuthorization({
      contractAddress: delegationDesignator,
      chainId: anvil.id,
      nonce: nonce,
    });
    console.log("Authorization hash:", authorization);
  });

program
  .command("sign-authorization")
  .description("sign 7702 authorization hash")
  .requiredOption("-h, --hash <hash>", "authorization hash")
  .action(async ({ hash }) => {
    const nonce = await publicClient.getTransactionCount({
      address: walletClient.account.address,
    });
    console.log("nonce", nonce);
    const authorization = {
      contractAddress: openfortSmartAccount as `0x${string}`,
      chainId: anvil.id,
      nonce: nonce,
    };
    const signature = await authority.sign({
      hash: hash,
    });
    const custodianSignature =
      await walletClient.signAuthorization(authorization);
    console.log("custodianSignature", custodianSignature);

    const recoveredAddress = await recoverAuthorizationAddress({
      authorization: {
        ...authorization,
        ...parseSignature(signature),
      },
    });

    const custodianRecoveredAddress = await recoverAuthorizationAddress({
      authorization: {
        ...authorization,
        ...custodianSignature,
      },
    });
    console.log("Recovered Address:", recoveredAddress);
    console.log("Custodian Recovered Address:", custodianRecoveredAddress);
    console.log("Signature:", signature);
  });

program
  .command("activate-delegation")
  .description("send a 7702 delegation transaction")
  .requiredOption("-s, --signature <signature>", "signature")
  .requiredOption(
    "-a, --address <address>",
    "delegation designator",
    openfortSmartAccount,
  )
  .action(async ({ signature, address: delegationDesignator }) => {
    console.log("delegationDesignator", delegationDesignator);
    console.log("accountaddress", walletClient.account.address);

    const signatureData = parseSignature(signature);
    const nonce = await publicClient.getTransactionCount({
      address: walletClient.account.address,
    });

    console.log("nonce", nonce);
    console.log("signatureData", signatureData);

    const authorization: SignedAuthorization = {
      contractAddress: delegationDesignator,
      chainId: anvil.id,
      nonce: nonce,
      ...parseSignature(signature),
    };

    // DEBUG Assertion=
    const recoveredAuthorizationAddress = await recoverAuthorizationAddress({
      authorization,
    });
    console.log("recoveredAuthorizationAddress", recoveredAuthorizationAddress);
    console.log("walletClient.account.address", walletClient.account.address);

    assert(
      recoveredAuthorizationAddress === walletClient.account.address,
      "Recovered authorization address does not match authority address",
    );

    try {
      const hash = await sendTransaction(publicClient, {
        account: authority,
        authorizationList: [authorization],
        data: encodeFunctionData({
          abi: parseAbi(["function owner() view returns (address)"]),
          functionName: "owner",
          args: [],
        }),
        to: authority.address,
      });
      console.log("Transaction sent:", hash);
      // const receipt = await getTransactionReceipt(publicClient, { hash })
      // console.log("Authority Address", receipt)
    } catch (error) {
      console.error("Error:", error);
    }
  });

program.parse();
