import BigNumber from "bignumber.js";
import { AccountResponse, Asset, Server, ServerApi } from "stellar-sdk";
import { Environment } from "./server";

const DOMAIN_REGEX = /^(xn\-\-)?([a-z0-9\-]{1,61}|[a-z0-9\-]{1,30})\.stellar$/;
const LABEL_REGEX = /^(xn\-\-)?([a-z0-9\-]{1,61}|[a-z0-9\-]{1,30})$/;

export const isValidDomain = (domain: string): boolean => {
  return !!domain && DOMAIN_REGEX.test(domain);
};

export const isValidLabel = (label: string): boolean => {
  return !!label && LABEL_REGEX.test(label);
};

export interface DomainNft {
  domain: string;
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
        const isSubdomain = !!account.inflation_destination;

        return {
          domain,
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
  domain: DomainNft,
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
      if (account.inflation_destination === domain.asset.issuer) {
        const subdomain = Buffer.from(
          account.data_attr["domain"],
          "base64"
        ).toString();
        subdomains.push({
          domain: subdomain,
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

  let accounts = await server.accounts().forAsset(domainNft.asset).call();

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
