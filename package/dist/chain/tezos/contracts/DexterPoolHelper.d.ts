import { KeyStore, Signer } from '../../../types/ExternalInterfaces';
interface DexterPoolSimpleStorage {
    balanceMap: number;
    administrator: string;
    token: string;
    tokenBalance: number;
    xtzBalance: number;
    selfIsUpdatingTokenPool: boolean;
    freeze_baker: boolean;
    lqt_total: number;
}
export declare namespace DexterPoolHelper {
    function verifyDestination(server: string, address: string): Promise<boolean>;
    function verifyScript(script: string): boolean;
    function getSimpleStorage(server: string, address: string): Promise<DexterPoolSimpleStorage>;
    function getAccountBalance(server: string, mapid: number, account: string): Promise<number>;
    function getAccountAllowance(server: string, mapid: number, account: string, spender: string): Promise<any>;
    function addLiquidity(server: string, signer: Signer, keyStore: KeyStore, contract: string, fee: number, liquidityAmount: number, xtzAmount: number, tokenAmount: number, expiration: Date): Promise<string>;
    function removeLiquidity(server: string, signer: Signer, keyStore: KeyStore, contract: string, fee: number, balance: number, xtzBalance: number, tokenBalance: number, expiration: Date): Promise<string>;
    function xtzToToken(server: string, signer: Signer, keyStore: KeyStore, contract: string, fee: number, xtzAmount: number, tokenAmount: number, expiration: Date): Promise<string>;
    function tokenToXtz(server: string, signer: Signer, keyStore: KeyStore, contract: string, fee: number, xtzAmount: number, tokenAmount: number, expiration: Date): Promise<string>;
    function tokenToToken(server: string, signer: Signer, keyStore: KeyStore, contract: string, fee: number, otherPoolContract: string, sellAmount: number, buyAmount: number, expiration: Date): Promise<string>;
    function approve(server: string, signer: Signer, keyStore: KeyStore, contract: string, fee: number, spender: string, newAllowance: number, currentAllowance: number): Promise<string>;
    function previewTransactions(): Promise<void>;
    function calcTokenLiquidityRequirement(xtzDeposit: number, tokenBalance: number, xtzBalance: number): number;
    function getTokenExchangeRate(xtzAmount: number, tokenBalance: number, xtzBalance: number, xtzDecimals?: number): {
        tokenAmount: number;
        rate: number;
    };
    function getXTZExchangeRate(tokenAmount: number, tokenBalance: number, xtzBalance: number, tokenDecimals?: number): {
        xtzAmount: number;
        rate: number;
    };
    function estimateLiquidityAmount(xtzDeposit: number, liquidityBalance: number, xtzBalance: number): number;
    function estimateShareCost(xtzBalance: number, tokenBalance: number, liquidityBalance: number): {
        xtzCost: number;
        tokenCost: number;
    };
}
export {};