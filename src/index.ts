import BigNumber from 'bignumber.js';
import dotenv from 'dotenv';
import * as path from 'path';

import { Connection } from '@solana/web3.js';

import { ProcessedData } from './definitions';
import {
  exportData,
  getUrlFromEnv,
  importData,
  parseToDecimal,
} from './utils';

dotenv.config();

const URL = getUrlFromEnv();
const CONNECTION = new Connection(URL);
const ZERO_STR = "0";

(async () => {
	const csvFilePath = path.resolve(__dirname, "input", "data.csv");
	const inputData = await importData(csvFilePath);

	const usdcTransfers: Map<string, ProcessedData[]> = new Map();
	const swapAndTransfers: Map<string, ProcessedData[]> = new Map();

	for (let i = 0; i < inputData.length; i++) {
		const data = inputData[i];
		console.log("Processing Transaction No.: %d - %s \n", i, data.transaction_hash);

		const transactionResponse = await CONNECTION.getParsedTransaction(data.transaction_hash, { commitment: "finalized" });

		if (transactionResponse) {
			const meta = transactionResponse.meta!;
			if (meta === null) {
				throw new Error("Meta is null");
			}

			const preTokenBalances = meta.preTokenBalances!;

			if (preTokenBalances === undefined || preTokenBalances === null) {
				throw new Error("preTokenBalance is null or undefined");
			}

			const postTokenBalances = meta.postTokenBalances!;

			if (postTokenBalances === undefined || postTokenBalances === null) {
				throw new Error("postTokenBalance is null or undefined");
			}

			const processedDataList: ProcessedData[] = [];

			for (let i = 0; i < preTokenBalances.length; i++) {
				const preTokenBalance = preTokenBalances[i];

				const owner = preTokenBalance!.owner!;
				if (owner === undefined) {
					throw new Error("owner is undefined");
				}

				const mint = preTokenBalance.mint;

				const processedData: ProcessedData = {
					owner: owner,
					mint: mint,
					changeType: "nochange",
					preBalance: parseToDecimal(preTokenBalance.uiTokenAmount.amount, preTokenBalance.uiTokenAmount.decimals),
					postBalance: ZERO_STR,
					balanceChange: ZERO_STR,
				};

				const postTokenBalanceIndex = postTokenBalances.findIndex(
					(tokenData) => preTokenBalance.mint === tokenData.mint && preTokenBalance.owner! === tokenData.owner!,
				);

				if (postTokenBalanceIndex > -1) {
					const deletedPostTokenBalances = postTokenBalances.splice(postTokenBalanceIndex, 1);
					const postTokenBalance = deletedPostTokenBalances[0];
					processedData.postBalance = parseToDecimal(
						postTokenBalance.uiTokenAmount.amount,
						postTokenBalance.uiTokenAmount.decimals,
					);

					const diff = BigNumber(processedData.preBalance).minus(processedData.postBalance);
					if (diff.isLessThan(0)) {
						processedData.balanceChange = diff.abs().toFixed();
						processedData.changeType = "increase";
					} else if (diff.isGreaterThan(0)) {
						processedData.balanceChange = diff.abs().toFixed();
						processedData.changeType = "decrease";
					} else {
						processedData.balanceChange = ZERO_STR;
						processedData.changeType = "nochange";
					}
				}
				processedDataList.push(processedData);
			}

			if (postTokenBalances.length > 0) {
				for (let i = 0; i < postTokenBalances.length; i++) {
					const postTokenBalance = postTokenBalances[i];

					// console.log({ postTokenBalance });

					const owner = postTokenBalance.owner!;
					if (owner === undefined) {
						throw new Error("owner is undefined");
					}

					const mint = postTokenBalance.mint;
					const processedData: ProcessedData = {
						owner: owner,
						mint: mint,
						balanceChange: parseToDecimal(postTokenBalance.uiTokenAmount.amount, postTokenBalance.uiTokenAmount.decimals),
						changeType: "increase",
						postBalance: postTokenBalance.uiTokenAmount.amount,
						preBalance: ZERO_STR,
					};

					processedDataList.push(processedData);
				}
			}

			if (processedDataList.length <= 2) {
				console.log("Transaction is usdc transfer");
				usdcTransfers.set(data.transaction_hash, processedDataList);
			} else {
				console.log("Transaction is swap and usdc transfer");
				swapAndTransfers.set(data.transaction_hash, processedDataList);
			}
		}
	}

	console.log("Exporting swap and transfer data");
	const filePathForUsdcTransfer = path.resolve(__dirname, "output", "usdcTransfers.json");
	exportData(usdcTransfers, filePathForUsdcTransfer);

	console.log("Exporting swap and transfer data");
	const filePathForSwapAndTransfer = path.resolve(__dirname, "output", "swapAndTransfers.json");
	exportData(swapAndTransfers, filePathForSwapAndTransfer);
})();
