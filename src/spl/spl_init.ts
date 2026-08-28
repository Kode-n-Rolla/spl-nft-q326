import {
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  assertIsTransactionMessageWithBlockhashLifetime,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import {
  getInitializeMintInstruction,
  getMintSize,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import { getCreateAccountInstruction } from "@solana-program/system";

//import your wallet
import wallet from "../../devnet-wallet.json";

const rpc = createSolanaRpc("https://api.devnet.solana.com");

const rpcSubscriptions = createSolanaRpcSubscriptions(
  "wss://api.devnet.solana.com",
);

(async () => {
  try {
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(wallet));
    const mint = await generateKeyPairSigner();

    console.log(`Wallet: ${signer.address}`);
    console.log(`Mint: ${mint.address}`);

    const space = BigInt(getMintSize());
    const rent = await rpc.getMinimumBalanceForRentExemption(space).send();

    // 1st instuction: create mint account
    const createAccountIx = getCreateAccountInstruction({
      payer: signer,
      newAccount: mint,
      lamports: rent,
      space,
      programAddress: TOKEN_PROGRAM_ADDRESS,
    });

    // 2nd instruction: init mint
    const initializeMintIx = getInitializeMintInstruction({
      mint: mint.address,
      decimals: 6,
      mintAuthority: signer.address,
      freezeAuthority: signer.address,
    });

    // Make a transaction
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    const msg = createTransactionMessage({ version: 0 });
    const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);
    const msgWithLifeTime = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, msgWithPayer);

    const txMsg = appendTransactionMessageInstructions(
      [createAccountIx, initializeMintIx],
      msgWithLifeTime,
    );
    const signerTx = await signTransactionMessageWithSigners(txMsg);
    assertIsTransactionWithBlockhashLifetime(signerTx);

    const signature = getSignatureFromTransaction(signerTx);
    const sendAndConfirm = sendAndConfirmTransactionFactory({rpc, rpcSubscriptions});

    await sendAndConfirm(signerTx, {commitment: "confirmed"});

    console.log(`mint address: ${mint.address}`);
    console.log(`signature: ${signature}`);
  } catch (error) {
    console.log(error);
  }
})();
