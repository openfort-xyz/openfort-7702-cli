import dotenv from "dotenv";
import type { Hex, Address } from "viem";

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
