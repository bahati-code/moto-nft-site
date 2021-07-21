export interface NFT {
  name: string;
  beneficiary: string;
  chainId: number;
  tokenId: string;
  contractAddress: string;
  contentHash: string;
  creator: string;
  pHash?: string;
}

export interface SearchResults {
  query: string;
  suggestedRoute?: string;
  result?: any;
  empty: boolean;
}

export interface DBNFT extends NFT {
  smImg: string;
  medImg: string;
}

export type NFTCollection = {
  [tokenId: string]: DBNFT;
}