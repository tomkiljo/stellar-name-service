import axios from "axios";

const axiosInstance = axios.create({
  timeout: 30000,
});

export interface DomainResult {
  domain: string;
  isValid: boolean;
  isInTransfer: boolean;
  isSubdomain: boolean;
  hasOwner: boolean;
  asset?: {
    code: string;
    issuer: string;
  };
  expires?: number;
  subdomains: [
    {
      domain: string;
      asset: {
        code: string;
        issuer: string;
      };
    }
  ];
  owner?: {
    account: string;
    data: {
      account?: string;
      discord?: string;
      github?: string;
      text?: string;
    };
  };
  balanceId?: string;
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

export const contractSubregister = async (
  domain: string,
  label: string,
  userAccount: string
): Promise<ContractResult> => {
  return axiosInstance
    .post<ContractResult>("/api/contract/subregister", {
      domain,
      label,
      userAccount,
    })
    .then((res) => res.data);
};

export const contractTransferStart = async (
  domain: string,
  userAccount: string,
  targetAccount: string
): Promise<ContractResult> => {
  return axiosInstance
    .post<ContractResult>("/api/contract/transfer", {
      domain,
      userAccount,
      targetAccount,
    })
    .then((res) => res.data);
};

export const contractTransferEnd = async (
  domain: string,
  userAccount: string,
  balanceId: string
): Promise<ContractResult> => {
  return axiosInstance
    .post<ContractResult>("/api/contract/transfer", {
      domain,
      userAccount,
      balanceId,
    })
    .then((res) => res.data);
};
