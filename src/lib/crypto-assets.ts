export const CRYPTO_CURRENCIES = ["USDT", "USDC"] as const;
export type CryptoCurrency = (typeof CRYPTO_CURRENCIES)[number];

export const CRYPTO_NETWORKS = ["TRC20", "POLYGON", "ERC20"] as const;
export type CryptoNetwork = (typeof CRYPTO_NETWORKS)[number];

export const CRYPTO_NETWORK_LABELS: Record<CryptoNetwork, string> = {
  TRC20: "Tron",
  POLYGON: "Polygon",
  ERC20: "Ethereum",
};

export const CRYPTO_NETWORKS_BY_CURRENCY: Record<
  CryptoCurrency,
  readonly CryptoNetwork[]
> = {
  USDT: ["TRC20", "POLYGON", "ERC20"],
  USDC: ["ERC20"],
};

const FALLBACK_DEPOSIT_ADDRESSES: Record<
  CryptoCurrency,
  Partial<Record<CryptoNetwork, string>>
> = {
  USDT: {
    TRC20: "THzBRcQGz2fY9Xcu2ZZtVhKsDDeE98iW2N",
    POLYGON: "0x55853FfD5D8772306640B806F445Fc31C33e2FcF",
    ERC20: "0x55853FfD5D8772306640B806F445Fc31C33e2FcF",
  },
  USDC: {
    ERC20: "0x55853FfD5D8772306640B806F445Fc31C33e2FcF",
  },
};

export function isCryptoCurrency(value: unknown): value is CryptoCurrency {
  return (
    typeof value === "string" &&
    (CRYPTO_CURRENCIES as readonly string[]).includes(value)
  );
}

export function isCryptoNetwork(value: unknown): value is CryptoNetwork {
  return (
    typeof value === "string" &&
    (CRYPTO_NETWORKS as readonly string[]).includes(value)
  );
}

export function getCryptoNetworks(
  currency: CryptoCurrency
): readonly CryptoNetwork[] {
  return CRYPTO_NETWORKS_BY_CURRENCY[currency];
}

export function isCryptoNetworkForCurrency(
  currency: unknown,
  network: unknown
): boolean {
  return (
    isCryptoCurrency(currency) &&
    isCryptoNetwork(network) &&
    CRYPTO_NETWORKS_BY_CURRENCY[currency].includes(network)
  );
}

export function getDefaultCryptoNetwork(currency: CryptoCurrency): CryptoNetwork {
  return CRYPTO_NETWORKS_BY_CURRENCY[currency][0];
}

export function getCryptoDepositAddress(
  currency: CryptoCurrency,
  network: CryptoNetwork
): string | undefined {
  const env = process.env;
  return (
    env[`DEPOSIT_ADDRESS_${currency}_${network}`] ||
    (currency === "USDT" ? env[`DEPOSIT_ADDRESS_${network}`] : undefined) ||
    env[`DEPOSIT_ADDRESS_${currency}`] ||
    FALLBACK_DEPOSIT_ADDRESSES[currency][network] ||
    (currency === "USDT"
      ? env.DEPOSIT_ADDRESS_MAIN || env.PAYMENT_DEPOSIT_ADDRESS
      : undefined)
  );
}
