import axios from "axios";

const axiosInstance = axios.create({
  timeout: 30000,
});

export interface DomainResult {
  domain: string;
  isValid: boolean;
  asset?: {
    code: string;
    issuer: string;
  };
  expires?: number;
  owner?: {
    account: string;
    data: {
      account?: string;
      discord?: string;
      github?: string;
      text?: string;
    };
  };
}

export const lookup = async (
  domain: string
): Promise<DomainResult | undefined> => {
  return axiosInstance
    .get<DomainResult>("/api/lookup", { params: { domain } })
    .then((res) => res.data)
    .catch((err) => {
      console.error(err);
      return undefined;
    });
};

export interface ContractResult {
  xdr: string;
  networkPassphrase: string;
}

export const contractRegister = async (
  domain: string,
  userAccount: string
): Promise<ContractResult> => {
  return axiosInstance
    .post<ContractResult>("/api/contract/register", { domain, userAccount })
    .then((res) => res.data);
};
