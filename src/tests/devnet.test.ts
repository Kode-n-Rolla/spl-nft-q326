import assert from "node:assert/strict";
import test from "node:test";

import { fetchAsset, mplCore } from "@metaplex-foundation/mpl-core";
import { publicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

const RPC_URL = "https://api.devnet.solana.com";

const WALLET = "HBFKdPmohanDBA7z8yw4ELGNF5XQapnEwvC3F5XzRcu2";

const TOKEN_MINT = "ALs1JR47hDubCQPx3DgdRNshGvhQ8uJ9EEJCg3mF4akB";

const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

const RECIPIENT = "9EUd4VNcjMAysd7zQk3Q1a4tb28BYndLNBAQDiYnHJ64";

const TRANSFER_SIGNATURE =
  "5DAaZSzgg1tEDro49jTjWSjp7cTNwnVmQUcRCtDVvPAykGo2ts7cU3Zu1YHebTkcFNoJUqbS5vSK8Em4qQ8gSytc";

const NFT_ADDRESS = "64P5QgcPxibMg4n9p9TCaqJN36nGbMSeLwTVw7j5kFuv";

const NFT_NAME = "Updated Solana NFT practice";

const NFT_METADATA_URI =
  "https://gateway.irys.xyz/4Lv6W9ndzazvN3qvRyZAHock8GHsM5FsJ1n22s8NanP6";

const NFT_DESCRIPTION =
  "Updated description and Practice from Turbin3 session. How to update NFT metadata.";

  type RpcResponse<T> = {
  jsonrpc: "2.0";
  result?: T;
  error?: {
    code: number;
    message: string;
  };
};

async function callRpc<T>(
  method: string,
  params: unknown[],
): Promise<T> {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  assert.equal(
    response.ok,
    true,
    `RPC returned HTTP ${response.status}`,
  );

  const body = (await response.json()) as RpcResponse<T>;

  if (body.error !== undefined) {
    throw new Error(
      `RPC error ${body.error.code}: ${body.error.message}`,
    );
  }

  if (body.result === undefined) {
    throw new Error("RPC result is missing");
  }

  return body.result;
}

type MintAccountResult = {
  value: {
    owner: string;
    data: {
      program: string;
      parsed: {
        type: string;
        info: {
          decimals: number;
          mintAuthority: string | null;
          supply: string;
        };
      };
    };
  } | null;
};

test("SPL mint has the expected configuration", async () => {
  const result = await callRpc<MintAccountResult>(
    "getAccountInfo",
    [
      TOKEN_MINT,
      {
        commitment: "confirmed",
        encoding: "jsonParsed",
      },
    ],
  );

  if (result.value === null) {
    throw new Error("Mint account does not exist");
  }

  const account = result.value;

  assert.equal(account.owner, TOKEN_PROGRAM);
  assert.equal(account.data.program, "spl-token");
  assert.equal(account.data.parsed.type, "mint");
  assert.equal(account.data.parsed.info.decimals, 6);
  assert.equal(account.data.parsed.info.mintAuthority, WALLET);

  assert.equal(
    account.data.parsed.info.supply,
    "10000000",
    "Expected a supply of 10 tokens with 6 decimals",
  );
});

type TokenBalance = {
  mint: string;
  owner?: string;
  uiTokenAmount: {
    amount: string;
    decimals: number;
  };
};

type TransactionResult = {
  meta: {
    err: unknown;
    preTokenBalances?: TokenBalance[];
    postTokenBalances?: TokenBalance[];
  };
} | null;

test("SPL transfer sent one token to the recipient", async () => {
  const transaction = await callRpc<TransactionResult>(
    "getTransaction",
    [
      TRANSFER_SIGNATURE,
      {
        commitment: "confirmed",
        encoding: "jsonParsed",
        maxSupportedTransactionVersion: 0,
      },
    ],
  );

  if (transaction === null) {
    throw new Error("Transaction was not found");
  }

  assert.equal(transaction.meta.err, null, "Transaction failed");

  const before = transaction.meta.preTokenBalances?.find(
    (balance) =>
      balance.mint === TOKEN_MINT &&
      balance.owner === RECIPIENT,
  );

  const after = transaction.meta.postTokenBalances?.find(
    (balance) =>
      balance.mint === TOKEN_MINT &&
      balance.owner === RECIPIENT,
  );

  if (after === undefined) {
    throw new Error("Recipient token balance was not found");
  }

  const amountBefore = BigInt(
    before?.uiTokenAmount.amount ?? "0",
  );

  const amountAfter = BigInt(after.uiTokenAmount.amount);

  assert.equal(after.uiTokenAmount.decimals, 6);

  assert.equal(
    amountAfter - amountBefore,
    1_000_000n,
    "Recipient should receive exactly one token",
  );
});

const umi = createUmi(RPC_URL).use(mplCore());

test("MPL Core NFT has the expected owner and updated fields", async () => {
  const asset = await fetchAsset(
    umi,
    publicKey(NFT_ADDRESS),
  );

  assert.equal(asset.publicKey.toString(), NFT_ADDRESS);
  assert.equal(asset.owner.toString(), WALLET);
  assert.equal(asset.name, NFT_NAME);
  assert.equal(asset.uri, NFT_METADATA_URI);
});

type NftMetadata = {
  name?: unknown;
  description?: unknown;
  image?: unknown;
};

test("NFT metadata contains the updated values", async () => {
  const response = await fetch(NFT_METADATA_URI);

  assert.equal(
    response.ok,
    true,
    `Metadata returned HTTP ${response.status}`,
  );

  const metadata = (await response.json()) as NftMetadata;

  assert.equal(metadata.name, NFT_NAME);
  assert.equal(metadata.description, NFT_DESCRIPTION);
  assert.equal(typeof metadata.image, "string");
  assert.notEqual(metadata.image, "");
});
