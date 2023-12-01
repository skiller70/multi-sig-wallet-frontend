import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { toast } from "react-toastify";
import useDebounce from "../hooks/useDebounce";

import {
  usePrepareContractWrite,
  useContractWrite,
  useWaitForTransaction,
  useContractReads,
  useContractEvent,
} from "wagmi";

import MultiSigWallet from "../artifacts/contracts/MultiSigWallet.sol/MultiSigWallet.json";
import OwnersActions from "./OwnersActions";
import { MultiSignWallet } from "./MultiSignWallet";

function UserFeatures({ scAddress, userAddress, quorem, isOwner }) {
  const multiSigWalletContract = {
    address: scAddress,
    abi: MultiSigWallet.abi,
  };

  const [depositAmt, setDepositAmt] = useState(0);
  const debouncedDeposit = useDebounce(depositAmt, 1500);

  useContractEvent({
    address: scAddress,
    abi: MultiSigWallet.abi,
    eventName: "CreateWithdrawTx",
    listener(logs) {
      // console.log("createWithdrawTxn event: ", logs);

      const userEvent = logs[0].args;
      // console.log("user createWithdrawTxnEvent: ", userEvent);
      const depositedAmt = formatEther(userEvent?.amount?.toString());
      // Display pop up notification
      toast.success(
        `Withdrawal txnId: ${parseInt(
          userEvent?.transactionindex
        )} with withdrawal amount: ${depositedAmt} Eth created!`
      );
    },
  });

  useContractEvent({
    address: scAddress,
    abi: MultiSigWallet.abi,
    eventName: "ApproveWithdrawTx",
    listener(logs) {
      // console.log("approveWithdrawTxn event: ", logs);
      const userEvent = logs[0].args;
      console.log("user approveWithdrawTxnEvent: ", userEvent);
      // Display pop up notification
      toast.success(
        `txnId: ${parseInt(
          userEvent?.transactionIndex
        )} is approved and sent to recipent!`
      );
    },
  });

  // Contract Read Functions
  const { data: readData, isLoading: readIsLoading } = useContractReads({
    contracts: [{ ...multiSigWalletContract, functionName: "getWithdrawTxes" }],
    watch: true,
  });

  // console.log("readData: ", readData);

  // Add id to return readData transaction List
  const txnsWithId = !readIsLoading
    ? readData[0]?.result?.map((txn, index) => ({
        ...txn,
        id: index,
      }))
    : [];

  // Filter for unapprove transactions only
  const unapprovedTxns = txnsWithId?.filter(
    (txn) => parseInt(txn?.approvals?.toString()) < quorem
  );
  // console.log("originalList: ", txnsWithId);
  // console.log("FilteredList: ", unapprovedTxns);

  const {
    config: depositConfig,
    error: prepareDepositError,
    isError: prepareDepositIsError,
  } = usePrepareContractWrite({
    ...multiSigWalletContract,
    functionName: "deposit",
    value: debouncedDeposit,
    enabled: Boolean(debouncedDeposit),
  });
  const {
    data: writeData,
    write: depositWrite,
    error: depositError,
    isError: depositIsError,
  } = useContractWrite(depositConfig);
  // console.log("WriteData: ", writeData);

  const { isLoading: depositIsLoading, isSuccess: depositIsSuccess } =
    useWaitForTransaction({
      hash: writeData?.hash,
    });

  const onChangeDeposit = (event) => {
    const amt = event.target.value;
    const depositEther = parseEther(amt);
    // console.log("Deposit amount: ", depositEther);
    setDepositAmt(depositEther);
  };

  // useEffect(() => {
  //   console.log("debouncedDeposit: ", debouncedDeposit);
  // }, [debouncedDeposit]);

  return (
    <>
      <div>
        <div className="user-section mt-4"><h1>User</h1>
        <Form className="mt-4">
          <Form.Group
            className="mb-3 d-flex user-label"
         
            controlId="formUserAddress"
          >
            <Form.Label
          
              style={{
                fontFamily: "Saira Semi Condensed, sans-serif",
                fontSize: "17px",
                color: "#18181b",
                width: "120px",
                marginTop: "15px",
                marginLeft: "17px",
                marginBottom: "13px",
              }}
            >
              User address:
            </Form.Label>
            <Form.Control
              style={{
                fontFamily: "Saira Semi Condensed, sans-serif",
                fontSize: "17px",
                color: "#18181b",
                marginTop: "6px",
              }}
              type="text"
              placeholder={userAddress}
              plaintext
              readOnly
            />
          </Form.Group>
          <div>
            <Form.Group className="mb-3" controlId="formDepositEther">
              <Form.Label
                style={{ fontFamily: "Saira Semi Condensed, sans-serif" }}
              >
                Deposit Ether
              </Form.Label>
              <Form.Control
                className="deposit-input-field"
                type="number"
                step="0.000001"
                placeholder="Enter amount in ether"
                onChange={onChangeDeposit}
              />
            </Form.Group>

            <div className="user-button">
              <Button
                className="deposit-button"
                // disabled={!depositWrite || depositIsLoading}
                variant="danger"
                onClick={() => depositWrite?.()}
              >
                {depositIsLoading ? "Depositing..." : "Deposit"}
              </Button>
            </div>
          </div>

          {depositIsSuccess && (
            <div>
              Successfully deposited {depositAmt} ETH!
              <div>
                <a
                  href={`https://etherscan.io/tx/${writeData?.hash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Etherscan
                </a>
              </div>
            </div>
          )}
          {(prepareDepositIsError || depositIsError) && (
            <div>Error: {(prepareDepositError || depositError)?.message}</div>
          )}
        </Form>
        </div>
        <div className="transaction-section">
        <div className=" mt-6">
       <h2
          style={{
            fontFamily: "Saira Semi Condensed, sans-serif",
            fontSize: "26px",
            color: "#18181b",
          }}
        >
          Transaction Approval List
        </h2>
        {readIsLoading ? (
          <p>Loading transaction list...</p>
        ) : (
          <ul>
            {unapprovedTxns.map((txn) => (
              <li key={txn.id}>{`id ${txn.id} || To=${
                txn?.to
              } || Amount: ${formatEther(txn?.amount)} Eth || Approval: ${
                txn?.approvals
              } || Sent: ${txn?.sent}`}</li>
            ))}
          </ul>
        )}
        <OwnersActions scAddress={scAddress} isOwner={isOwner} />
       </div>
      </div>
        </div>
      
    </>
  );
}

export default UserFeatures;
