import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import wallet from "../../devnet-wallet.json";
import {
  createSignerFromKeypair,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { fetchAsset, mplCore, update } from "@metaplex-foundation/mpl-core";
import { base58 } from "@metaplex-foundation/umi/serializers";

const umi = createUmi(
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
);

const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(signerIdentity(signer));
umi.use(mplCore());

(async () => {
  try {
    const assetAddress = publicKey(
      "64P5QgcPxibMg4n9p9TCaqJN36nGbMSeLwTVw7j5kFuv",
    );

    const newMetadataUri = "https://gateway.irys.xyz/4Lv6W9ndzazvN3qvRyZAHock8GHsM5FsJ1n22s8NanP6";
    const newName = "Updated Solana NFT practice";

    const asset = await fetchAsset(umi, assetAddress);

    const tx = await update(umi, {
      asset,
      name: newName,
      uri: newMetadataUri,
      authority: signer,
    }).sendAndConfirm(umi);

    const signature = base58.deserialize(tx.signature)[0];

    console.log(`update signature: ${signature}`);
    console.log(`asset: ${asset.publicKey}`);
    console.log(`new name: ${newName}`);
    console.log(`new metadata uri: ${newMetadataUri}`);
  } catch (e) {
    console.log(`error ${e}`);
  }
})();