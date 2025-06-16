import React, { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { BrowserProvider, Contract, ethers } from "ethers";
import { useAccount, useWalletClient } from "wagmi";
import { ChainvoiceABI } from "../contractsABI/ChainvoiceABI";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Label } from "./ui/label";
import { useNavigate } from "react-router-dom";

import { LitNodeClient } from "@lit-protocol/lit-node-client";
import {
  encryptString,
} from "@lit-protocol/encryption/src/lib/encryption.js";
import { LIT_ABILITY, LIT_NETWORK } from "@lit-protocol/constants";
import {
  createSiweMessageWithRecaps,
  generateAuthSig,
  LitAccessControlConditionResource,
} from "@lit-protocol/auth-helpers";



function CreateInvoice() {
  const { data: walletClient } = useWalletClient();
  const { isConnected } = useAccount();
  const account = useAccount();
  const [dueDate, setDueDate] = useState(new Date());
  const [issueDate, setIssueDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [itemData, setItemData] = useState([
    {
      description: "",
      qty: "",
      unitPrice: "",
      discount: "",
      tax: "",
      amount: "",
    },
  ]);

  const [totalAmountDue, setTotalAmountDue] = useState(0);

  useEffect(() => {
    let total = itemData.reduce((sum, item) => {
      return (
        sum +
        ((parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0) -
          (parseFloat(item.discount) || 0) +
          (parseFloat(item.tax) || 0))
      );
    }, 0);

    setTotalAmountDue(total);
  }, [itemData]);

  const handleItemData = (e, index) => {
    const { name, value } = e.target;

    setItemData((prevItemData) =>
      prevItemData.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [name]: value };
          if (
            name === "qty" ||
            name === "unitPrice" ||
            name === "discount" ||
            name === "tax"
          ) {
            const qty = parseFloat(updatedItem.qty) || 0;
            const unitPrice = parseFloat(updatedItem.unitPrice) || 0;
            const discount = parseFloat(updatedItem.discount) || 0;
            const tax = parseFloat(updatedItem.tax) || 0;
            updatedItem.amount = (qty * unitPrice - discount + tax).toString();
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const addItem = () => {
    setItemData((prev) => [
      ...prev,
      {
        description: "",
        qty: "",
        unitPrice: "",
        discount: "",
        tax: "",
        amount: "",
      },
    ]);
    console.log(itemData.length);
  };

  const createInvoiceRequest = async (data) => {
    if (!isConnected || !walletClient) {
      alert("Please connect your wallet");
      return;
    }

    try {
      setLoading(true);
      const provider = new BrowserProvider(walletClient);
      const signer = await provider.getSigner();
      
      console.log("data >>>>>> ", data);
      console.log("acc :",account.address)
      // 1. Prepare invoice data
      const invoicePayload = {
        amountDue: totalAmountDue,
        dueDate,
        issueDate,
        user: {
          address: account?.address.toString(),
          fname: data.userFname,
          lname: data.userLname,
          email: data.userEmail,
          country: data.userCountry,
          city: data.userCity,
          postalcode: data.userPostalcode,
        },
        client: {
          address: data.clientAddress,
          fname: data.clientFname,
          lname: data.clientLname,
          email: data.clientEmail,
          country: data.clientCountry,
          city: data.clientCity,
          postalcode: data.clientPostalcode,
        },
        items: itemData,
      };

      const invoiceString = JSON.stringify(invoicePayload);

      // 2. Setup Lit
      const litNodeClient = new LitNodeClient({
        litNetwork: LIT_NETWORK.DatilDev,
        debug: false,
      });
      await litNodeClient.connect();

      const accessControlConditions = [
        {
          contractAddress: "",
          standardContractType: "",
          chain: "ethereum",
          method: "",
          parameters: [":userAddress"],
          returnValueTest: {
            comparator: "=",
            value: account.address.toLowerCase(),
          },
        },
        { operator: "or" },
        {
          contractAddress: "",
          standardContractType: "",
          chain: "ethereum",
          method: "",
          parameters: [":userAddress"],
          returnValueTest: {
            comparator: "=",
            value: data.clientAddress.toLowerCase(),
          },
        },
      ];

      // 3. Encrypt
      const { ciphertext, dataToEncryptHash } = await encryptString(
        {
          accessControlConditions,
          dataToEncrypt: invoiceString,
        },
        litNodeClient
      );

      const sessionSigs = await litNodeClient.getSessionSigs({
        chain: "ethereum",
        resourceAbilityRequests: [
          {
            resource: new LitAccessControlConditionResource("*"),
            ability: LIT_ABILITY.AccessControlConditionDecryption,
          },
        ],
        authNeededCallback: async ({
          uri,
          expiration,
          resourceAbilityRequests,
        }) => {
          const nonce = await litNodeClient.getLatestBlockhash();
          const toSign = await createSiweMessageWithRecaps({
            uri,
            expiration,
            resources: resourceAbilityRequests,
            walletAddress: account.address,
            nonce,
            litNodeClient,
          });

          return await generateAuthSig({
            signer,
            toSign,
          });
        },
      });

      const encryptedStringBase64 = btoa(ciphertext);

      // 4. Send to contract
      const contract = new Contract(
        import.meta.env.VITE_CONTRACT_ADDRESS,
        ChainvoiceABI,
        signer
      );

      const tx = await contract.createInvoice(
        data.clientAddress,
        encryptedStringBase64,
        dataToEncryptHash
      );

      console.log("Invoice created:", tx);
      setTimeout(() => navigate("/home/sent"), 4000);
    } catch (err) {
      console.error("Encryption or transaction failed:", err);
      alert("Failed to create invoice.");
    } finally {
      setLoading(false);
    }
  };
  

  const handleSubmit = async(e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    // User detail
    const userAddress = formData.get("userAddress");
    const userFname = formData.get("userFname");
    const userLname = formData.get("userLname");
    const userEmail = formData.get("userEmail");
    const userCountry = formData.get("userCountry");
    const userCity = formData.get("userCity");
    const userPostalcode = formData.get("userPostalcode");

    // Client detail
    const clientAddress = formData.get("clientAddress");
    const clientFname = formData.get("clientFname");
    const clientLname = formData.get("clientLname");
    const clientEmail = formData.get("clientEmail");
    const clientCountry = formData.get("clientCountry");
    const clientCity = formData.get("clientCity");
    const clientPostalcode = formData.get("clientPostalcode");

    const data = {
      userAddress,
      userFname,
      userLname,
      userEmail,
      userCountry,
      userCity,
      userPostalcode,
      clientAddress,
      clientFname,
      clientLname,
      clientEmail,
      clientCountry,
      clientCity,
      clientPostalcode,
      itemData,
    };
    console.log(data);
    await createInvoiceRequest(data);
  };

  return (
    <div className="font-Inter ">
      <h2 className="text-xl font-bold mb-7">Create New Invoice Request</h2>
      <div className="flex items-center space-x-5">
        <Label className="text-lg">Invoice # </Label>
        <Input value="1" className="w-48" disabled />
        <p> Issued Date </p>
        <Button
          // variant={"outline"}
          className={cn(
            "w-[260px] justify-start text-left font-normal",
            !issueDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon />
          {format(issueDate, "PPP")}
        </Button>

        <p> Due Date </p>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              // variant={"outline"}
              className={cn(
                "w-[260px] justify-start text-left font-normal bg-white text-black hover:bg-white",
                !dueDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="" />
              {dueDate ? (
                format(dueDate, "PPP")
              ) : (
                <span className="">Pick a due date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={setDueDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="flex space-x-2">
          <div className="border border-gray-700 max-w-[550px] p-5 my-3 rounded-md">
            <p className="my-2">From (Your Information)</p>
            <Input
              value={account?.address}
              className="w-[500px] outline-none border-gray-400 focus:border-green-400 transition duration-500 shadow-2xl"
              readOnly
              name="userAddress"
            />
            <div className="mt-4">
              <p className="text-gray-500 text-sm my-4">Add Your Info</p>
              <div className="flex space-x-4">
                <Input
                  type="text"
                  placeholder="Your First Name"
                  className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="userFname"
                />
                <Input
                  type="text"
                  placeholder="Your Last Name"
                  className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="userLname"
                />
              </div>

              <div className="flex space-x-4 my-5">
                <Input
                  type="email"
                  placeholder="Email"
                  className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="userEmail"
                />
                <Input
                  type="text"
                  placeholder="Country"
                  className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="userCountry"
                />
              </div>
              <div className="flex space-x-4 my-5">
                <Input
                  type="text"
                  placeholder="City"
                  className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="userCity"
                />
                <Input
                  type="text"
                  placeholder="Postal Code"
                  className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="userPostalcode"
                />
              </div>
            </div>
          </div>

          <div className="border border-gray-700 max-w-[550px] p-5 my-3 rounded-md">
            <p className="my-2">Client Information</p>
            <Input
              placeholder="Client Wallet Address"
              className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
              name="clientAddress"
            />
            <div className="mt-4">
              <p className="text-white text-sm my-4">Add Client Info</p>
              <div className="flex space-x-4">
                <Input
                  type="text"
                  placeholder="Client First Name"
                  className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="clientFname"
                />
                <Input
                  type="text"
                  placeholder="Client Last Name"
                  className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="clientLname"
                />
              </div>

              <div className="flex space-x-4 my-5">
                <Input
                  type="email"
                  placeholder="Email"
                  className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="clientEmail"
                />
                <Input
                  type="text"
                  placeholder="Country"
                  className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="clientCountry"
                />
              </div>
              <div className="flex space-x-4 my-5">
                <Input
                  type="text"
                  placeholder="City"
                  className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="clientCity"
                />
                <Input
                  type="text"
                  placeholder="Postal Code"
                  className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="clientPostalcode"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="">
          <div className="grid grid-cols-12 justify-center text-center bg-green-500 py-3 rounded-t-md ">
            <div className="col-span-4 ">DESCRIPTION</div>
            <div className="col-span-1 ">QTY</div>
            <div className="col-span-2 ">UNIT PRICE</div>
            <div className="col-span-1 ">DISCOUNT</div>
            <div className="col-span-1 ">TAX(%)</div>
            <div className="col-span-3 ">AMOUNT</div>
          </div>
          <div className="border border-gray-700 p-3 rounded-b-md">
            {itemData.map((_, index) => (
              <div className="grid grid-cols-12 gap-3 my-2" key={index}>
                <Input
                  type="text"
                  placeholder="Enter Description"
                  className="col-span-4 py-5 outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="description"
                  onChange={(e) => handleItemData(e, index)}
                />
                <Input
                  type="number"
                  placeholder="0"
                  className="col-span-1 py-5 outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="qty"
                  onChange={(e) => handleItemData(e, index)}
                />
                <Input
                  type="text"
                  placeholder="0"
                  className="col-span-2 py-5 outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="unitPrice"
                  onChange={(e) => handleItemData(e, index)}
                />
                <Input
                  type="text"
                  placeholder="0"
                  className="col-span-1 py-5 outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="discount"
                  onChange={(e) => handleItemData(e, index)}
                />
                <Input
                  type="text"
                  placeholder="0"
                  className="col-span-1 py-5 outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="tax"
                  onChange={(e) => handleItemData(e, index)}
                />
                <Input
                  type="text"
                  placeholder="0.00"
                  className="col-span-3 py-5 outline-none border-gray-600 focus:border-green-400 transition duration-500"
                  name="amount"
                  disabled
                  value={
                    (parseFloat(itemData[index].qty) || 0) *
                      (parseFloat(itemData[index].unitPrice) || 0) -
                    (parseFloat(itemData[index].discount) || 0) +
                    (parseFloat(itemData[index].tax) || 0)
                  }
                  onChange={(e) => handleItemData(e, index)}
                />
              </div>
            ))}
          </div>
          <p className="text-right mr-20">Total : {totalAmountDue}</p>
          <div className="flex justify-between items-center">
            <Button
              className="my-2 bg-white text-black hover:bg-white"
              onClick={addItem}
              type="button"
            >
              {" "}
              <span className="text-xl">+</span> Add Item
            </Button>
            {loading ? (
              <Button
                className="mx-7 bg-green-500 hover:bg-green-700 transition duration-500"
                type="submit"
                disabled
              >
                {" "}
                <Loader2 className="animate-spin text-white w-10 h-10" />
                Create Invoice
              </Button>
            ) : (
              <Button
                className="mx-7 bg-green-500 hover:bg-green-700 transition duration-500"
                type="submit"
              >
                {" "}
                Create Invoice
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

export default CreateInvoice;
