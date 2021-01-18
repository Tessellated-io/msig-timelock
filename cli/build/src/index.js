#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initConseil = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const loglevel_1 = require("loglevel");
const conseiljs_1 = require("conseiljs");
const commands_1 = require("./commands");
const commander = __importStar(require("commander"));
const version = '0.0.3';
const program = new commander.Command();
program.version(version);
program.option('--debug', 'Print verbose output.');
program
    .command('deploy')
    .description('Deploys a multisig contract')
    .requiredOption('--threshold <number>', 'Number of singatures required to execute the multisig')
    .requiredOption('--public-keys <string>', 'Comma seperated list of public keys. Ex. edpk123,edpk456,edpk789')
    .requiredOption('--timelock-seconds <number>', 'Number of seconds the timelock lasts for')
    .requiredOption('--private-key <string>', 'Private key of the deployer, prefixed with edsk.')
    .requiredOption('--node-url <string>', 'The URL of the node to use')
    .action(async function (commandObject) {
    const conseilLogLevel = program.debug ? 'debug' : 'error';
    initConseil(conseilLogLevel);
    const publicKeys = commandObject.publicKeys.split(',').sort();
    await commands_1.deployMultisig(commandObject.timelockSeconds, commandObject.threshold, publicKeys, commandObject.nodeUrl, commandObject.deployerPrivateKey);
});
program
    .command('bytes-submit')
    .description('Get bytes to sign to submit an operation')
    .requiredOption('--target-contract <string>', 'The contract to invoke')
    .requiredOption('--target-entrypoint <string>', 'The entrypoing in the target contract to invoke')
    .requiredOption('--target-arg <string>', 'The argument, in SmartPy notation (sorry!). Ex: (sp.nat(1), (sp.address("kt1..."), sp.string("arg")))')
    .requiredOption('--node-url <string>', 'The URL of the node to use')
    .requiredOption('--multisig-address <string>', 'The address of the multisig contract.')
    .option('--nonce <number>', 'The nonce to use, or undefined. If undefined, the nonce will be fetched automatically.')
    .option('--auto', '[Experimental: Likely to fail] Attempt to automatically formulate bytes.')
    .action(async function (commandObject) {
    const conseilLogLevel = program.debug ? 'debug' : 'error';
    initConseil(conseilLogLevel);
    const operation = {
        address: commandObject.targetContract,
        argSmartPy: commandObject.targetArg,
        entrypoint: commandObject.targetEntrypoint,
        amountMutez: 0,
    };
    await commands_1.bytesToSubmit(operation, commandObject.nodeUrl, commandObject.nonce, commandObject.multisigAddress, commandObject.auto);
});
program
    .command('bytes-rotate')
    .description('Get bytes to sign for a key rotation')
    .requiredOption('--threshold <number>', 'The new threshold')
    .requiredOption('--signers <string>', 'A comma separated list of signer\'s public keys. Ex: "edpk123,edpk456,edpk789"')
    .requiredOption('--node-url <string>', 'The URL of the node to use')
    .requiredOption('--multisig-address <string>', 'The address of the multisig contract.')
    .option('--nonce <number>', 'The nonce to use, or undefined. If undefined, the nonce will be fetched automatically.')
    .option('--auto', '[Experimental: Likely to fail] Attempt to automatically formulate bytes.')
    .action(async function (commandObject) {
    const conseilLogLevel = program.debug ? 'debug' : 'error';
    initConseil(conseilLogLevel);
    const keys = commandObject.signers.split(',').sort();
    await commands_1.keyRotationbytesToSubmit(commandObject.threshold, keys, commandObject.nodeUrl, commandObject.nonce, commandObject.multisigAddress, commandObject.auto);
});
program
    .command('bytes-cancel')
    .description('Get bytes to sign for a cancel')
    .requiredOption('--operation-id <number>', 'The operation id to cancel')
    .requiredOption('--node-url <string>', 'The URL of the node to use')
    .requiredOption('--multisig-address <string>', 'The address of the multisig contract.')
    .option('--nonce <number>', 'The nonce to use, or undefined. If undefined, the nonce will be fetched automatically.')
    .option('--auto', '[Experimental: Likely to fail] Attempt to automatically formulate bytes.')
    .action(async function (commandObject) {
    const conseilLogLevel = program.debug ? 'debug' : 'error';
    initConseil(conseilLogLevel);
    await commands_1.cancelbytesToSubmit(commandObject.operationId, commandObject.nodeUrl, commandObject.nonce, commandObject.multisigAddress, commandObject.auto);
});
program
    .command('cancel')
    .description('Rotate keys')
    .requiredOption('--operation-id <number>', 'The operation id to cancel')
    .requiredOption('--node-url <string>', 'The URL of the node to use')
    .requiredOption('--multisig-address <string>', 'The address of the multisig contract.')
    .requiredOption('--private-key <string>', 'Private key of the submitter, prefixed with edsk.')
    .requiredOption('--signatures <string>', "Pairs of public key hashes and signatures, separated by colors. Ex: 'tz1abc:edsig123,tz2def:edsig456'")
    .option('--nonce <number>', 'The nonce to use, or undefined. If undefined, the nonce will be fetched automatically.')
    .option('--auto', '[Experimental: Likely to fail] Attempt to automatically inject the operation')
    .action(async function (commandObject) {
    const conseilLogLevel = program.debug ? 'debug' : 'error';
    initConseil(conseilLogLevel);
    const adddressesAndSignatures = commandObject.signatures
        .split(',')
        .sort();
    const addresses = adddressesAndSignatures.map((value) => value.split(':')[0]);
    const signatures = adddressesAndSignatures.map((value) => value.split(':')[1]);
    await commands_1.cancel(commandObject.operationId, addresses, signatures, commandObject.nonce, commandObject.multisigAddress, commandObject.nodeUrl, commandObject.privateKey, commandObject.auto);
});
program
    .command('rotate')
    .description('Rotate keys')
    .requiredOption('--threshold <number>', 'The new threshold')
    .requiredOption('--signers <string>', 'A comma separated list of signer\'s public keys. Ex: "edpk123,edpk456,edpk789"')
    .requiredOption('--node-url <string>', 'The URL of the node to use')
    .requiredOption('--multisig-address <string>', 'The address of the multisig contract.')
    .requiredOption('--private-key <string>', 'Private key of the submitter, prefixed with edsk.')
    .requiredOption('--signatures <string>', "Pairs of public key hashes and signatures, separated by colors. Ex: 'tz1abc:edsig123,tz2def:edsig456'")
    .option('--nonce <number>', 'The nonce to use, or undefined. If undefined, the nonce will be fetched automatically.')
    .option('--auto', '[Experimental: Likely to fail] Attempt to automatically inject the operation')
    .action(async function (commandObject) {
    const conseilLogLevel = program.debug ? 'debug' : 'error';
    initConseil(conseilLogLevel);
    const keys = commandObject.signers.split(',').sort();
    const adddressesAndSignatures = commandObject.signatures
        .split(',')
        .sort();
    const addresses = adddressesAndSignatures.map((value) => value.split(':')[0]);
    const signatures = adddressesAndSignatures.map((value) => value.split(':')[1]);
    await commands_1.rotateKey(commandObject.threshold, keys, addresses, signatures, commandObject.nonce, commandObject.multisigAddress, commandObject.nodeUrl, commandObject.privateKey, commandObject.auto);
});
program
    .command('submit')
    .description('Submit an operation')
    .requiredOption('--target-contract <string>', 'The contract to invoke')
    .requiredOption('--target-entrypoint <string>', 'The entrypoing in the target contract to invoke')
    .requiredOption('--target-arg <string>', 'The argument, in SmartPy notation (sorry!). Ex: (sp.nat(1), (sp.address("kt1..."), sp.string("arg")))')
    .requiredOption('--node-url <string>', 'The URL of the node to use')
    .requiredOption('--multisig-address <string>', 'The address of the multisig contract.')
    .requiredOption('--private-key <string>', 'Private key of the submitter, prefixed with edsk.')
    .requiredOption('--signatures <string>', "Pairs of public key hashes and signatures, separated by colors. Ex: 'tz1abc:edsig123,tz2def:edsig456'")
    .option('--nonce <number>', 'The nonce to use, or undefined.')
    .option('--auto', '[Experimental: Likely to fail] Attempt to automatically inject the operation')
    .action(async function (commandObject) {
    const conseilLogLevel = program.debug ? 'debug' : 'error';
    initConseil(conseilLogLevel);
    const operation = {
        address: commandObject.targetContract,
        argSmartPy: commandObject.targetArg,
        entrypoint: commandObject.targetEntrypoint,
        amountMutez: 0,
    };
    const adddressesAndSignatures = commandObject.signatures
        .split(',')
        .sort();
    const addresses = adddressesAndSignatures.map((value) => value.split(':')[0]);
    const signatures = adddressesAndSignatures.map((value) => value.split(':')[1]);
    await commands_1.submit(operation, addresses, signatures, commandObject.nonce, commandObject.multisigAddress, commandObject.nodeUrl, commandObject.privateKey, commandObject.auto);
});
program
    .command('execute')
    .description('Executes an operation in the timelock')
    .requiredOption('--operation-id <number>', 'The operation ID to execute')
    .requiredOption('--node-url <string>', 'The URL of the node to use')
    .requiredOption('--multisig-address <string>', 'The address of the multisig contract.')
    .requiredOption('--private-key <string>', 'Private key of the submitter, prefixed with edsk.')
    .action(async function (commandObject) {
    const conseilLogLevel = program.debug ? 'debug' : 'error';
    initConseil(conseilLogLevel);
    await commands_1.execute(commandObject.operationId, commandObject.multisigAddress, commandObject.nodeUrl, commandObject.privateKey);
});
function initConseil(conseilLogLevel = 'error') {
    const logger = loglevel_1.getLogger('conseiljs');
    logger.setLevel(conseilLogLevel, false);
    conseiljs_1.registerLogger(logger);
    conseiljs_1.registerFetch(node_fetch_1.default);
}
exports.initConseil = initConseil;
program.parse();
//# sourceMappingURL=index.js.map