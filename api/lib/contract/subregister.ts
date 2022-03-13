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
  TransactionBuilder,
} from "stellar-sdk";
import {
  isValidDomain,
  isValidLabel,
  lookupDomain,
  lookupDomainOwner,
} from "../lookup";
import { Environment } from "../server";

const STROOP = "0.0000001";

type SubRegisterRequest = {
  domain: string;
  label: string;
  userAccount: string;
};

const subregister = async (
  req: SubRegisterRequest,
  env: Environment
): Promise<string> => {
  const { domain, label, userAccount } = req;

  if (!isValidDomain(domain, false)) {
    throw new Error(`Illegal domain ${domain}`);
  }
  if (!isValidLabel(label)) {
    throw new Error(`Illegal label ${label}`);
  }

  let existing = await lookupDomain(domain, env);
  if (!existing) {
    throw Error(`Domain ${domain} doest not exists`);
  }

  const domainAccount = existing.asset.getIssuer();

  const owner = existing && (await lookupDomainOwner(existing, env));
  if (userAccount !== owner?.account_id) {
    throw Error("Only domain owner can create the subdomain");
  }

  const subdomain = `${label}.${domain}`;
  existing = await lookupDomain(subdomain, env);
  if (existing) {
    throw Error(`Subdomain ${subdomain} already exists`);
  }

  const server = new Server(env.HORIZON_URL);
  const registrarAccount = env.REGISTRAR_ACCOUNT;
  const registrar = await server.loadAccount(registrarAccount);

  const subdomainKeypair = Keypair.random();
  const subdomainAccount = subdomainKeypair.publicKey();
  const subdomainAsset = new Asset("Domain", subdomainKeypair.publicKey());

  // Sequence number is payed by the registrar account to prevent overlapping domain registrations.
  // Fee is set to zero requiring the user to submit the transaction in a fee bump transaction and pay for the fee.
  const transaction = new TransactionBuilder(registrar, {
    fee: "0",
    networkPassphrase: Networks[env.STELLAR_NETWORK],
  })
    .addOperation(
      Operation.createAccount({
        source: userAccount,
        destination: subdomainAccount,
        startingBalance: "2", // base reserve + one data entry + additional signer
      })
    )
    .addOperation(
      Operation.setOptions({
        source: subdomainAccount,
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
        inflationDest: domainAccount, // establishes relationship to parent domain
        masterWeight: 0,
      })
    )
    .addOperation(
      Operation.manageData({
        source: subdomainAccount,
        name: "domain",
        value: subdomain,
      })
    )
    .addOperation(
      Operation.changeTrust({
        source: userAccount,
        asset: subdomainAsset,
        limit: STROOP,
      })
    )
    .addOperation(
      Operation.setTrustLineFlags({
        source: subdomainAccount,
        trustor: userAccount,
        asset: subdomainAsset,
        flags: {
          authorized: true,
        },
      })
    )
    .addOperation(
      Operation.payment({
        source: subdomainAccount,
        destination: userAccount,
        asset: subdomainAsset,
        amount: STROOP,
      })
    )
    .addOperation(
      Operation.setTrustLineFlags({
        source: subdomainAccount,
        trustor: userAccount,
        asset: subdomainAsset,
        flags: {
          authorized: false,
        },
      })
    )
    .addMemo(Memo.text("subdomain_create"))
    .setTimeout(0)
    .build();

  // sign with the generated issuer keypair this one time
  transaction.sign(subdomainKeypair);

  return transaction.toXDR();
};

export default subregister;
