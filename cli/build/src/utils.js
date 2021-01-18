"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const conseiljs_1 = require("conseiljs");
const conseiljs_softsigner_1 = require("conseiljs-softsigner");
const asn1_1 = __importDefault(require("./asn1"));
const prefixes_1 = __importDefault(require("./prefixes"));
const base58Check = require('bs58check');
const blakejs = require('blakejs');
const sodium = require('libsodium-wrappers');
const secp256k1 = require('secp256k1');
const utils = {
    compressKey(uncompressed) {
        const uncompressedKeySize = 65;
        if (uncompressed.length !== uncompressedKeySize) {
            throw new Error('Invalid length for uncompressed key');
        }
        const firstByte = uncompressed[0];
        if (firstByte !== 4) {
            throw new Error('Invalid compression byte');
        }
        const lastByte = uncompressed[64];
        const magicByte = lastByte % 2 === 0 ? 2 : 3;
        const xBytes = uncompressed.slice(1, 33);
        return this.mergeBytes(new Uint8Array([magicByte]), xBytes);
    },
    async sleep(seconds) {
        const milliseconds = seconds * 1000;
        return new Promise((resolve) => setTimeout(resolve, milliseconds));
    },
    print(message) {
        console.log(message);
    },
    async signerFromKeyStore(keyStore) {
        const bytes = conseiljs_1.TezosMessageUtils.writeKeyWithHint(keyStore.secretKey, 'edsk');
        return await conseiljs_softsigner_1.SoftSigner.createSigner(bytes, -1);
    },
    async revealAccountIfNeeded(tezosNodeURL, keyStore, signer) {
        const publicKeyHash = keyStore.publicKeyHash;
        if (await conseiljs_1.TezosNodeReader.isManagerKeyRevealedForAccount(tezosNodeURL, publicKeyHash)) {
            return;
        }
        this.print(`Account ${publicKeyHash} is not revealed. Sending a one time operation to reveal the account.`);
        const result = await conseiljs_1.TezosNodeWriter.sendKeyRevealOperation(tezosNodeURL, signer, keyStore, undefined);
        const hash = result.operationGroupID.replace(/"/g, '');
        this.print(`Reveal sent with hash: ${hash}`);
        this.print(`Waiting for operation to be included...`);
        let isRevealed = false;
        while (!isRevealed) {
            await this.sleep(15);
            this.print('Still waiting');
            isRevealed = await conseiljs_1.TezosNodeReader.isManagerKeyRevealedForAccount(tezosNodeURL, publicKeyHash);
        }
        this.print(`All done!`);
        this.print(``);
    },
    async keyStoreFromPrivateKey(privateKey) {
        if (!privateKey.startsWith('edsk')) {
            throw new Error('Only edsk keys are supported');
        }
        if (privateKey.length === 54) {
            await sodium.ready;
            const decodedBytes = base58Check.decode(privateKey).slice(4);
            const keyPair = sodium.crypto_sign_seed_keypair(decodedBytes);
            const derivedPrivateKeyBytes = this.mergeBytes(prefixes_1.default.ed25519SecretKey, keyPair.privateKey);
            const derivedPrivateKey = base58Check.encode(derivedPrivateKeyBytes);
            return await conseiljs_softsigner_1.KeyStoreUtils.restoreIdentityFromSecretKey(derivedPrivateKey);
        }
        else {
            return await conseiljs_softsigner_1.KeyStoreUtils.restoreIdentityFromSecretKey(privateKey);
        }
    },
    calculateContractAddress(operationHash, index) {
        const decoded = this.base58CheckDecode(operationHash).slice(2);
        let decodedAndOperationPrefix = [];
        for (let i = 0; i < decoded.length; i++) {
            decodedAndOperationPrefix.push(decoded[i]);
        }
        decodedAndOperationPrefix = decodedAndOperationPrefix.concat([
            (index & 0xff000000) >> 24,
            (index & 0x00ff0000) >> 16,
            (index & 0x0000ff00) >> 8,
            index & 0x000000ff,
        ]);
        const hash = this.blake2b(new Uint8Array(decodedAndOperationPrefix), 20);
        return this.base58CheckEncode(hash, prefixes_1.default.smartContractAddress);
    },
    base58CheckDecode(input) {
        return base58Check.decode(input);
    },
    scale(value, scale) {
        return parseInt(`${value * 10 ** scale}`);
    },
    blake2b(input, length) {
        return blakejs.blake2b(input, null, length);
    },
    normalizeSignature(signature) {
        return secp256k1.signatureNormalize(signature);
    },
    derSignatureToRaw(derSignature) {
        const decodedSignature = asn1_1.default.decode(derSignature);
        const rHex = decodedSignature.sub[0].toHexStringContent();
        const sHex = decodedSignature.sub[1].toHexStringContent();
        return this.hexToBytes(rHex + sHex);
    },
    base58CheckEncode(bytes, prefix) {
        const prefixedBytes = this.mergeBytes(prefix, bytes);
        return base58Check.encode(prefixedBytes);
    },
    mergeBytes(a, b) {
        const merged = new Uint8Array(a.length + b.length);
        merged.set(a);
        merged.set(b, a.length);
        return merged;
    },
    isHex(input) {
        const hexRegEx = /([0-9]|[a-f])/gim;
        return (input.match(hexRegEx) || []).length === input.length;
    },
    hexToBytes(hex) {
        if (!this.isHex(hex)) {
            throw new Error(`Invalid hex${hex}`);
        }
        return Uint8Array.from(Buffer.from(hex, 'hex'));
    },
    bytesToHex(bytes) {
        return Buffer.from(bytes).toString('hex');
    },
};
exports.default = utils;
//# sourceMappingURL=utils.js.map