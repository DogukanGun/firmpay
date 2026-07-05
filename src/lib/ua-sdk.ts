/**
 * Single import point for the Universal Accounts SDK.
 *
 * The SDK's package.json "exports" map lacks a "types" entry, so TypeScript
 * can't see its bundled declarations through the bare specifier. Runtime
 * resolution must stay on the bare specifier (Next externalizes it), so we
 * import the values untyped and re-type them from the dist declarations.
 */
// @ts-expect-error -- no "types" in the SDK's exports map; typed via cast below
import * as runtime from "@particle-network/universal-account-sdk";
import type * as T from "../../node_modules/@particle-network/universal-account-sdk/dist/index";

const sdk = runtime as typeof T;

export const UniversalAccount = sdk.UniversalAccount;
export const CHAIN_ID = sdk.CHAIN_ID;
export const UA_TRANSACTION_STATUS = sdk.UA_TRANSACTION_STATUS;

export type {
  ITransaction,
  ITransferTransaction,
  IUniversalAccountConfig,
  IAssetsResponse,
  EIP7702Authorization,
} from "../../node_modules/@particle-network/universal-account-sdk/dist/index";
