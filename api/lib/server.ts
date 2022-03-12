export type Environment = {
  HORIZON_URL: string;
  STELLAR_NETWORK: string;
  DOMAIN_EXPIRATION: string;
  REGISTRAR_ACCOUNT: string;
  SIGNER_SECRET_KEY: string;
};

export const env: Environment = {
  HORIZON_URL: process.env.HORIZON_URL,
  STELLAR_NETWORK: process.env.STELLAR_NETWORK,
  DOMAIN_EXPIRATION: process.env.DOMAIN_EXPIRATION,
  REGISTRAR_ACCOUNT: process.env.REGISTRAR_ACCOUNT,
  SIGNER_SECRET_KEY: process.env.SIGNER_SECRET_KEY,
};
