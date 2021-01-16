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
Object.defineProperty(exports, "__esModule", { value: true });
const jsonpath_plus_1 = require("jsonpath-plus");
const TezosTypes = __importStar(require("../../../types/tezos/TezosChainTypes"));
const TezosMessageUtil_1 = require("../TezosMessageUtil");
const TezosNodeReader_1 = require("../TezosNodeReader");
const TezosNodeWriter_1 = require("../TezosNodeWriter");
const TezosContractUtils_1 = require("./TezosContractUtils");
const TezosConseilClient_1 = require("../../../reporting/tezos/TezosConseilClient");
const TezosChainTypes_1 = require("../../../types/tezos/TezosChainTypes");
const CONTRACT_CHECKSUMS = {
    token: 'd48b45bd77d2300026fe617c5ba7670e',
    oven: '5e3c30607da21a0fc30f7be61afb15c7',
    core: '7b9b5b7e7f0283ff6388eb783e23c452'
};
const SCRIPT_CHECKSUMS = {
    token: '',
    oven: '',
    core: ''
};
var WrappedTezosHelper;
(function (WrappedTezosHelper) {
    function verifyDestination(nodeUrl, tokenContractAddress, ovenContractAddress, coreContractAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenMatched = TezosContractUtils_1.TezosContractUtils.verifyDestination(nodeUrl, tokenContractAddress, CONTRACT_CHECKSUMS.token);
            const ovenMatched = TezosContractUtils_1.TezosContractUtils.verifyDestination(nodeUrl, ovenContractAddress, CONTRACT_CHECKSUMS.oven);
            const coreMatched = TezosContractUtils_1.TezosContractUtils.verifyDestination(nodeUrl, coreContractAddress, CONTRACT_CHECKSUMS.core);
            return tokenMatched && ovenMatched && coreMatched;
        });
    }
    WrappedTezosHelper.verifyDestination = verifyDestination;
    function verifyScript(tokenScript, ovenScript, coreScript) {
        const tokenMatched = TezosContractUtils_1.TezosContractUtils.verifyScript(tokenScript, SCRIPT_CHECKSUMS.token);
        const ovenMatched = TezosContractUtils_1.TezosContractUtils.verifyScript(ovenScript, SCRIPT_CHECKSUMS.oven);
        const coreMatched = TezosContractUtils_1.TezosContractUtils.verifyScript(coreScript, SCRIPT_CHECKSUMS.core);
        return tokenMatched && ovenMatched && coreMatched;
    }
    WrappedTezosHelper.verifyScript = verifyScript;
    function getSimpleStorage(server, address) {
        return __awaiter(this, void 0, void 0, function* () {
            const storageResult = yield TezosNodeReader_1.TezosNodeReader.getContractStorage(server, address);
            console.log(JSON.stringify(storageResult));
            return {
                balanceMap: Number(jsonpath_plus_1.JSONPath({ path: '$.args[1].args[0].args[1].args[0].int', json: storageResult })[0]),
                approvalsMap: Number(jsonpath_plus_1.JSONPath({ path: '$.args[1].args[0].args[0].args[1].int', json: storageResult })[0]),
                supply: Number(jsonpath_plus_1.JSONPath({ path: '$.args[1].args[1].args[1].int', json: storageResult })[0]),
                administrator: jsonpath_plus_1.JSONPath({ path: '$.args[1].args[0].args[0].args[0].string', json: storageResult })[0],
                paused: (jsonpath_plus_1.JSONPath({ path: '$.args[1].args[1].args[0].prim', json: storageResult })[0]).toString().toLowerCase().startsWith('t'),
                pauseGuardian: jsonpath_plus_1.JSONPath({ path: '$.args[1].args[0].args[1].args[1].string', json: storageResult })[0],
                outcomeMap: Number(jsonpath_plus_1.JSONPath({ path: '$.args[0].args[0].int', json: storageResult })[0]),
                swapMap: Number(jsonpath_plus_1.JSONPath({ path: '$.args[0].args[1].int', json: storageResult })[0])
            };
        });
    }
    WrappedTezosHelper.getSimpleStorage = getSimpleStorage;
    function getAccountBalance(server, mapid, account) {
        return __awaiter(this, void 0, void 0, function* () {
            const packedKey = TezosMessageUtil_1.TezosMessageUtils.encodeBigMapKey(Buffer.from(TezosMessageUtil_1.TezosMessageUtils.writePackedData(account, 'address'), 'hex'));
            const mapResult = yield TezosNodeReader_1.TezosNodeReader.getValueForBigMapKey(server, mapid, packedKey);
            if (mapResult === undefined) {
                return 0;
            }
            const numberString = jsonpath_plus_1.JSONPath({ path: '$.int', json: mapResult });
            return Number(numberString);
        });
    }
    WrappedTezosHelper.getAccountBalance = getAccountBalance;
    function transferBalance(nodeUrl, signer, keystore, tokenContractAddress, fee, sourceAddress, destinationAddress, amount, gasLimit = 51300, storageLimit = 70) {
        return __awaiter(this, void 0, void 0, function* () {
            const parameters = `Pair "${sourceAddress}" (Pair "${destinationAddress}" ${amount})`;
            const nodeResult = yield TezosNodeWriter_1.TezosNodeWriter.sendContractInvocationOperation(nodeUrl, signer, keystore, tokenContractAddress, 0, fee, storageLimit, gasLimit, 'transfer', parameters, TezosTypes.TezosParameterFormat.Michelson);
            return TezosContractUtils_1.TezosContractUtils.clearRPCOperationGroupHash(nodeResult.operationGroupID);
        });
    }
    WrappedTezosHelper.transferBalance = transferBalance;
    function depositToOven(nodeUrl, signer, keystore, ovenAddress, fee, amountMutez, gasLimit = 150000, storageLimit = 10) {
        return __awaiter(this, void 0, void 0, function* () {
            const parameters = 'Unit';
            const nodeResult = yield TezosNodeWriter_1.TezosNodeWriter.sendContractInvocationOperation(nodeUrl, signer, keystore, ovenAddress, amountMutez, fee, storageLimit, gasLimit, '', parameters, TezosTypes.TezosParameterFormat.Michelson);
            return TezosContractUtils_1.TezosContractUtils.clearRPCOperationGroupHash(nodeResult.operationGroupID);
        });
    }
    WrappedTezosHelper.depositToOven = depositToOven;
    function withdrawFromOven(nodeUrl, signer, keystore, ovenAddress, fee, amountMutez, gasLimit = 121000, storageLimit = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const parameters = `${amountMutez}`;
            const nodeResult = yield TezosNodeWriter_1.TezosNodeWriter.sendContractInvocationOperation(nodeUrl, signer, keystore, ovenAddress, 0, fee, storageLimit, gasLimit, 'withdraw', parameters, TezosTypes.TezosParameterFormat.Michelson);
            return TezosContractUtils_1.TezosContractUtils.clearRPCOperationGroupHash(nodeResult.operationGroupID);
        });
    }
    WrappedTezosHelper.withdrawFromOven = withdrawFromOven;
    function listOvens(serverInfo, coreContractAddress, ovenOwner, ovenListBigMapId) {
        return __awaiter(this, void 0, void 0, function* () {
            const mapData = yield TezosConseilClient_1.TezosConseilClient.getBigMapData(serverInfo, coreContractAddress);
            if (mapData === undefined) {
                throw new Error("Could not fetch map data!");
            }
            const { maps } = mapData;
            let ovenListMap = undefined;
            for (let i = 0; i < maps.length; i++) {
                if (maps[i].definition.index === ovenListBigMapId) {
                    ovenListMap = maps[i];
                    break;
                }
            }
            if (ovenListMap === undefined) {
                throw new Error("Could not find specified map ID!");
            }
            const { content } = ovenListMap;
            const normalizedOvenList = content.map((oven) => {
                return {
                    key: TezosMessageUtil_1.TezosMessageUtils.readAddress(oven.key.replace(/\"/g, '').replace(/\n/, '').replace("0x", "")),
                    value: TezosMessageUtil_1.TezosMessageUtils.readAddress(oven.value.replace(/\"/g, '').replace(/\n/, '').replace("0x", ""))
                };
            });
            const ownedOvens = normalizedOvenList.filter((oven) => {
                return ovenOwner === oven.value;
            });
            return ownedOvens.map((oven) => {
                return oven.key;
            });
        });
    }
    WrappedTezosHelper.listOvens = listOvens;
    function deployOven(nodeUrl, signer, keystore, fee, coreAddress, baker = undefined, gasLimit = 115000, storageLimit = 1100) {
        return __awaiter(this, void 0, void 0, function* () {
            const entryPoint = 'runEntrypointLambda';
            const lambdaName = 'createOven';
            const bakerParam = baker !== undefined ? `Some "${baker}"` : 'None';
            const bytes = TezosMessageUtil_1.TezosMessageUtils.writePackedData(`Pair ${bakerParam} "${keystore.publicKeyHash}"`, 'pair (option key_hash) address', TezosChainTypes_1.TezosParameterFormat.Michelson);
            const parameters = `Pair "${lambdaName}" 0x${bytes}`;
            const nodeResult = yield TezosNodeWriter_1.TezosNodeWriter.sendContractInvocationOperation(nodeUrl, signer, keystore, coreAddress, 0, fee, storageLimit, gasLimit, entryPoint, parameters, TezosTypes.TezosParameterFormat.Michelson);
            const operationHash = TezosContractUtils_1.TezosContractUtils.clearRPCOperationGroupHash(nodeResult.operationGroupID);
            const ovenAddress = TezosMessageUtil_1.TezosMessageUtils.calculateContractAddress(operationHash, 0);
            return {
                operationHash,
                ovenAddress
            };
        });
    }
    WrappedTezosHelper.deployOven = deployOven;
    function setOvenBaker(nodeUrl, signer, keystore, fee, ovenAddress, bakerAddress, gasLimit = 23500, storageLimit = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const parameters = `Some "${bakerAddress}"`;
            const nodeResult = yield TezosNodeWriter_1.TezosNodeWriter.sendContractInvocationOperation(nodeUrl, signer, keystore, ovenAddress, 0, fee, storageLimit, gasLimit, 'setDelegate', parameters, TezosTypes.TezosParameterFormat.Michelson);
            return TezosContractUtils_1.TezosContractUtils.clearRPCOperationGroupHash(nodeResult.operationGroupID);
        });
    }
    WrappedTezosHelper.setOvenBaker = setOvenBaker;
    function clearOvenBaker(nodeUrl, signer, keystore, fee, ovenAddress, gasLimit = 23500, storageLimit = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const parameters = `None`;
            const nodeResult = yield TezosNodeWriter_1.TezosNodeWriter.sendContractInvocationOperation(nodeUrl, signer, keystore, ovenAddress, 0, fee, storageLimit, gasLimit, 'setDelegate', parameters, TezosTypes.TezosParameterFormat.Michelson);
            return TezosContractUtils_1.TezosContractUtils.clearRPCOperationGroupHash(nodeResult.operationGroupID);
        });
    }
    WrappedTezosHelper.clearOvenBaker = clearOvenBaker;
    function getStatistics(tezosNode, conseilServer, address) {
        return __awaiter(this, void 0, void 0, function* () {
            const storage = yield getSimpleStorage(tezosNode, address);
            const count = yield TezosConseilClient_1.TezosConseilClient.countKeysInMap(conseilServer, storage.balanceMap);
            return {
                supply: storage.supply,
                holderCount: count
            };
        });
    }
    WrappedTezosHelper.getStatistics = getStatistics;
})(WrappedTezosHelper = exports.WrappedTezosHelper || (exports.WrappedTezosHelper = {}));
//# sourceMappingURL=WrappedTezosHelper.js.map