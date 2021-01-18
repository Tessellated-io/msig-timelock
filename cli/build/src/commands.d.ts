import { OperationData, url, address, publicKey } from './types';
export declare const bytesToSubmit: (operation: OperationData, nodeUrl: url, nonce: number | undefined, multiSigContractAddress: address, attemptAutomatic: boolean) => Promise<void>;
export declare const keyRotationbytesToSubmit: (threshold: number, keyList: Array<publicKey>, nodeUrl: url, nonce: number | undefined, multiSigContractAddress: address, attemptAutomatic: boolean) => Promise<void>;
export declare const cancelbytesToSubmit: (operationId: number, nodeUrl: url, nonce: number | undefined, multiSigContractAddress: address, attemptAutomatic: boolean) => Promise<void>;
export declare const deployMultisig: (timelockSeconds: number, threshold: number, publicKeys: Array<publicKey>, nodeUrl: url, privateKey: string) => Promise<void>;
export declare const cancel: (operationId: number, addresses: Array<address>, signatures: Array<string>, nonce: number, multiSigContractAddress: address, nodeUrl: url, privateKey: string, attemptAutomatic: boolean) => Promise<void>;
export declare const rotateKey: (threshold: number, keyList: Array<publicKey>, addresses: Array<address>, signatures: Array<string>, nonce: number, multiSigContractAddress: address, nodeUrl: url, privateKey: string, attemptAutomatic: boolean) => Promise<void>;
export declare const submit: (operation: OperationData, addresses: Array<address>, signatures: Array<string>, nonce: number, multiSigContractAddress: address, nodeUrl: url, privateKey: string, attemptAutomatic: boolean) => Promise<void>;
export declare const execute: (operationId: number, multiSigContractAddress: address, nodeUrl: url, privateKey: string) => Promise<void>;
