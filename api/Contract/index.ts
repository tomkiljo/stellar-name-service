import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { Keypair, Networks, Transaction } from "stellar-sdk";
import register from "../lib/contract/register";
import { HttpResponse, HttpResponseBuilder } from "../lib/http";
import { env } from "../lib/server";

const httpTrigger: AzureFunction = async (
  context: Context,
  req: HttpRequest
): Promise<HttpResponse> => {
  let xdr: string;
  switch (context.bindingData.command) {
    case "register":
      xdr = await register(req.body, env);
      break;
    default:
      return HttpResponseBuilder.error(
        400,
        `Unknown command ${context.bindingData.command}`
      );
  }

  const transaction = new Transaction(xdr, Networks[env.STELLAR_NETWORK]);
  const signerKeypair = Keypair.fromSecret(env.SIGNER_SECRET_KEY);

  transaction.sign(signerKeypair);

  return HttpResponseBuilder.ok({
    xdr: transaction.toXDR(),
    networkPassphrase: Networks[env.STELLAR_NETWORK],
  });
};

export default httpTrigger;
