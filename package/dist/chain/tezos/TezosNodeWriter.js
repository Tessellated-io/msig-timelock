"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const blakejs = __importStar(require("blakejs"));
const TezosTypes = __importStar(require("../../types/tezos/TezosChainTypes"));
const TezosConstants_1 = require("../../types/tezos/TezosConstants");
const ErrorTypes_1 = require("../../types/ErrorTypes");
const TezosNodeReader_1 = require("./TezosNodeReader");
const TezosMessageCodec_1 = require("./TezosMessageCodec");
const TezosMessageUtil_1 = require("./TezosMessageUtil");
const TezosLanguageUtil_1 = require("./TezosLanguageUtil");
const TezosOperationQueue_1 = require("./TezosOperationQueue");
const FetchSelector_1 = __importDefault(require("../../utils/FetchSelector"));
const fetch = FetchSelector_1.default.fetch;
const LoggerSelector_1 = __importDefault(require("../../utils/LoggerSelector"));
const log = LoggerSelector_1.default.log;
let operationQueues = {};
var TezosNodeWriter;
(function (TezosNodeWriter) {
    function performPostRequest(server, command, payload = {}) {
        const url = `${server}/${command}`;
        const payloadStr = JSON.stringify(payload);
        log.debug(`TezosNodeWriter.performPostRequest sending ${payloadStr}\n->\n${url}`);
        return fetch(url, { method: 'post', body: payloadStr, headers: { 'content-type': 'application/json' } });
    }
    function forgeOperations(branch, operations) {
        log.debug(`TezosNodeWriter.forgeOperations: ${JSON.stringify(operations)}`);
        let encoded = TezosMessageUtil_1.TezosMessageUtils.writeBranch(branch);
        operations.forEach(m => encoded += TezosMessageCodec_1.TezosMessageCodec.encodeOperation(m));
        log.debug(`TezosNodeWriter.forgeOperations: ${encoded}`);
        return encoded;
    }
    TezosNodeWriter.forgeOperations = forgeOperations;
    function forgeOperationsRemotely(server, branch, operations, chainid = 'main') {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug('TezosNodeWriter.forgeOperations:');
            log.debug(JSON.stringify(operations));
            log.warn('forgeOperationsRemotely() is not intrinsically trustless');
            const response = yield performPostRequest(server, `chains/${chainid}/blocks/head/helpers/forge/operations`, { branch: branch, contents: operations });
            const forgedOperation = yield response.text();
            const ops = forgedOperation.replace(/\n/g, '').replace(/['"]+/g, '');
            let optypes = Array.from(operations.map(o => o["kind"]));
            let validate = false;
            for (let t of optypes) {
                validate = ['reveal', 'transaction', 'delegation', 'origination'].includes(t);
                if (validate) {
                    break;
                }
            }
            if (validate) {
                const decoded = TezosMessageCodec_1.TezosMessageCodec.parseOperationGroup(ops);
                for (let i = 0; i < operations.length; i++) {
                    const clientop = operations[i];
                    const serverop = decoded[i];
                    if (clientop['kind'] === 'transaction') {
                        if (serverop.kind !== clientop['kind'] || serverop.fee !== clientop['fee'] || serverop.amount !== clientop['amount'] || serverop.destination !== clientop['destination']) {
                            throw new Error('Forged transaction failed validation.');
                        }
                    }
                    else if (clientop['kind'] === 'delegation') {
                        if (serverop.kind !== clientop['kind'] || serverop.fee !== clientop['fee'] || serverop.delegate !== clientop['delegate']) {
                            throw new Error('Forged delegation failed validation.');
                        }
                    }
                    else if (clientop['kind'] === 'origination') {
                        if (serverop.kind !== clientop['kind'] || serverop.fee !== clientop['fee'] || serverop.balance !== clientop['balance'] || serverop.spendable !== clientop['spendable'] || serverop.delegatable !== clientop['delegatable'] || serverop.delegate !== clientop['delegate'] || serverop.script !== undefined) {
                            throw new Error('Forged origination failed validation.');
                        }
                    }
                }
            }
            return ops;
        });
    }
    TezosNodeWriter.forgeOperationsRemotely = forgeOperationsRemotely;
    function preapplyOperation(server, branch, protocol, operations, signedOpGroup, chainid = 'main') {
        return __awaiter(this, void 0, void 0, function* () {
            const payload = [{
                    protocol: protocol,
                    branch: branch,
                    contents: operations,
                    signature: signedOpGroup.signature
                }];
            const response = yield performPostRequest(server, `chains/${chainid}/blocks/head/helpers/preapply/operations`, payload);
            const text = yield response.text();
            let json;
            try {
                log.debug(`TezosNodeWriter.preapplyOperation received ${text}`);
                json = JSON.parse(text);
            }
            catch (err) {
                log.error(`TezosNodeWriter.preapplyOperation failed to parse response`);
                throw new Error(`Could not parse JSON from response of chains/${chainid}/blocks/head/helpers/preapply/operation: '${text}' for ${payload}`);
            }
            parseRPCError(text);
            return json;
        });
    }
    TezosNodeWriter.preapplyOperation = preapplyOperation;
    function injectOperation(server, signedOpGroup, chainid = 'main') {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield performPostRequest(server, `injection/operation?chain=${chainid}`, signedOpGroup.bytes.toString('hex'));
            const text = yield response.text();
            parseRPCError(text);
            return text;
        });
    }
    TezosNodeWriter.injectOperation = injectOperation;
    function sendOperation(server, operations, signer, offset = 54) {
        return __awaiter(this, void 0, void 0, function* () {
            const blockHead = yield TezosNodeReader_1.TezosNodeReader.getBlockAtOffset(server, offset);
            const blockHash = blockHead.hash.slice(0, 51);
            const forgedOperationGroup = forgeOperations(blockHash, operations);
            const opSignature = yield signer.signOperation(Buffer.from(TezosConstants_1.TezosConstants.OperationGroupWatermark + forgedOperationGroup, 'hex'));
            const signedOpGroup = Buffer.concat([Buffer.from(forgedOperationGroup, 'hex'), opSignature]);
            const base58signature = TezosMessageUtil_1.TezosMessageUtils.readSignatureWithHint(opSignature, signer.getSignerCurve());
            const opPair = { bytes: signedOpGroup, signature: base58signature };
            const appliedOp = yield preapplyOperation(server, blockHash, blockHead.protocol, operations, opPair);
            const injectedOperation = yield injectOperation(server, opPair);
            return { results: appliedOp[0], operationGroupID: injectedOperation };
        });
    }
    TezosNodeWriter.sendOperation = sendOperation;
    function queueOperation(server, operations, signer, keyStore, batchDelay = 25) {
        const k = blakejs.blake2s(`${server}${keyStore.publicKeyHash}`, null, 16);
        if (!!!operationQueues[k]) {
            operationQueues[k] = TezosOperationQueue_1.TezosOperationQueue.createQueue(server, signer, keyStore, batchDelay);
        }
        operationQueues[k].addOperations(...operations);
    }
    TezosNodeWriter.queueOperation = queueOperation;
    function getQueueStatus(server, keyStore) {
        const k = blakejs.blake2s(`${server}${keyStore.publicKeyHash}`, null, 16);
        if (operationQueues[k]) {
            return operationQueues[k].getStatus();
        }
        return -1;
    }
    TezosNodeWriter.getQueueStatus = getQueueStatus;
    function appendRevealOperation(server, publicKey, accountHash, accountOperationIndex, operations) {
        return __awaiter(this, void 0, void 0, function* () {
            const isKeyRevealed = yield TezosNodeReader_1.TezosNodeReader.isManagerKeyRevealedForAccount(server, accountHash);
            const counter = accountOperationIndex + 1;
            if (!isKeyRevealed) {
                const revealOp = {
                    kind: 'reveal',
                    source: accountHash,
                    fee: '0',
                    counter: counter.toString(),
                    gas_limit: '10600',
                    storage_limit: '0',
                    public_key: publicKey
                };
                operations.forEach((operation, index) => {
                    const c = accountOperationIndex + 2 + index;
                    operation.counter = c.toString();
                });
                return [revealOp, ...operations];
            }
            return operations;
        });
    }
    TezosNodeWriter.appendRevealOperation = appendRevealOperation;
    function sendTransactionOperation(server, signer, keyStore, to, amount, fee, offset = 54) {
        return __awaiter(this, void 0, void 0, function* () {
            const counter = (yield TezosNodeReader_1.TezosNodeReader.getCounterForAccount(server, keyStore.publicKeyHash)) + 1;
            const transaction = {
                destination: to,
                amount: amount.toString(),
                storage_limit: TezosConstants_1.TezosConstants.DefaultTransactionStorageLimit + '',
                gas_limit: TezosConstants_1.TezosConstants.DefaultTransactionGasLimit + '',
                counter: counter.toString(),
                fee: fee.toString(),
                source: keyStore.publicKeyHash,
                kind: 'transaction'
            };
            const operations = yield appendRevealOperation(server, keyStore.publicKey, keyStore.publicKeyHash, counter - 1, [transaction]);
            return sendOperation(server, operations, signer, offset);
        });
    }
    TezosNodeWriter.sendTransactionOperation = sendTransactionOperation;
    function sendDelegationOperation(server, signer, keyStore, delegate, fee = TezosConstants_1.TezosConstants.DefaultDelegationFee, offset = 54, optimizeFee = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const counter = (yield TezosNodeReader_1.TezosNodeReader.getCounterForAccount(server, keyStore.publicKeyHash)) + 1;
            const delegation = {
                kind: 'delegation',
                source: keyStore.publicKeyHash,
                fee: fee.toString(),
                counter: counter.toString(),
                storage_limit: TezosConstants_1.TezosConstants.DefaultDelegationStorageLimit + '',
                gas_limit: TezosConstants_1.TezosConstants.DefaultDelegationGasLimit + '',
                delegate: delegate
            };
            if (optimizeFee) {
                const estimate = yield estimateOperation(server, 'main', delegation);
                delegation.fee = Math.ceil(estimate.gas / 10).toString();
            }
            const operations = yield appendRevealOperation(server, keyStore.publicKey, keyStore.publicKeyHash, counter - 1, [delegation]);
            return sendOperation(server, operations, signer, offset);
        });
    }
    TezosNodeWriter.sendDelegationOperation = sendDelegationOperation;
    function sendUndelegationOperation(server, signer, keyStore, fee = TezosConstants_1.TezosConstants.DefaultDelegationFee, offset = 54) {
        return __awaiter(this, void 0, void 0, function* () {
            return sendDelegationOperation(server, signer, keyStore, undefined, fee, offset);
        });
    }
    TezosNodeWriter.sendUndelegationOperation = sendUndelegationOperation;
    function sendContractOriginationOperation(server, signer, keyStore, amount, delegate, fee, storageLimit, gasLimit, code, storage, codeFormat = TezosTypes.TezosParameterFormat.Micheline, offset = 54, optimizeFee = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const counter = (yield TezosNodeReader_1.TezosNodeReader.getCounterForAccount(server, keyStore.publicKeyHash)) + 1;
            const operation = constructContractOriginationOperation(keyStore, amount, delegate, fee, storageLimit, gasLimit, code, storage, codeFormat, counter);
            if (optimizeFee) {
                const estimate = yield estimateOperation(server, 'main', operation);
                operation.fee = Math.ceil(estimate.gas / 10 + TezosConstants_1.TezosConstants.OperationFeePadding).toString();
                operation.gas_limit = estimate.gas.toString();
                operation.storage_limit = estimate.storageCost.toString();
            }
            const operations = yield appendRevealOperation(server, keyStore.publicKey, keyStore.publicKeyHash, counter - 1, [operation]);
            return sendOperation(server, operations, signer, offset);
        });
    }
    TezosNodeWriter.sendContractOriginationOperation = sendContractOriginationOperation;
    function constructContractOriginationOperation(keyStore, amount, delegate, fee, storageLimit, gasLimit, code, storage, codeFormat, counter) {
        let parsedCode = undefined;
        let parsedStorage = undefined;
        if (codeFormat === TezosTypes.TezosParameterFormat.Michelson) {
            parsedCode = JSON.parse(TezosLanguageUtil_1.TezosLanguageUtil.translateMichelsonToMicheline(code));
            log.debug(`TezosNodeWriter.sendOriginationOperation code translation:\n${code}\n->\n${JSON.stringify(parsedCode)}`);
            parsedStorage = JSON.parse(TezosLanguageUtil_1.TezosLanguageUtil.translateMichelsonToMicheline(storage));
            log.debug(`TezosNodeWriter.sendOriginationOperation storage translation:\n${storage}\n->\n${JSON.stringify(parsedStorage)}`);
        }
        else if (codeFormat === TezosTypes.TezosParameterFormat.Micheline) {
            parsedCode = JSON.parse(code);
            parsedStorage = JSON.parse(storage);
        }
        return {
            kind: 'origination',
            source: keyStore.publicKeyHash,
            fee: fee.toString(),
            counter: counter.toString(),
            gas_limit: gasLimit.toString(),
            storage_limit: storageLimit.toString(),
            balance: amount.toString(),
            delegate: delegate,
            script: { code: parsedCode, storage: parsedStorage }
        };
    }
    TezosNodeWriter.constructContractOriginationOperation = constructContractOriginationOperation;
    function sendContractInvocationOperation(server, signer, keyStore, contract, amount, fee, storageLimit, gasLimit, entrypoint, parameters, parameterFormat = TezosTypes.TezosParameterFormat.Micheline, offset = 54, optimizeFee = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const counter = (yield TezosNodeReader_1.TezosNodeReader.getCounterForAccount(server, keyStore.publicKeyHash)) + 1;
            const transaction = constructContractInvocationOperation(keyStore.publicKeyHash, counter, contract, amount, fee, storageLimit, gasLimit, entrypoint, parameters, parameterFormat);
            if (optimizeFee) {
                const estimate = yield estimateOperation(server, 'main', transaction);
                transaction.fee = Math.ceil(estimate.gas / 10 + TezosConstants_1.TezosConstants.OperationFeePadding).toString();
                transaction.gas_limit = estimate.gas.toString();
                transaction.storage_limit = estimate.storageCost.toString();
            }
            const operations = yield appendRevealOperation(server, keyStore.publicKey, keyStore.publicKeyHash, counter - 1, [transaction]);
            return sendOperation(server, operations, signer, offset);
        });
    }
    TezosNodeWriter.sendContractInvocationOperation = sendContractInvocationOperation;
    function constructContractInvocationOperation(publicKeyHash, counter, to, amount, fee, storageLimit, gasLimit, entrypoint, parameters, parameterFormat = TezosTypes.TezosParameterFormat.Micheline) {
        let transaction = {
            destination: to,
            amount: amount.toString(),
            storage_limit: storageLimit.toString(),
            gas_limit: gasLimit.toString(),
            counter: counter.toString(),
            fee: fee.toString(),
            source: publicKeyHash,
            kind: 'transaction'
        };
        if (parameters !== undefined) {
            if (parameterFormat === TezosTypes.TezosParameterFormat.Michelson) {
                const michelineParams = TezosLanguageUtil_1.TezosLanguageUtil.translateParameterMichelsonToMicheline(parameters);
                transaction.parameters = { entrypoint: entrypoint || 'default', value: JSON.parse(michelineParams) };
            }
            else if (parameterFormat === TezosTypes.TezosParameterFormat.Micheline) {
                transaction.parameters = { entrypoint: entrypoint || 'default', value: JSON.parse(parameters) };
            }
            else if (parameterFormat === TezosTypes.TezosParameterFormat.MichelsonLambda) {
                const michelineLambda = TezosLanguageUtil_1.TezosLanguageUtil.translateMichelsonToMicheline(`code ${parameters}`);
                transaction.parameters = { entrypoint: entrypoint || 'default', value: JSON.parse(michelineLambda) };
            }
        }
        else if (entrypoint !== undefined) {
            transaction.parameters = { entrypoint: entrypoint, value: [] };
        }
        return transaction;
    }
    TezosNodeWriter.constructContractInvocationOperation = constructContractInvocationOperation;
    function sendContractPing(server, signer, keyStore, to, fee, storageLimit, gasLimit, entrypoint) {
        return __awaiter(this, void 0, void 0, function* () {
            return sendContractInvocationOperation(server, signer, keyStore, to, 0, fee, storageLimit, gasLimit, entrypoint, undefined);
        });
    }
    TezosNodeWriter.sendContractPing = sendContractPing;
    function sendKeyRevealOperation(server, signer, keyStore, fee = TezosConstants_1.TezosConstants.DefaultKeyRevealFee, offset = 54) {
        return __awaiter(this, void 0, void 0, function* () {
            const counter = (yield TezosNodeReader_1.TezosNodeReader.getCounterForAccount(server, keyStore.publicKeyHash)) + 1;
            const revealOp = {
                kind: 'reveal',
                source: keyStore.publicKeyHash,
                fee: fee + '',
                counter: counter.toString(),
                gas_limit: '10000',
                storage_limit: '0',
                public_key: keyStore.publicKey
            };
            const operations = [revealOp];
            return sendOperation(server, operations, signer, offset);
        });
    }
    TezosNodeWriter.sendKeyRevealOperation = sendKeyRevealOperation;
    function sendIdentityActivationOperation(server, signer, keyStore, activationCode) {
        const activation = { kind: 'activate_account', pkh: keyStore.publicKeyHash, secret: activationCode };
        return sendOperation(server, [activation], signer);
    }
    TezosNodeWriter.sendIdentityActivationOperation = sendIdentityActivationOperation;
    function testContractInvocationOperation(server, chainid, keyStore, contract, amount, fee, storageLimit, gasLimit, entrypoint, parameters, parameterFormat = TezosTypes.TezosParameterFormat.Micheline) {
        return __awaiter(this, void 0, void 0, function* () {
            const counter = (yield TezosNodeReader_1.TezosNodeReader.getCounterForAccount(server, keyStore.publicKeyHash)) + 1;
            const transaction = constructContractInvocationOperation(keyStore.publicKeyHash, counter, contract, amount, fee, storageLimit, gasLimit, entrypoint, parameters, parameterFormat);
            return estimateOperation(server, chainid, transaction);
        });
    }
    TezosNodeWriter.testContractInvocationOperation = testContractInvocationOperation;
    function testContractDeployOperation(server, chainid, keyStore, amount, delegate, fee, storageLimit, gasLimit, code, storage, codeFormat = TezosTypes.TezosParameterFormat.Micheline) {
        return __awaiter(this, void 0, void 0, function* () {
            const counter = (yield TezosNodeReader_1.TezosNodeReader.getCounterForAccount(server, keyStore.publicKeyHash)) + 1;
            const transaction = constructContractOriginationOperation(keyStore, amount, delegate, fee, storageLimit, gasLimit, code, storage, codeFormat, counter);
            const resources = yield estimateOperation(server, chainid, transaction);
            const fixedOriginationStorageCost = 257;
            return {
                gas: resources.gas,
                storageCost: resources.storageCost + fixedOriginationStorageCost
            };
        });
    }
    TezosNodeWriter.testContractDeployOperation = testContractDeployOperation;
    function estimateOperation(server, chainid, ...operations) {
        return __awaiter(this, void 0, void 0, function* () {
            const responseJSON = yield dryRunOperation(server, chainid, ...operations);
            let gas = 0;
            let storageCost = 0;
            for (let c of responseJSON['contents']) {
                try {
                    gas += parseInt(c['metadata']['operation_result']['consumed_gas']) || 0;
                    storageCost += parseInt(c['metadata']['operation_result']['paid_storage_size_diff']) || 0;
                }
                catch (_a) { }
                const internalOperations = c['metadata']['internal_operation_results'];
                if (internalOperations === undefined) {
                    continue;
                }
                for (const internalOperation of internalOperations) {
                    const result = internalOperation['result'];
                    gas += parseInt(result['consumed_gas']) || 0;
                    storageCost += parseInt(result['paid_storage_size_diff']) || 0;
                }
            }
            const forgedOperationGroup = forgeOperations('BMLxA4tQjiu1PT2x3dMiijgvMTQo8AVxkPBPpdtM8hCfiyiC1jz', operations);
            const operationSize = forgedOperationGroup.length / 2;
            const baseFee = 100;
            const estimatedFee = Math.ceil(gas / 10 + baseFee + operationSize / 1000 * 0.25);
            const estimatedStorageBurn = Math.ceil(storageCost / 1000 * 0.25);
            return { gas, storageCost, estimatedFee, estimatedStorageBurn };
        });
    }
    TezosNodeWriter.estimateOperation = estimateOperation;
    function dryRunOperation(server, chainid, ...operations) {
        return __awaiter(this, void 0, void 0, function* () {
            const fake_signature = 'edsigu6xFLH2NpJ1VcYshpjW99Yc1TAL1m2XBqJyXrxcZQgBMo8sszw2zm626yjpA3pWMhjpsahLrWdmvX9cqhd4ZEUchuBuFYy';
            const fake_chainid = 'NetXdQprcVkpaWU';
            const fake_branch = 'BL94i2ShahPx3BoNs6tJdXDdGeoJ9ukwujUA2P8WJwULYNdimmq';
            const response = yield performPostRequest(server, `chains/${chainid}/blocks/head/helpers/scripts/run_operation`, { chain_id: fake_chainid, operation: { branch: fake_branch, contents: operations, signature: fake_signature } });
            const responseText = yield response.text();
            parseRPCError(responseText);
            const responseJSON = JSON.parse(responseText);
            return responseJSON;
        });
    }
    TezosNodeWriter.dryRunOperation = dryRunOperation;
    function parseRPCError(response) {
        let errors = '';
        try {
            const json = JSON.parse(response);
            const arr = Array.isArray(json) ? json : [json];
            if ('kind' in arr[0]) {
                errors = arr.map(e => `(${e.kind}: ${e.id})`).join(', ');
            }
            else if (arr.length === 1 && arr[0].contents.length === 1 && arr[0].contents[0].kind === 'activate_account') {
            }
            else {
                errors = arr.map(r => r.contents)
                    .map(o => o.map(c => c.metadata.operation_result)
                    .concat(o.flatMap(c => c.metadata.internal_operation_results).filter(c => !!c).map(c => c.result))
                    .map(r => parseRPCOperationResult(r))
                    .filter(i => i.length > 0)
                    .join(', '))
                    .join(', ');
            }
        }
        catch (err) {
            if (response.startsWith('Failed to parse the request body: ')) {
                errors = response.slice(34);
            }
            else {
                const hash = response.replace(/\"/g, '').replace(/\n/, '');
                if (hash.length === 51 && hash.charAt(0) === 'o') {
                }
                else {
                    log.error(`failed to parse errors: '${err}' from '${response}'\n, PLEASE report this to the maintainers`);
                }
            }
        }
        if (errors.length > 0) {
            log.debug(`errors found in response:\n${response}`);
            let e = new ErrorTypes_1.ServiceResponseError(200, '', '', '', response);
            e.message = errors;
            throw e;
        }
    }
    TezosNodeWriter.parseRPCError = parseRPCError;
    function parseRPCOperationResult(result) {
        if (result.status === 'failed') {
            return `${result.status}: ${result.errors.map(e => `(${e.kind}: ${e.id})`).join(', ')}`;
        }
        else if (result.status === 'applied') {
            return '';
        }
        else {
            return result.status;
        }
    }
})(TezosNodeWriter = exports.TezosNodeWriter || (exports.TezosNodeWriter = {}));
//# sourceMappingURL=TezosNodeWriter.js.map