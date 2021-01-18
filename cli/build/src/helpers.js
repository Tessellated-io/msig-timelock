"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployContract = exports.loadContract = exports.compileOperation = exports.getChainId = exports.getNonce = void 0;
const taquito_1 = require("@taquito/taquito");
const fs = require("fs");
const childProcess = require("child_process");
const conseiljs_1 = require("conseiljs");
const utils_1 = __importDefault(require("./utils"));
const operation_fee_estimator_1 = __importDefault(require("./operation-fee-estimator"));
const constants_1 = __importDefault(require("./constants"));
const getNonce = async (multiSigContractAddress, nodeUrl) => {
    const tezos = new taquito_1.TezosToolkit(nodeUrl);
    const multiSigContract = await tezos.contract.at(multiSigContractAddress);
    const multiSigStorage = await multiSigContract.storage();
    const nonce = await multiSigStorage.nonce;
    return nonce.toNumber();
};
exports.getNonce = getNonce;
const getChainId = async (nodeUrl) => {
    const tezos = new taquito_1.TezosToolkit(nodeUrl);
    return tezos.rpc.getChainId();
};
exports.getChainId = getChainId;
const compileOperation = (operation) => {
    const program = `
import smartpy as sp

def operation(self):
  transfer_operation = sp.transfer_operation(
    ${operation.argSmartPy},
    sp.mutez(${operation.amountMutez}), 
    sp.contract(None, sp.address("${operation.address}"), "${operation.entrypoint}"
  ).open_some())
  
  operation_list = [ transfer_operation ]
  
  sp.result(operation_list)
`;
    const dirName = `./.msig-cli-tmp`;
    const fileName = `${dirName}/operation.py`;
    fs.mkdirSync(dirName);
    fs.writeFileSync(fileName, program);
    childProcess.execSync(`~/smartpy-cli/SmartPy.sh compile-expression "${fileName}" "operation" ${dirName}`);
    const outputFile = `${dirName}/operation_michelson.tz`;
    const compiled = fs.readFileSync(outputFile).toString();
    fs.rmdirSync(dirName, { recursive: true });
    return compiled;
};
exports.compileOperation = compileOperation;
function loadContract(filename) {
    const contractFile = filename;
    const contract = fs.readFileSync(contractFile).toString();
    return contract;
}
exports.loadContract = loadContract;
async function deployContract(nodeUrl, contractSource, storage, keystore, counter) {
    try {
        await utils_1.default.revealAccountIfNeeded(nodeUrl, keystore, await utils_1.default.signerFromKeyStore(keystore));
        const signer = await utils_1.default.signerFromKeyStore(keystore);
        const operation = conseiljs_1.TezosNodeWriter.constructContractOriginationOperation(keystore, 0, undefined, 0, constants_1.default.storageLimit, constants_1.default.gasLimit, contractSource, storage, conseiljs_1.TezosParameterFormat.Michelson, counter);
        const operationFeeEstimator = new operation_fee_estimator_1.default(nodeUrl);
        const operationnWithFees = await operationFeeEstimator.estimateAndApplyFees([operation]);
        const nodeResult = await conseiljs_1.TezosNodeWriter.sendOperation(nodeUrl, operationnWithFees, signer);
        const operationHash = nodeResult.operationGroupID
            .replace(/"/g, '')
            .replace(/\n/, '');
        const contractAddress = utils_1.default.calculateContractAddress(operationHash, 0);
        await utils_1.default.sleep(30);
        return {
            operationHash,
            contractAddress,
        };
    }
    catch (e) {
        utils_1.default.print('Caught exception, retrying...');
        utils_1.default.print(e.message);
        await utils_1.default.sleep(30);
        return deployContract(nodeUrl, contractSource, storage, keystore, counter);
    }
}
exports.deployContract = deployContract;
//# sourceMappingURL=helpers.js.map