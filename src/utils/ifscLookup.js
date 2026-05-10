/**
 * Uses the Razorpay `ifsc` npm package **dataset** (`IFSC.json`) for offline validation only.
 * The package main entry (`require('ifsc')`) pulls Node-only modules (`request`, `fs`, …) and breaks CRA / webpack 5.
 */
import ifscDataset from 'ifsc/src/IFSC.json';

const RAZORPAY_IFSC_BASE = 'https://ifsc.razorpay.com/';

function isNumericBranch(branchCodeUpper) {
    return /^(\d)+$/.test(branchCodeUpper);
}

function lookupNumeric(list, branchCodeUpper) {
    const n = parseInt(branchCodeUpper, 10);
    return list.indexOf(n) > -1;
}

function lookupString(list, branchCodeUpper) {
    return list.indexOf(branchCodeUpper) !== -1;
}

/**
 * Same rules as `ifsc.validate` from the Razorpay package (offline list check).
 * @param {string} code — normalized 11-char IFSC
 */
export function validateIfscAgainstDataset(code) {
    if (!code || code.length !== 11) return false;
    if (code[4] !== '0') return false;

    const bankCode = code.slice(0, 4).toUpperCase();
    const branchCode = code.slice(5).toUpperCase();

    if (!Object.prototype.hasOwnProperty.call(ifscDataset, bankCode)) {
        return false;
    }

    const list = ifscDataset[bankCode];

    if (isNumericBranch(branchCode)) {
        return lookupNumeric(list, branchCode);
    }

    return lookupString(list, branchCode);
}

/** Strips spaces, uppercases, keeps A–Z / 0–9 only, max 11 chars for input fields.
 * @param {unknown} raw */
export function normalizeIfsc(raw) {
    return String(raw ?? '')
        .replace(/\s/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 11);
}

/**
 * Fetches bank name and branch from the Razorpay public IFSC API (same as package `fetchDetails`).
 * Validates offline first using `IFSC.json` from the installed `ifsc` package.
 * @param {string} raw
 * @returns {Promise<{ bank: string; branch: string }>}
 */
export async function lookupIfscBankAndBranch(raw) {
    const code = normalizeIfsc(raw);
    if (!validateIfscAgainstDataset(code)) {
        const err = new Error('Invalid IFSC code');
        err.code = 'INVALID_IFSC';
        throw err;
    }

    const res = await fetch(`${RAZORPAY_IFSC_BASE}${encodeURIComponent(code)}`);
    if (res.status === 404) {
        const err = new Error('IFSC not found');
        err.code = 'NOT_FOUND';
        throw err;
    }
    if (!res.ok) {
        const err = new Error('Lookup failed');
        err.code = 'NETWORK';
        throw err;
    }

    const data = await res.json();
    const bank = typeof data?.BANK === 'string' ? data.BANK : '';
    const branch = typeof data?.BRANCH === 'string' ? data.BRANCH : '';
    return { bank, branch };
}
