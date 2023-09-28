import { RestClient, WithdrawRequest } from "okx-api";
import * as dotenv from "dotenv";
import { BigNumber, ethers } from "ethers";

dotenv.config();

const newError = (value) => {
  throw new Error(`${value} missing`);
};

const API_KEY = process.env.API_KEY || newError("API_KEY");
const API_SECRET = process.env.API_SECRET || newError("API_SECRET");
const API_PASS = process.env.API_PASS || newError("API_PASS");
const CURRENCY = process.env.CURRENCY || newError("CURRENCY");
const CHAIN = process.env.CHAIN || newError("CHAIN");
const FEE = process.env.FEE || newError("FEE");
const RPC_URL = process.env.RPC_URL || newError("RPC_URL");

const client = new RestClient(
  {
    apiKey: API_KEY,
    apiSecret: API_SECRET,
    apiPass: API_PASS,
  },
  "prod"
);

async function sendFundsToWallet(
  address,
  amount,
  whitelistedWallets
): Promise<number | null> {
  const normalizedWalletAddress = address.toLowerCase();
  if (!whitelistedWallets.includes(normalizedWalletAddress)) {
    throw new Error("Withdrawal to non-whitelisted wallet is not allowed.");
  }

  const withdrawRequest: WithdrawRequest = {
    amt: amount.toString(),
    fee: FEE.toString(),
    dest: "4",
    toAddr: address,
    ccy: CURRENCY,
    chain: `${CURRENCY}-${CHAIN}`,
  };
  try {
    await client.submitWithdraw(withdrawRequest);
  } catch (e) {
    console.log(e);
  }
  return 0;
}

const sendCcyToOkxSubAcc = async (
  walletPk,
  subAccAddress,
  amount
) => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(walletPk, provider);

    const tx = await wallet.sendTransaction({
      to: subAccAddress,
      value: amount,
    });

    await tx.wait();
  } catch (err) {
    console.error(err);
  }
};
