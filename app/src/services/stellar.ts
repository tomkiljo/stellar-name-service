import {
  AccountResponse,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  Server,
  Transaction,
  TransactionBuilder,
} from "stellar-sdk";
import {
  DomainResult,
  contractRegister,
  contractSubregister,
  contractTransferStart,
  contractTransferEnd,
} from "./api";

const STELLAR_NETWORK = "TESTNET";
const HORIZON_URL = "https://horizon-testnet.stellar.org";

const server = new Server(HORIZON_URL);

export const registerDomain = async (
  domain: DomainResult,
  signer: Keypair
): Promise<void> => {
  const contractResult = await contractRegister(
    domain.domain,
    signer.publicKey()
  );

  const innerTransaction = new Transaction(
    contractResult.xdr,
    Networks[STELLAR_NETWORK]
  );

  console.log(innerTransaction.memo.value?.toString());
  // renewal doesn't need the users signature
  if (innerTransaction.memo.value?.toString() !== "domain_renew") {
    innerTransaction.sign(signer);
  }

  const transaction = TransactionBuilder.buildFeeBumpTransaction(
    signer,
    BASE_FEE,
    innerTransaction,
    Networks[STELLAR_NETWORK]
  );

  transaction.sign(signer);

  console.log(transaction.toXDR());
  await server.submitTransaction(transaction);
};

export const registerSubdomain = async (
  domain: DomainResult,
  label: string,
  signer: Keypair
): Promise<void> => {
  const contractResult = await contractSubregister(
    domain.domain,
    label,
    signer.publicKey()
  );

  const innerTransaction = new Transaction(
    contractResult.xdr,
    Networks[STELLAR_NETWORK]
  );

  console.log(innerTransaction.memo.value?.toString());

  innerTransaction.sign(signer);

  const transaction = TransactionBuilder.buildFeeBumpTransaction(
    signer,
    BASE_FEE,
    innerTransaction,
    Networks[STELLAR_NETWORK]
  );

  transaction.sign(signer);

  console.log(transaction.toXDR());
  await server.submitTransaction(transaction);
};

export const transferDomainStart = async (
  domain: DomainResult,
  signer: Keypair,
  targetAccount: string
): Promise<void> => {
  const contractResult = await contractTransferStart(
    domain.domain,
    signer.publicKey(),
    targetAccount
  );

  const transaction = new Transaction(
    contractResult.xdr,
    Networks[STELLAR_NETWORK]
  );

  console.log(transaction.memo.value?.toString());

  transaction.sign(signer);

  console.log(transaction.toXDR());
  await server.submitTransaction(transaction);
};
export const transferDomainEnd = async (
  domain: DomainResult,
  signer: Keypair
): Promise<void> => {
  const contractResult = await contractTransferEnd(
    domain.domain,
    signer.publicKey(),
    domain.balanceId!
  );

  const transaction = new Transaction(
    contractResult.xdr,
    Networks[STELLAR_NETWORK]
  );

  console.log(transaction.memo.value?.toString());

  transaction.sign(signer);

  console.log(transaction.toXDR());
  await server.submitTransaction(transaction);
};

export const modifyDomain = async (
  domain: DomainResult,
  signer: Keypair
): Promise<void> => {
  // helper function to determine changes
  const manageData = (
    account: AccountResponse,
    builder: TransactionBuilder,
    name: string,
    value: string | undefined
  ) => {
    const currentValue =
      account.data_attr[name] &&
      Buffer.from(account.data_attr[name], "base64").toString();
    if (currentValue !== value) {
      builder.addOperation(
        Operation.manageData({
          name: name,
          value: value || null,
        })
      );
    }
  };

  const account = await server.loadAccount(signer.publicKey());

  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks[STELLAR_NETWORK],
  });

  manageData(
    account,
    builder,
    "config.sns.account",
    domain.owner?.data.account
  );
  manageData(
    account,
    builder,
    "config.sns.discord",
    domain.owner?.data.discord
  );
  manageData(account, builder, "config.sns.github", domain.owner?.data.github);
  manageData(account, builder, "config.sns.text", domain.owner?.data.text);

  const transaction = builder.setTimeout(0).build();
  if (transaction.operations.length === 0) {
    return;
  }
  transaction.sign(signer);

  console.log(transaction.toXDR());
  await server.submitTransaction(transaction);
};
