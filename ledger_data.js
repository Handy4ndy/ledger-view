import xrpl from "xrpl";
import fs from "fs";

const client = new xrpl.Client("wss://xrplcluster.com");

// Define an object to store transaction data for all ledger sequences
let transactionCounts = {};

async function getLedgerInfo() {
    try {
        await client.connect();

        // Define a function to request ledger information
        const requestLedgerInfo = async () => {
            try {
                const response = await client.request({
                    "id": 14,
                    "command": "ledger",
                    "ledger_index": "validated",
                    "full": false,
                    "accounts": false,
                    "transactions": true,
                    "expand": true,
                    "owner_funds": false
                });

                // Get the ledger number and timestamp
                const ledgerIndex = response.result.ledger.ledger_index;
                const timestamp = response.result.ledger.close_time_human;

                // Calculate the total transactions
                const transactionsCount = response.result.ledger.transactions;
                const totalTransactions = transactionsCount.length;

                // Calculate the counts for each transaction type
                const transactionCountsForLedger = {};
                transactionsCount.forEach(transaction => {
                    const transactionType = transaction.TransactionType;
                    transactionCountsForLedger[transactionType] = (transactionCountsForLedger[transactionType] || 0) + 1;
                });

                // Extract transaction data with TransactionType and TransactionIndex
                const transactions = response.result.ledger.transactions.map(transaction => {
                    const transactionData = {
                        TransactionType: transaction.TransactionType,
                        TransactionIndex: transaction.metaData.TransactionIndex
                    };
                    return transactionData;
                });

                // Sort transactions chronologically by TransactionIndex
                transactions.sort((a, b) => a.TransactionIndex - b.TransactionIndex);

                // Update ledger data
                transactionCounts[ledgerIndex] = {
                    timestamp,
                    totalTransactions,
                    counts: transactionCountsForLedger,
                    transactions
                    
                };

                // Remove old ledger sequences if more than 5 are stored
                const ledgerIndices = Object.keys(transactionCounts);
                if (ledgerIndices.length > 5) {
                    const oldestLedgerIndex = Math.min(...ledgerIndices);
                    delete transactionCounts[oldestLedgerIndex];
                }

                // Write ledger data to file
                fs.writeFileSync("ledger_data.json", JSON.stringify(transactionCounts, null, 2));

            } catch (error) {
                console.error(error);
            }
        };

        // Call the function immediately and then at intervals of 3 seconds
        setInterval(requestLedgerInfo, 3000);

    } catch (error) {
        console.error(error);
    }
}

// Call the function to initiate the loop
getLedgerInfo();
