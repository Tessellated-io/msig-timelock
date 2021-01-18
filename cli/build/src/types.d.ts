export declare type address = string;
export declare type chainId = string;
export declare type ophash = string;
export declare type publicKey = string;
export declare type url = string;
export declare type OperationData = {
    address: address;
    amountMutez: number;
    entrypoint: string;
    argSmartPy: string;
};
export declare type ContractOriginationResult = {
    operationHash: ophash;
    contractAddress: address;
};
