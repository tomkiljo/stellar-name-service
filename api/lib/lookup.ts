import BigNumber from "bignumber.js";
import {
  AccountResponse,
  Asset,
  Horizon,
  Server,
  ServerApi,
} from "stellar-sdk";
import { Environment } from "./server";

const DOMAIN_REGEX = /^(xn\-\-)?([a-z0-9\-]{1,61}|[a-z0-9\-]{1,30})\.stellar$/;
const LABEL_REGEX = /^(xn\-\-)?([a-z0-9\-]{1,61}|[a-z0-9\-]{1,30})$/;

export const isValidDomain = (
  domain: string,
  allowSubdomain: boolean = false
): boolean => {
  if (!!!domain || domain.length === 0) {
    return false;
  }

  if (allowSubdomain) {
    const labels = domain.split(".");
    if (labels.length < 2 || labels.length > 3) {
      return false;
    }
    if (labels.length === 3) {
      return (
        isValidLabel(labels[0]) && DOMAIN_REGEX.test(labels.slice(-2).join("."))
      );
    }
  }

  return DOMAIN_REGEX.test(domain);
};

export const isValidLabel = (label: string): boolean => {
  return !!label && LABEL_REGEX.test(label);
};

export interface DomainNft {
  domain: string;
  parentDomainAccount?: string;
  isSubdomain: boolean;
  asset: Asset;
  expires?: number;
}

export const lookupDomain = async (
  domain: string,
  env: Environment
): Promise<DomainNft | undefined> => {
  const server = new Server(env.HORIZON_URL);
  const domainEncoded = Buffer.from(domain).toString("base64");

  let accounts = await server
    .accounts()
    .forSigner(env.REGISTRAR_ACCOUNT)
    .order("asc")
    .call();

  while (accounts.records.length > 0) {
    for (const account of accounts.records) {
      if (account.data_attr["domain"] === domainEncoded) {
        const expires =
          account.data_attr["expires"] &&
          new BigNumber(
            Buffer.from(account.data_attr["expires"], "base64").toString()
          ).toNumber();
        const parentDomainAccount = account.inflation_destination;
        const isSubdomain = !!account.inflation_destination;

        return {
          domain,
          parentDomainAccount,
          isSubdomain,
          asset: new Asset("Domain", account.account_id),
          expires,
        };
      }
    }
    accounts = await accounts.next();
  }
};

export const lookupSubdomains = async (
  domainNft: DomainNft,
  env: Environment
): Promise<DomainNft[]> => {
  const server = new Server(env.HORIZON_URL);

  let accounts = await server
    .accounts()
    .forSigner(env.REGISTRAR_ACCOUNT)
    .order("asc")
    .call();

  const subdomains: DomainNft[] = [];

  while (accounts.records.length > 0) {
    for (const account of accounts.records) {
      if (account.inflation_destination === domainNft.asset.issuer) {
        const subdomain = Buffer.from(
          account.data_attr["domain"],
          "base64"
        ).toString();
        const parentDomainAccount = account.inflation_destination;

        subdomains.push({
          domain: subdomain,
          parentDomainAccount,
          isSubdomain: true,
          asset: new Asset("Domain", account.account_id),
        });
      }
    }
    accounts = await accounts.next();
  }

  return subdomains;
};

export const lookupDomainOwner = async (
  domainNft: DomainNft,
  env: Environment
): Promise<ServerApi.AccountRecord | undefined> => {
  const server = new Server(env.HORIZON_URL);

  console.log(domainNft.asset);

  let accounts = await server.accounts().forAsset(domainNft.asset).call();

  while (accounts.records.length > 0) {
    for (const account of accounts.records) {
      for (const balance of account.balances) {
        if (balance.asset_type !== "credit_alphanum12") {
          continue;
        }
        const balanceLineAsset = balance as Horizon.BalanceLineAsset;
        if (
          balanceLineAsset.asset_issuer === domainNft.asset.issuer &&
          balanceLineAsset.asset_code === domainNft.asset.code &&
          new BigNumber(balanceLineAsset.balance).isGreaterThan(0)
        ) {
          return account;
        }
      }
    }
    accounts = await accounts.next();
  }
};

export const lookupSubdomainParentOwner = async (
  subdomainNft: DomainNft,
  env: Environment
): Promise<ServerApi.AccountRecord | undefined> => {
  if (!subdomainNft.isSubdomain) {
    return undefined;
  }

  const server = new Server(env.HORIZON_URL);

  const domainAsset = new Asset("Domain", subdomainNft.parentDomainAccount);
  let accounts = await server.accounts().forAsset(domainAsset).call();

  while (accounts.records.length > 0) {
    for (const account of accounts.records) {
      for (const balance of account.balances) {
        if (balance.balance !== "0") {
          return account;
        }
      }
    }
    accounts = await accounts.next();
  }
};

export const lookupDomainTransfer = async (
  domainNft: DomainNft,
  env: Environment
): Promise<ServerApi.ClaimableBalanceRecord | undefined> => {
  const server = new Server(env.HORIZON_URL);

  const balances = await server
    .claimableBalances()
    .asset(domainNft.asset)
    .limit(1)
    .call();

  if (balances.records.length > 0) {
    return balances.records[0];
  }
};
