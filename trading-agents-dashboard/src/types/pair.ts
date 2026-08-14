export interface SavedPair {
  symbol: string;
  name?: string;
  type?: string;
  exchange?: string;
  favorite: boolean;
}

export interface SymbolSearchResult {
  symbol: string;
  name?: string;
  type?: string;
  exchange?: string;
}
