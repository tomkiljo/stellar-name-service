import BigNumber from "bignumber.js";
import {
  Asset,
  AuthClawbackEnabledFlag,
  AuthImmutableFlag,
  AuthRequiredFlag,
  AuthRevocableFlag,
  Keypair,
  Memo,
  Networks,
  Operation,
  Server,
  Transaction,
  TransactionBuilder,
} from "stellar-sdk";
import { isValidDomain, lookupDomainNft, lookupDomainOwner } from "../lookup";
import { Environment } from "../server";

const STROOP = "0.0000001";

type RegisterRequest = {
  domain: string;
  userAccount: string;
};

const register = async (
  req: RegisterRequest,
  env: Environment
): Promise<string> => {
  const { domain, userAccount } = req;

  if (!isValidDomain(domain)) {
    throw new Error(`Illegal domain ${domain}`);
  }

  const existing = await lookupDomainNft(domain, env);
  const owner = existing && (await lookupDomainOwner(existing, env));
  const userIsOwner = userAccount === owner?.account_id;

  if (existing) {
    const epochSeconds = Math.floor(Date.now() / 1000);
    if (!userIsOwner && existing.expires > epochSeconds) {
      throw new Error("Domain already exists and has not expired");
    }
  }

  const server = new Server(env.HORIZON_URL);
  const registrarAccount = env.REGISTRAR_ACCOUNT;
  const registrar = await server.loadAccount(registrarAccount);

  // Sequence number is payed by the registrar account to prevent overlapping domain registrations.
  // Fee is set to zero requiring the user to submit the transaction in a fee bump transaction and pay for the fee.
  const builder = new TransactionBuilder(registrar, {
    fee: "0",
    networkPassphrase: Networks[env.STELLAR_NETWORK],
  });

  // Calculate expiration time for the domain
  const expires = new BigNumber(Math.floor(Date.now() / 1000))
    .plus(env.DOMAIN_EXPIRATION)
    .toString();

  let transaction: Transaction;

  // Domain has not been previously registered
  if (!existing) {
    const domainKeypair = Keypair.random();
    const domainAccount = domainKeypair.publicKey();
    const domainNFT = new Asset("Domain", domainKeypair.publicKey());

    transaction = builder
      .addOperation(
        Operation.createAccount({
          source: userAccount,
          destination: domainAccount,
          startingBalance: "2.5", // base reserve + two data entries + additional signer
        })
      )
      .addOperation(
        Operation.setOptions({
          source: domainKeypair.publicKey(),
          // @ts-ignore Typescript typing do not allow multiple flags
          setFlags:
            AuthRequiredFlag |
            AuthRevocableFlag |
            AuthImmutableFlag |
            AuthClawbackEnabledFlag,
          signer: {
            ed25519PublicKey: registrarAccount,
            weight: 1,
          },
          masterWeight: 0,
        })
      )
      .addOperation(
        Operation.manageData({
          source: domainAccount,
          name: "domain",
          value: domain,
        })
      )
      .addOperation(
        Operation.manageData({
          source: domainAccount,
          name: "expires",
          value: expires,
        })
      )
      .addOperation(
        Operation.changeTrust({
          source: userAccount,
          asset: domainNFT,
          limit: STROOP,
        })
      )
      .addOperation(
        Operation.setTrustLineFlags({
          source: domainAccount,
          trustor: userAccount,
          asset: domainNFT,
          flags: {
            authorized: true,
          },
        })
      )
      .addOperation(
        Operation.payment({
          source: domainAccount,
          destination: userAccount,
          asset: domainNFT,
          amount: STROOP,
        })
      )
      .addOperation(
        Operation.setTrustLineFlags({
          source: domainAccount,
          trustor: userAccount,
          asset: domainNFT,
          flags: {
            authorized: false,
          },
        })
      )
      .addMemo(Memo.text("domain_create"))
      .setTimeout(0)
      .build();

    // sign with the generated issuer keypair this one time
    transaction.sign(domainKeypair);
  }
  // Domain exists and the owner renews expiration time
  else if (userIsOwner) {
    const domainAccount = existing.asset.getIssuer();

    transaction = builder
      .addOperation(
        Operation.manageData({
          source: domainAccount,
          name: "expires",
          value: expires,
        })
      )
      .addMemo(Memo.text("domain_renew"))
      .setTimeout(0)
      .build();
  }
  // Domain exists but has expired, transfer to new owner
  else {
    const ownerAccount = owner.account_id;
    const domainAccount = existing.asset.getIssuer();
    const domainNFT = existing.asset;

    transaction = builder
      .addOperation(
        Operation.manageData({
          source: domainAccount,
          name: "expires",
          value: expires,
        })
      )
      .addOperation(
        Operation.clawback({
          source: domainAccount,
          from: ownerAccount,
          asset: domainNFT,
          amount: STROOP,
        })
      )
      .addOperation(
        Operation.changeTrust({
          source: userAccount,
          asset: domainNFT,
          limit: STROOP,
        })
      )
      .addOperation(
        Operation.setTrustLineFlags({
          source: domainAccount,
          trustor: userAccount,
          asset: domainNFT,
          flags: {
            authorized: true,
          },
        })
      )
      .addOperation(
        Operation.payment({
          source: domainAccount,
          destination: userAccount,
          asset: domainNFT,
          amount: STROOP,
        })
      )
      .addOperation(
        Operation.setTrustLineFlags({
          source: domainAccount,
          trustor: userAccount,
          asset: domainNFT,
          flags: {
            authorized: false,
          },
        })
      )
      .addMemo(Memo.text("domain_register"))
      .setTimeout(0)
      .build();
  }

  return transaction.toXDR();
};

export default register;
