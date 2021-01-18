"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = exports.submit = exports.rotateKey = exports.cancel = exports.deployMultisig = exports.cancelbytesToSubmit = exports.keyRotationbytesToSubmit = exports.bytesToSubmit = void 0;
const utils_1 = __importDefault(require("./utils"));
const helpers_1 = require("./helpers");
const conseiljs_1 = require("conseiljs");
const operation_fee_estimator_1 = __importDefault(require("./operation-fee-estimator"));
const constants_1 = __importDefault(require("./constants"));
const CONTRACT_SOURCE = `${__dirname}/../../smart_contracts/msig-timelock.tz`;
const bytesToSubmit = async (operation, nodeUrl, nonce, multiSigContractAddress, attemptAutomatic) => {
    const chainId = await helpers_1.getChainId(nodeUrl);
    const actualNonce = nonce ?? (await helpers_1.getNonce(multiSigContractAddress, nodeUrl)) + 1;
    const lambda = helpers_1.compileOperation(operation);
    const michelson = `Pair "${chainId}" (Pair ${actualNonce} ${lambda})`;
    utils_1.default.print('Data to encode');
    utils_1.default.print(`Pair "${chainId}" (Pair ${actualNonce} ${lambda})'`);
    utils_1.default.print(``);
    utils_1.default.print('Encode bytes with: ');
    utils_1.default.print(`tezos-client -E ${nodeUrl} hash data 'Pair "${chainId}" (Pair ${actualNonce} ${lambda})' of type 'pair chain_id (pair nat (lambda unit (list operation)))'`);
    utils_1.default.print('');
    utils_1.default.print(`Verify these bytes with: `);
    utils_1.default.print(`tezos-client -E ${nodeUrl} unpack michelson data  0x<BYTES>`);
    utils_1.default.print('');
    utils_1.default.print(`Sign these bytes with: `);
    utils_1.default.print(`tezos-client -E ${nodeUrl} sign bytes  0x<BYTES> for <KEY>`);
    utils_1.default.print('');
    if (attemptAutomatic) {
        const hex = conseiljs_1.TezosMessageUtils.writePackedData(michelson, 'pair (chain_id) (pair (nat) (lambda unit (list operation)))', conseiljs_1.TezosParameterFormat.Michelson);
        utils_1.default.print(`[Experimental] I tried to encode the bytes myself. Here is what I came up with: `);
        utils_1.default.print(hex);
        utils_1.default.print('');
    }
};
exports.bytesToSubmit = bytesToSubmit;
const keyRotationbytesToSubmit = async (threshold, keyList, nodeUrl, nonce, multiSigContractAddress, attemptAutomatic) => {
    const chainId = await helpers_1.getChainId(nodeUrl);
    const actualNonce = nonce ?? (await helpers_1.getNonce(multiSigContractAddress, nodeUrl)) + 1;
    const keyListMichelson = keyList.reduce((previous, current) => {
        return `${previous} "${current}";`;
    }, '');
    const michelson = `Pair "${chainId}" (Pair ${actualNonce} (Pair ${threshold} {${keyListMichelson}}))`;
    utils_1.default.print('Data to encode');
    utils_1.default.print(`${michelson}`);
    utils_1.default.print(``);
    utils_1.default.print('Encode bytes with: ');
    utils_1.default.print(`tezos-client -E ${nodeUrl} hash data '${michelson}' of type 'pair chain_id (pair nat (pair nat (list key)))'`);
    utils_1.default.print('');
    utils_1.default.print(`Verify these bytes with: `);
    utils_1.default.print(`tezos-client -E ${nodeUrl} unpack michelson data  0x<BYTES>`);
    utils_1.default.print('');
    utils_1.default.print(`Sign these bytes with: `);
    utils_1.default.print(`tezos-client -E ${nodeUrl} sign bytes  0x<BYTES> for <KEY>`);
    utils_1.default.print('');
    if (attemptAutomatic) {
        const hex = conseiljs_1.TezosMessageUtils.writePackedData(michelson, 'pair chain_id (pair nat (pair nat (list key)))', conseiljs_1.TezosParameterFormat.Michelson);
        utils_1.default.print(`[Experimental] I tried to encode the bytes myself. Here is what I came up with: `);
        utils_1.default.print(hex);
        utils_1.default.print('');
    }
};
exports.keyRotationbytesToSubmit = keyRotationbytesToSubmit;
const cancelbytesToSubmit = async (operationId, nodeUrl, nonce, multiSigContractAddress, attemptAutomatic) => {
    const chainId = await helpers_1.getChainId(nodeUrl);
    const actualNonce = nonce ?? (await helpers_1.getNonce(multiSigContractAddress, nodeUrl)) + 1;
    const michelson = `Pair "${chainId}" (Pair ${actualNonce} ${operationId})`;
    utils_1.default.print('Data to encode');
    utils_1.default.print(`${michelson}`);
    utils_1.default.print(``);
    utils_1.default.print('Encode bytes with: ');
    utils_1.default.print(`tezos-client -E ${nodeUrl} hash data '${michelson}' of type 'pair chain_id (pair nat nat)'`);
    utils_1.default.print('');
    utils_1.default.print(`Verify these bytes with: `);
    utils_1.default.print(`tezos-client -E ${nodeUrl} unpack michelson data  0x<BYTES>`);
    utils_1.default.print('');
    utils_1.default.print(`Sign these bytes with: `);
    utils_1.default.print(`tezos-client -E ${nodeUrl} sign bytes  0x<BYTES> for <KEY>`);
    utils_1.default.print('');
    if (attemptAutomatic) {
        const hex = conseiljs_1.TezosMessageUtils.writePackedData(michelson, 'pair chain_id (pair nat nat)', conseiljs_1.TezosParameterFormat.Michelson);
        utils_1.default.print(`[Experimental] I tried to encode the bytes myself. Here is what I came up with: `);
        utils_1.default.print(hex);
        utils_1.default.print('');
    }
};
exports.cancelbytesToSubmit = cancelbytesToSubmit;
const deployMultisig = async (timelockSeconds, threshold, publicKeys, nodeUrl, privateKey) => {
    const source = helpers_1.loadContract(CONTRACT_SOURCE);
    const sortedPublicKeys = publicKeys.sort();
    const michelsonPublicKeyList = sortedPublicKeys.reduce((previous, current) => {
        return `${previous} "${current}"`;
    }, '');
    const storage = `(Pair(Pair 0 { ${michelsonPublicKeyList}}) (Pair ${threshold} (Pair { } ${timelockSeconds})))`;
    const keyStore = await utils_1.default.keyStoreFromPrivateKey(privateKey);
    const signer = await utils_1.default.signerFromKeyStore(keyStore);
    utils_1.default.print(`Deploying from: ${keyStore.publicKeyHash} `);
    utils_1.default.print(`Storage: ${storage} `);
    await utils_1.default.revealAccountIfNeeded(nodeUrl, keyStore, signer);
    let counter = await conseiljs_1.TezosNodeReader.getCounterForAccount(nodeUrl, keyStore.publicKeyHash);
    counter++;
    const deployResult = await helpers_1.deployContract(nodeUrl, source, storage, keyStore, counter);
    utils_1.default.print(`Deployed!`);
    utils_1.default.print(`Address: ${deployResult.contractAddress} `);
    utils_1.default.print(`Operation Hash: ${deployResult.operationHash} `);
};
exports.deployMultisig = deployMultisig;
const cancel = async (operationId, addresses, signatures, nonce, multiSigContractAddress, nodeUrl, privateKey, attemptAutomatic) => {
    const keyStore = await utils_1.default.keyStoreFromPrivateKey(privateKey);
    const signer = await utils_1.default.signerFromKeyStore(keyStore);
    utils_1.default.print(`Submitting cancel operation from: ${keyStore.publicKeyHash} `);
    utils_1.default.print(`Using nonce: ${nonce} `);
    await utils_1.default.revealAccountIfNeeded(nodeUrl, keyStore, signer);
    const counter = await conseiljs_1.TezosNodeReader.getCounterForAccount(nodeUrl, keyStore.publicKeyHash);
    const chainId = await helpers_1.getChainId(nodeUrl);
    let signaturesMap = '';
    for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        const signature = signatures[i];
        signaturesMap += `Elt "${address}" "${signature}"; `;
    }
    const param = `Pair { ${signaturesMap} } (Pair "${chainId}" (Pair ${nonce} ${operationId}))`;
    utils_1.default.print(`Invoking with param: ${param}`);
    utils_1.default.print('');
    utils_1.default.print(`Use tezos-client to submit the operation manually.`);
    utils_1.default.print(`tezos-client -E ${nodeUrl} transfer 0 from ${keyStore.publicKeyHash} to ${multiSigContractAddress} --arg '${param}' --entrypoint 'cancel'`);
    utils_1.default.print('');
    if (attemptAutomatic) {
        utils_1.default.print(`Attempting to inject automatically:`);
        const operation = conseiljs_1.TezosNodeWriter.constructContractInvocationOperation(keyStore.publicKeyHash, counter + 1, multiSigContractAddress, 0, 0, constants_1.default.storageLimit, constants_1.default.gasLimit, 'cancel', `${param} `, conseiljs_1.TezosParameterFormat.Michelson);
        const operationFeeEstimator = new operation_fee_estimator_1.default(nodeUrl);
        const operationsWithFees = await operationFeeEstimator.estimateAndApplyFees([operation]);
        const nodeResult = await conseiljs_1.TezosNodeWriter.sendOperation(nodeUrl, operationsWithFees, signer);
        const hash = nodeResult.operationGroupID.replace(/"/g, '');
        utils_1.default.print(`Executed with hash: ${hash} `);
    }
};
exports.cancel = cancel;
const rotateKey = async (threshold, keyList, addresses, signatures, nonce, multiSigContractAddress, nodeUrl, privateKey, attemptAutomatic) => {
    const keyStore = await utils_1.default.keyStoreFromPrivateKey(privateKey);
    const signer = await utils_1.default.signerFromKeyStore(keyStore);
    utils_1.default.print(`Submitting rotate from: ${keyStore.publicKeyHash} `);
    utils_1.default.print(`Using nonce: ${nonce} `);
    await utils_1.default.revealAccountIfNeeded(nodeUrl, keyStore, signer);
    const counter = await conseiljs_1.TezosNodeReader.getCounterForAccount(nodeUrl, keyStore.publicKeyHash);
    const chainId = await helpers_1.getChainId(nodeUrl);
    const keyListMichelson = keyList.reduce((previous, current) => {
        return `${previous} "${current}";`;
    }, '');
    let signaturesMap = '';
    for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        const signature = signatures[i];
        signaturesMap += `Elt "${address}" "${signature}"; `;
    }
    const param = `Pair { ${signaturesMap} } (Pair "${chainId}" (Pair ${nonce} (Pair ${threshold} {${keyListMichelson}})))`;
    utils_1.default.print(`Invoking with param: ${param}`);
    utils_1.default.print('');
    utils_1.default.print(`Use tezos-client to submit the operation manually.`);
    utils_1.default.print(`tezos-client -E ${nodeUrl} transfer 0 from ${keyStore.publicKeyHash} to ${multiSigContractAddress} --arg '${param}' --entrypoint 'rotate'`);
    utils_1.default.print('');
    if (attemptAutomatic) {
        utils_1.default.print(`Attempting to inject automatically:`);
        const operation = conseiljs_1.TezosNodeWriter.constructContractInvocationOperation(keyStore.publicKeyHash, counter + 1, multiSigContractAddress, 0, 0, constants_1.default.storageLimit, constants_1.default.gasLimit, 'rotate', `${param} `, conseiljs_1.TezosParameterFormat.Michelson);
        const operationFeeEstimator = new operation_fee_estimator_1.default(nodeUrl);
        const operationsWithFees = await operationFeeEstimator.estimateAndApplyFees([operation]);
        const nodeResult = await conseiljs_1.TezosNodeWriter.sendOperation(nodeUrl, operationsWithFees, signer);
        const hash = nodeResult.operationGroupID.replace(/"/g, '');
        utils_1.default.print(`Executed with hash: ${hash} `);
    }
};
exports.rotateKey = rotateKey;
const submit = async (operation, addresses, signatures, nonce, multiSigContractAddress, nodeUrl, privateKey, attemptAutomatic) => {
    const keyStore = await utils_1.default.keyStoreFromPrivateKey(privateKey);
    const signer = await utils_1.default.signerFromKeyStore(keyStore);
    utils_1.default.print(`Submitting operation from: ${keyStore.publicKeyHash} `);
    utils_1.default.print(`Using nonce: ${nonce} `);
    await utils_1.default.revealAccountIfNeeded(nodeUrl, keyStore, signer);
    const counter = await conseiljs_1.TezosNodeReader.getCounterForAccount(nodeUrl, keyStore.publicKeyHash);
    const chainId = await helpers_1.getChainId(nodeUrl);
    const lambda = helpers_1.compileOperation(operation);
    let signaturesMap = '';
    for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        const signature = signatures[i];
        signaturesMap += `Elt "${address}" "${signature}"; `;
    }
    const param = `Pair { ${signaturesMap} } (Pair "${chainId}" (Pair ${nonce} ${lambda}))`;
    utils_1.default.print(`Invoking with param: ${param}`);
    utils_1.default.print('');
    utils_1.default.print(`Use tezos-client to submit the operation manually.`);
    utils_1.default.print(`tezos-client -E ${nodeUrl} transfer 0 from ${keyStore.publicKeyHash} to ${multiSigContractAddress} --arg '${param}' --entrypoint 'submit'`);
    utils_1.default.print('');
    if (attemptAutomatic) {
        utils_1.default.print(`Attempting to inject automatically:`);
        const operation = conseiljs_1.TezosNodeWriter.constructContractInvocationOperation(keyStore.publicKeyHash, counter + 1, multiSigContractAddress, 0, 0, constants_1.default.storageLimit, constants_1.default.gasLimit, 'submit', `${param} `, conseiljs_1.TezosParameterFormat.Michelson);
        const operationFeeEstimator = new operation_fee_estimator_1.default(nodeUrl);
        const operationsWithFees = await operationFeeEstimator.estimateAndApplyFees([operation]);
        const nodeResult = await conseiljs_1.TezosNodeWriter.sendOperation(nodeUrl, operationsWithFees, signer);
        const hash = nodeResult.operationGroupID.replace(/"/g, '');
        utils_1.default.print(`Executed with hash: ${hash} `);
    }
};
exports.submit = submit;
const execute = async (operationId, multiSigContractAddress, nodeUrl, privateKey) => {
    const keyStore = await utils_1.default.keyStoreFromPrivateKey(privateKey);
    const signer = await utils_1.default.signerFromKeyStore(keyStore);
    utils_1.default.print(`Sending execute from: ${keyStore.publicKeyHash} `);
    utils_1.default.print(`Using nonce: ${operationId} `);
    await utils_1.default.revealAccountIfNeeded(nodeUrl, keyStore, signer);
    const counter = await conseiljs_1.TezosNodeReader.getCounterForAccount(nodeUrl, keyStore.publicKeyHash);
    const operation = conseiljs_1.TezosNodeWriter.constructContractInvocationOperation(keyStore.publicKeyHash, counter + 1, multiSigContractAddress, 0, 0, constants_1.default.storageLimit, constants_1.default.gasLimit, 'execute', `${operationId} `, conseiljs_1.TezosParameterFormat.Michelson);
    const operationFeeEstimator = new operation_fee_estimator_1.default(nodeUrl);
    const operationsWithFees = await operationFeeEstimator.estimateAndApplyFees([
        operation,
    ]);
    const nodeResult = await conseiljs_1.TezosNodeWriter.sendOperation(nodeUrl, operationsWithFees, signer);
    const hash = nodeResult.operationGroupID.replace(/"/g, '');
    utils_1.default.print(`Executed with hash: ${hash} `);
};
exports.execute = execute;
//# sourceMappingURL=commands.js.map