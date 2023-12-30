export type InputData = {
	id: string;
	transaction_hash: string;
};

export type ProcessedData = {
	mint: string;
	owner: string;
	preBalance: string;
	postBalance: string;
	changeType: "increase" | "decrease" | "nochange";
	balanceChange: string;
};