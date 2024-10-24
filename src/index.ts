import { publicClient, walletClient, bundlerClient } from "./clients";
import {
  hashAuthorization,
  recoverAuthorizationAddress,
} from "viem/experimental";
import type { SignedAuthorization } from "viem/experimental";
import { Command } from "commander";
import { authority } from "./account";
import { encodeFunctionData, parseAbi, parseSignature } from "viem";
import { sendTransaction } from "viem/actions";
import { network } from "./constants";

import {
  guardianAddress,
  guardianPrivateKey,
  openfortSmartAccountImplementation,
  openfortSmartAccountProxy,
  recoveryPeriod,
  securityPeriod,
  securityWindow,
  lockPeriod,
} from "./constants";
import assert = require("node:assert");
import { getAccount } from "./openfortSmartAccount";
import {
  entryPoint06Address,
  getUserOperationHash,
} from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { signTypedData } from "viem/accounts";

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
    console.log("authority address:", authority.address);
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
      chainId: network.id,
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
      chainId: network.id,
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
        recoveryPeriod,
        securityPeriod,
        securityWindow,
        lockPeriod,
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
  .description("send 4337 wei to alice and bob within the same UserOperation")
  .option("-s, --signer <signer>", "signer")
  .action(async ({ signer }) => {
    console.log(
      `Sending 4337 wei to alice & bob from EOA ${authority.address} in one UserOperation!`,
    );
    const alice = "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f";
    const bob = "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720";
    const openfortAccount = await getAccount(authority);
    // If session key is provided, we sign the UserOperation with the session key
    if (signer) {
      const signerAccount = privateKeyToAccount(signer);
      console.log("Signing UserOperation with signer", signerAccount.address);
      const unsignedUserOp = await bundlerClient.prepareUserOperation({
        account: openfortAccount,
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
      const userOpHash = await getUserOperationHash({
        chainId: network.id,
        entryPointAddress: entryPoint06Address,
        entryPointVersion: "0.6",
        userOperation: {
          ...(unsignedUserOp as any),
          sender: openfortAccount.address,
        },
      });
      const signature = await signerAccount.signMessage({
        message: { raw: userOpHash },
      });
      const hash = await bundlerClient.sendUserOperation({
        ...unsignedUserOp,
        signature,
      });
      console.log("User operation hash:", hash);
    }

    // If no session key is provided, we sign the UserOperation with authority EOA
    // owner of the smart accoubt
    else {
      console.log("Signing UserOperation with smart account owner (authority)");
      const userOp = await bundlerClient.sendUserOperation({
        account: openfortAccount,
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
    }
  });

program
  .command("recover-account")
  .description("recover a 7702-delegated EOA")
  .requiredOption("-n, --new-owner <new-owner>", "new owner account address")
  .action(async ({ newOwner }) => {
    const guardian = privateKeyToAccount(guardianPrivateKey);
    const openfortAccount = await getAccount(authority);

    // Start the recovery process
    const hash = await walletClient.sendTransaction({
      account: guardian,
      to: openfortAccount.address,
      data: encodeFunctionData({
        abi: parseAbi(["function startRecovery(address)"]),
        args: [newOwner],
      }),
    });

    console.log("Recovery Started:", hash);
    // Get EIP712 domain
    const domainData = await publicClient.readContract({
      address: openfortAccount.address,
      abi: parseAbi([
        "function eip712Domain() view returns (bytes1, string, string, uint256, address, bytes32, uint256[])",
      ]),
      functionName: "eip712Domain",
    });

    const [, name, version, chainId, verifyingContract] = domainData;

    console.log("name", name);
    console.log("version", version);
    console.log("chainId", chainId);
    console.log("verifyingContract", verifyingContract);

    // Get recovery details
    const recoveryDetails = await publicClient.readContract({
      address: openfortAccount.address,
      abi: parseAbi([
        "function recoveryDetails() view returns (address, uint256, uint256)",
      ]),
      functionName: "recoveryDetails",
    });

    const [, executeAfter, guardiansRequired] = recoveryDetails;

    console.log("executeAfter", executeAfter);
    console.log("guardiansRequired", guardiansRequired);

    // Use the defined type for the domain object
    const domain: Record<string, any> = {
      name,
      version,
      chainId,
      verifyingContract,
    };

    const types = {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      Recover: [
        { name: "recoveryAddress", type: "address" },
        { name: "executeAfter", type: "uint64" },
        { name: "guardiansRequired", type: "uint32" },
      ],
    };

    const message = {
      recoveryAddress: newOwner,
      executeAfter,
      guardiansRequired,
    };

    const signature = await signTypedData({
      privateKey: guardianPrivateKey,
      domain,
      types,
      primaryType: "Recover",
      message,
    });

    console.log("Signature:", signature);
    console.log(`Mining ${recoveryPeriod} blocks to pass the recovery period`);
    // Mine blocks to pass the recovery period
    for (let i = 0; i < Number(recoveryPeriod); i++) {
      await publicClient.request({
        method: "evm_mine" as any,
        params: undefined,
      });
    }

    const confirmRecoveryHash = await walletClient.sendTransaction({
      account: guardian,
      to: openfortAccount.address,
      data: encodeFunctionData({
        abi: parseAbi(["function completeRecovery(bytes[])"]),
        args: [[signature]],
      }),
    });
    console.log("Recovery Confirmed:", confirmRecoveryHash);
  });

program.parse();
