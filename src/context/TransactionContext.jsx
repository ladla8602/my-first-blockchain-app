import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { contractABI, contractAddress } from '../utils/constants';

export const TransactionContext = React.createContext();

const  { ethereum } = window;

const createEthereumContract = () => {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();

    const transactionContract = new ethers.Contract(contractAddress, contractABI, signer);

    return transactionContract;
}

export const TransactionProvider = ({children}) => {

    const [formData, setFormData] = useState({ addressTo: "", amount: "", keyword: "", message: "" });
    const [currentAccount, setCurrentAccount] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [transactionCount, setTransactionCount] = useState(localStorage.getItem("transactionCount"));
    const [transactions, setTransactions] = useState([]);

    const handleChange = (e, name) => {
        setFormData((prevState) => ({...prevState, [name]: e.target.value}));
    };

    const getAllTransactions = async () => {
        try {
            if(ethereum) {
                const transactionsContract = createEthereumContract();

                const availableTransactions =
                  await transactionsContract.getAlltransactions();
                    const structuredTransactions = availableTransactions.map(
                      (transaction) => ({
                        addressTo: transaction.receiver,
                        addressFrom: transaction.sender,
                        timestamp: new Date(
                          transaction.timestamp.toNumber() * 1000
                        ).toLocaleString(),
                        message: transaction.message,
                        keyword: transaction.keyword,
                        amount: parseInt(transaction.amount._hex) / 10 ** 18,
                      })
                    );

                    console.log(structuredTransactions);

                    setTransactions(structuredTransactions);
                
                
            } else {
                console.log("Ethereum is not present");
            }

        } catch(e) {
            console.log(e);
        }
    };

    const checkIfWalletIsConnect = async () => {
        try {
            if(!ethereum) return alert("Please install Metamask");

            const accounts = await ethereum.request({method: "eth_accounts"});

            if(accounts.length) {
                setCurrentAccount(accounts[0])
                getAllTransactions();
            } else {
                console.log("no accounts found");
            }
        } catch(err) {
            console.log(err);
        }
    };

    const checkIfTransactionsExists = async () => {
        try {
            if(ethereum) {
                const transactionsContract = createEthereumContract();
                const currentTransactionCount = await transactionsContract.getTransactionCount();

                window.localStorage.setItem("transactionCount", currentTransactionCount);
            }
        } catch (err) {
            console.log(err);
            throw new Error("No ethereum object");
        }
    }

    const connectWallet = async () => {
        try {
            if(!ethereum) return alert("Please Please install Metamask.");

            const accounts = await ethereum.request({
              method: "eth_requestAccounts",
            });
            setCurrentAccount(accounts[0]);
            window.location.reload();
        } catch(err) {
            console.log(err);

            throw new Error("No ethereum object")
        }
    };

    const sendTransaction = async () => {
        try {
            if(ethereum) {
                const { addressTo, amount, keyword, message} = formData;
                const transactionsContract = createEthereumContract();
                const parsedAmount = ethers.utils.parseEther(amount);

                await ethereum.request({
                    method: "eth_sendTransaction",
                    params: [{
                        from: currentAccount,
                        to: addressTo,
                        gas: "0x5208",
                        value: parsedAmount._hex
                    }]
                });

                const transactionHash =
                  await transactionsContract.addToBloackchain(
                    addressTo,
                    parsedAmount,
                    message,
                    keyword
                  );

                setIsLoading(true);
                console.log(`Loading - ${transactionHash.hash}`);
                await transactionHash.wait();
                console.log(`Success - ${transactionHash.hash}`);
                setIsLoading(false);

                const transactionsCount =
                  await transactionsContract.getTransactionCount();

                setTransactionCount(transactionsCount.toNumber());
                window.location.reload();
            } else {
                console.log("No ethereum object")
            }
        } catch(err) {
            console.log(err)
            throw new Error("No ethereum object");
        }
    };

    useEffect(() => {
        checkIfWalletIsConnect(); 
        checkIfTransactionsExists();
    }, [transactionCount])

    return (
        <TransactionContext.Provider 
         value={{
             transactionCount,
             connectWallet,
             transactions,
             currentAccount,
             isLoading,
             sendTransaction,
             handleChange,
             formData
         }}>
            {children}
        </TransactionContext.Provider>
    );
}