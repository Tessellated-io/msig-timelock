import { ContractOriginationResult, OperationData, chainId, url, address } from './types';
import { KeyStore } from 'conseiljs';
export declare const getNonce: (multiSigContractAddress: address, nodeUrl: url) => Promise<number>;
export declare const getChainId: (nodeUrl: url) => Promise<chainId>;
export declare const compileOperation: (operation: OperationData) => string;
export declare function loadContract(filename: string): string;
export declare function deployContract(nodeUrl: url, contractSource: string, storage: string, keystore: KeyStore, counter: number): Promise<ContractOriginationResult>;
