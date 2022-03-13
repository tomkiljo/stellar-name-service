import BigNumber from "bignumber.js";
import {
  BASE_FEE,
  Claimant,
  Memo,
  Networks,
  Operation,
  Server,
  TransactionBuilder,
} from "stellar-sdk";
import {
  isValidDomain,
  lookupDomain,
  lookupDomainOwner,
  lookupSubdomainParentOwner,
} from "../lookup";
import { Environment } from "../server";

const STROOP = "0.0000001";

type TransferRequest = {
  domain: string;
  userAccount: string;
  targetAccount?: string;
  balanceId?: string;
};

const transfer = async (
  req: TransferRequest,
  env: Environment
): Promise<string> => {
  const { domain, userAccount, targetAccount, balanceId } = req;

  if (targetAccount && balanceId) {
    throw new Error("Only one of targetAccount or balanceId is allowed");
  }
  if (!targetAccount && !balanceId) {
    throw new Error("One of targetAccount or balanceId is allowed");
  }

  if (!isValidDomain(domain, true)) {
    throw new Error(`Illegal domain ${domain}`);
  }

  let existing = await lookupDomain(domain, env);
  if (!existing) {
    throw Error(`Domain ${domain} doest not exists`);
  }

  const server = new Server(env.HORIZON_URL);
  const user = await server.loadAccount(userAccount);

  const domainAsset = existing.asset;
  const domainAccount = existing.asset.getIssuer();

  const builder = new TransactionBuilder(user, {
    fee: BASE_FEE,
    networkPassphrase: Networks[env.STELLAR_NETWORK],
  });

  // begin transfer
  if (targetAccount) {
    const owner = await lookupDomainOwner(existing, env);
    const parentOwner =
      existing.isSubdomain && (await lookupSubdomainParentOwner(existing, env));

    if (!existing.isSubdomain && userAccount !== owner?.account_id) {
      throw Error("Only domain owner can transfer the domain");
    }
    if (existing.isSubdomain && userAccount !== parentOwner?.account_id) {
      throw Error("Only subdomain parent owner can transfer the domain");
    }

    const ownerAccount = owner?.account_id;
    const claimants: Claimant[] = [
      new Claimant(targetAccount, Claimant.predicateUnconditional()),
    ];

    if (ownerAccount !== targetAccount) {
      claimants.push(
        new Claimant(ownerAccount, Claimant.predicateUnconditional())
      );
    }

    // not a subdomain straight forward claimable balance
    // domain owner is a signer
    if (userAccount === ownerAccount) {
      builder
        .addOperation(
          Operation.setTrustLineFlags({
            source: domainAccount,
            trustor: ownerAccount,
            asset: domainAsset,
            flags: {
              authorized: true,
            },
          })
        )
        .addOperation(
          Operation.createClaimableBalance({
            source: ownerAccount,
            claimants: claimants,
            asset: domainAsset,
            amount: STROOP,
          })
        )
        .addOperation(
          Operation.changeTrust({
            source: ownerAccount,
            asset: domainAsset,
            limit: "0",
          })
        );
      // trust already removed so don't set trustline flag authorirized to false
    }
    // subdomain needs to be clawed back first and rotated through registrar
    // subdomain owner is not a signer
    else {
      const registrarAccount = env.REGISTRAR_ACCOUNT;

      builder
        .addOperation(
          Operation.clawback({
            source: domainAccount,
            from: ownerAccount,
            asset: domainAsset,
            amount: STROOP,
          })
        )
        .addOperation(
          Operation.changeTrust({
            source: registrarAccount,
            asset: domainAsset,
            limit: STROOP,
          })
        )
        .addOperation(
          Operation.setTrustLineFlags({
            source: domainAccount,
            trustor: registrarAccount,
            asset: domainAsset,
            flags: {
              authorized: true,
            },
          })
        )
        .addOperation(
          Operation.payment({
            source: domainAccount,
            destination: registrarAccount,
            asset: domainAsset,
            amount: STROOP,
          })
        )
        .addOperation(
          Operation.createClaimableBalance({
            source: registrarAccount,
            claimants: claimants,
            asset: domainAsset,
            amount: STROOP,
          })
        )
        .addOperation(
          Operation.changeTrust({
            source: registrarAccount,
            asset: domainAsset,
            limit: "0",
          })
        );
      // trust already removed so don't set trustline flag authorirized to false
    }

    builder.addMemo(Memo.text("domain_transfer_begin")).setTimeout(0);
  }
  // end transfer
  else {
    builder
      .addOperation(
        Operation.changeTrust({
          source: userAccount,
          asset: domainAsset,
          limit: STROOP,
        })
      )
      .addOperation(
        Operation.setTrustLineFlags({
          source: domainAccount,
          trustor: userAccount,
          asset: domainAsset,
          flags: {
            authorized: true,
          },
        })
      )
      .addOperation(
        Operation.claimClaimableBalance({
          source: userAccount,
          balanceId: balanceId,
        })
      )
      .addOperation(
        Operation.setTrustLineFlags({
          source: domainAccount,
          trustor: userAccount,
          asset: domainAsset,
          flags: {
            authorized: false,
          },
        })
      )
      .addMemo(Memo.text("domain_transfer_end"))
      .setTimeout(0);
  }

  const transaction = builder.build();
  return transaction.toXDR();
};

export default transfer;
