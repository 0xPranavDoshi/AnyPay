// utils/onramp.ts
// Coinbase Onramp URL generator (backend style, manual URL construction)

export interface OnrampUrlOptions {
  sessionToken: string;
  defaultNetwork?: string;
  defaultAsset?: string;
  presetCryptoAmount?: number;
  presetFiatAmount?: number;
  defaultExperience?: 'send' | 'buy';
  defaultPaymentMethod?: string;
  fiatCurrency?: string;
  handlingRequestedUrls?: boolean;
  partnerUserId?: string;
  redirectUrl?: string;
}

/**
 * Generates a Coinbase Onramp URL for the user to buy/fund crypto.
 * @param opts OnrampUrlOptions (sessionToken required)
 * @returns string (URL)
 */
export function generateOnrampUrl(opts: OnrampUrlOptions): string {
  if (!opts.sessionToken) throw new Error('sessionToken is required');
  const baseUrl = 'https://pay.coinbase.com/buy/select-asset';
  const params = new URLSearchParams({ sessionToken: opts.sessionToken });

  if (opts.defaultNetwork) params.append('defaultNetwork', opts.defaultNetwork);
  if (opts.defaultAsset) params.append('defaultAsset', opts.defaultAsset);
  if (opts.presetCryptoAmount !== undefined) params.append('presetCryptoAmount', String(opts.presetCryptoAmount));
  if (opts.presetFiatAmount !== undefined) params.append('presetFiatAmount', String(opts.presetFiatAmount));
  if (opts.defaultExperience) params.append('defaultExperience', opts.defaultExperience);
  if (opts.defaultPaymentMethod) params.append('defaultPaymentMethod', opts.defaultPaymentMethod);
  if (opts.fiatCurrency) params.append('fiatCurrency', opts.fiatCurrency);
  if (opts.handlingRequestedUrls !== undefined) params.append('handlingRequestedUrls', String(opts.handlingRequestedUrls));
  if (opts.partnerUserId) params.append('partnerUserId', opts.partnerUserId);
  if (opts.redirectUrl) params.append('redirectUrl', opts.redirectUrl);

  return `${baseUrl}?${params.toString()}`;
}
