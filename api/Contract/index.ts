import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { Keypair, Networks, Transaction } from "stellar-sdk";
import register from "../lib/contract/register";
import subregister from "../lib/contract/subregister";
import transfer from "../lib/contract/transfer";
import { HttpResponse, HttpResponseBuilder } from "../lib/http";
import { env } from "../lib/server";

const httpTrigger: AzureFunction = async (
  context: Context,
  req: HttpRequest
): Promise<HttpResponse> => {
  try {
    let xdr: string;
    switch (context.bindingData.command) {
      case "register":
        xdr = await register(req.body, env);
        break;
      case "subregister":
        xdr = await subregister(req.body, env);
        break;
      case "transfer":
        xdr = await transfer(req.body, env);
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
  } catch (err) {
    return HttpResponseBuilder.error(500, err?.message || "Unknown error");
  }
};

export default httpTrigger;
