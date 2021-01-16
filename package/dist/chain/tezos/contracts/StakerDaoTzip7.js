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
const CONTRACT_CHECKSUMS = {
    token: 'd48b45bd77d2300026fe617c5ba7670e',
};
const SCRIPT_CHECKSUMS = {
    token: '',
};
exports.StakerDaoTzip7 = {
    verifyDestination: function (nodeUrl, tokenContractAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield TezosContractUtils_1.TezosContractUtils.verifyDestination(nodeUrl, tokenContractAddress, CONTRACT_CHECKSUMS.token);
        });
    },
    verifyScript: function (tokenScript) {
        return TezosContractUtils_1.TezosContractUtils.verifyScript(tokenScript, SCRIPT_CHECKSUMS.token);
    },
    getSimpleStorage: function (server, address) {
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
    },
    getAccountBalance: function (server, mapid, account) {
        return __awaiter(this, void 0, void 0, function* () {
            const packedKey = TezosMessageUtil_1.TezosMessageUtils.encodeBigMapKey(Buffer.from(TezosMessageUtil_1.TezosMessageUtils.writePackedData(account, 'address'), 'hex'));
            const mapResult = yield TezosNodeReader_1.TezosNodeReader.getValueForBigMapKey(server, mapid, packedKey);
            if (mapResult === undefined) {
                throw new Error(`Map ${mapid} does not contain a record for ${account}`);
            }
            const numberString = jsonpath_plus_1.JSONPath({ path: '$.int', json: mapResult });
            return Number(numberString);
        });
    },
    transferBalance: function (nodeUrl, signer, keystore, tokenContractAddress, fee, sourceAddress, destinationAddress, amount, gasLimit = 51300, storageLimit = 70) {
        return __awaiter(this, void 0, void 0, function* () {
            const parameters = `Pair "${sourceAddress}" (Pair "${destinationAddress}" ${amount})`;
            const nodeResult = yield TezosNodeWriter_1.TezosNodeWriter.sendContractInvocationOperation(nodeUrl, signer, keystore, tokenContractAddress, 0, fee, storageLimit, gasLimit, 'transfer', parameters, TezosTypes.TezosParameterFormat.Michelson);
            return TezosContractUtils_1.TezosContractUtils.clearRPCOperationGroupHash(nodeResult.operationGroupID);
        });
    }
};
//# sourceMappingURL=StakerDaoTzip7.js.map