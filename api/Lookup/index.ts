import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { HttpResponse, HttpResponseBuilder } from "../lib/http";
import {
  isValidDomain,
  lookupDomainNft,
  lookupDomainOwner,
} from "../lib/lookup";
import { env } from "../lib/server";

const httpTrigger: AzureFunction = async (
  context: Context,
  req: HttpRequest
): Promise<HttpResponse> => {
  const domain = req.query.domain;
  const isValid = isValidDomain(domain);

  // domain not valid, return
  if (!isValid) {
    return HttpResponseBuilder.ok({
      domain,
      isValid,
    });
  }

  // domain valid but not registered
  const domainNft = await lookupDomainNft(domain, env);
  if (!domainNft) {
    return HttpResponseBuilder.ok({
      domain,
      isValid,
    });
  }

  // domain valid and registered
  const owner = await lookupDomainOwner(domainNft, env);
  return HttpResponseBuilder.ok({
    domain,
    isValid,
    asset: domainNft.asset,
    expires: domainNft.expires,
    owner: {
      account: owner.account_id,
      data: {
        account:
          owner.data_attr["config.sns.account"] &&
          Buffer.from(owner.data_attr["config.sns.account"], "base64").toString(
            "utf-8"
          ),
        discord:
          owner.data_attr["config.sns.discord"] &&
          Buffer.from(owner.data_attr["config.sns.discord"], "base64").toString(
            "utf-8"
          ),
        github:
          owner.data_attr["config.sns.github"] &&
          Buffer.from(owner.data_attr["config.sns.github"], "base64").toString(
            "utf-8"
          ),
        text:
          owner.data_attr["config.sns.text"] &&
          Buffer.from(owner.data_attr["config.sns.text"], "base64").toString(
            "utf-8"
          ),
      },
    },
  });
};

export default httpTrigger;
