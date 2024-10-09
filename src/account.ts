import { privateKeyToAccount } from "viem/accounts";
import { authorityPrivateKey } from "./constants";

export const authority = privateKeyToAccount(authorityPrivateKey);
