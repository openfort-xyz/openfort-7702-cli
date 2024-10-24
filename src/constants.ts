import dotenv from "dotenv";
import type { Hex, Address } from "viem";
import { odysseyTestnet, anvil } from "viem/chains";

dotenv.config();

// EOA that controls the smart account
export const authorityPrivateKey = process.env.AUTHORITY_PRIVATE_KEY as Hex;
// Smart account Proxy to inject into the EOA
export const openfortSmartAccountProxy = process.env
  .OPENFORT_SMART_ACCOUNT_PROXY as Address;
// Smart account Implementation
export const openfortSmartAccountImplementation = process.env
  .OPENFORT_SMART_ACCOUNT_IMPLEMENTATION as Address;
// Guardian Address
export const guardianAddress = process.env.GUARDIAN_ADDRESS as Address;
export const guardianPrivateKey = process.env.GUARDIAN_PRIVATE_KEY as Hex;

export const network = process.env.NETWORK === "anvil" ? anvil : odysseyTestnet;

export const recoveryPeriod = BigInt(process.env.RECOVERY_PERIOD ?? "172800"); // default 2 days in seconds
export const securityPeriod = BigInt(process.env.SECURITY_PERIOD ?? "129600"); // default 1.5 days in seconds
export const securityWindow = BigInt(process.env.SECURITY_WINDOW ?? "43200"); //  0.5 days in seconds
export const lockPeriod = BigInt(process.env.LOCK_PERIOD ?? "432000"); // default 5 days in seconds
