import BigNumber from 'bignumber.js';
import { parse } from 'csv-parse';
import * as fs from 'fs';

import {
  InputData,
  ProcessedData,
} from './definitions';

export async function importData(csvFilePath: string) {
	const inputDataFile = fs.readFileSync(csvFilePath, { encoding: "utf-8" });
	const headers = ["id", "transaction_hash"];

	let inputData: InputData[] = [];

	parse(inputDataFile, { delimiter: ",", columns: headers, fromLine: 2 }, (err, result) => {
		if (err) {
			throw new Error(err.message);
		}
		inputData.push(...result);
	});

	await new Promise((res) => {
		setTimeout(res, 500);
	});

	return inputData;
}

export function getUrlFromEnv() {
	const url = process.env.RPC_URL;
	if (url === undefined || url === "") {
		throw new Error("Missing RPC_URL in environment");
	}
	return url;
}

const TEN_BIGNUM = BigNumber(10);

export function parseToDecimal(amount: string, decimals: number) {
	return BigNumber(amount).div(TEN_BIGNUM.pow(decimals)).toFixed();
}

export function exportData(data: Map<string, ProcessedData[]>, filePath: string) {
	const objects = parseToObject(data);
	const json = JSON.stringify(objects)

	fs.writeFileSync(filePath, json, "utf-8")
}

function parseToObject(data: Map<string, ProcessedData[]>) {
	const obj: { [key: string]: ProcessedData[]; } = {};
	for (const item of [...data]) {
		const [key, value] = item;
		obj[key] = value;
	}
	return obj;
}

