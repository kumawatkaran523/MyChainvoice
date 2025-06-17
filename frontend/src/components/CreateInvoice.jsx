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
import { CalendarIcon, Loader2, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Label } from "./ui/label";
import { useNavigate } from "react-router-dom";

import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { encryptString } from "@lit-protocol/encryption/src/lib/encryption.js";
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
      console.log("acc :", account.address);
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
            // value: '0x1bde11780cbc621a9507096f54a4ccf0f23263cd',
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

  const handleSubmit = async (e) => {
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
    // <div className="font-Inter ">
    //   <h2 className="text-xl font-bold mb-7">Create New Invoice Request</h2>
    //   <div className="flex items-center space-x-5">
    //     <Label className="text-lg">Invoice # </Label>
    //     <Input value="1" className="w-48" disabled />
    //     <p> Issued Date </p>
    //     <Button
    //       // variant={"outline"}
    //       className={cn(
    //         "w-[260px] justify-start text-left font-normal",
    //         !issueDate && "text-muted-foreground"
    //       )}
    //     >
    //       <CalendarIcon />
    //       {format(issueDate, "PPP")}
    //     </Button>

    //     <p> Due Date </p>
    //     <Popover>
    //       <PopoverTrigger asChild>
    //         <Button
    //           // variant={"outline"}
    //           className={cn(
    //             "w-[260px] justify-start text-left font-normal bg-white text-black hover:bg-white",
    //             !dueDate && "text-muted-foreground"
    //           )}
    //         >
    //           <CalendarIcon className="" />
    //           {dueDate ? (
    //             format(dueDate, "PPP")
    //           ) : (
    //             <span className="">Pick a due date</span>
    //           )}
    //         </Button>
    //       </PopoverTrigger>
    //       <PopoverContent className="w-auto p-0" align="start">
    //         <Calendar
    //           mode="single"
    //           selected={dueDate}
    //           onSelect={setDueDate}
    //           initialFocus
    //         />
    //       </PopoverContent>
    //     </Popover>
    //   </div>
    //   <form onSubmit={handleSubmit}>
    //     <div className="flex space-x-2">
    //       <div className="border border-gray-700 max-w-[550px] p-5 my-3 rounded-md">
    //         <p className="my-2">From (Your Information)</p>
    //         <Input
    //           value={account?.address}
    //           className="w-[500px] outline-none border-gray-400 focus:border-green-400 transition duration-500 shadow-2xl"
    //           readOnly
    //           name="userAddress"
    //         />
    //         <div className="mt-4">
    //           <p className="text-gray-500 text-sm my-4">Add Your Info</p>
    //           <div className="flex space-x-4">
    //             <Input
    //               type="text"
    //               placeholder="Your First Name"
    //               className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="userFname"
    //             />
    //             <Input
    //               type="text"
    //               placeholder="Your Last Name"
    //               className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="userLname"
    //             />
    //           </div>

    //           <div className="flex space-x-4 my-5">
    //             <Input
    //               type="email"
    //               placeholder="Email"
    //               className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="userEmail"
    //             />
    //             <Input
    //               type="text"
    //               placeholder="Country"
    //               className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="userCountry"
    //             />
    //           </div>
    //           <div className="flex space-x-4 my-5">
    //             <Input
    //               type="text"
    //               placeholder="City"
    //               className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="userCity"
    //             />
    //             <Input
    //               type="text"
    //               placeholder="Postal Code"
    //               className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="userPostalcode"
    //             />
    //           </div>
    //         </div>
    //       </div>

    //       <div className="border border-gray-700 max-w-[550px] p-5 my-3 rounded-md">
    //         <p className="my-2">Client Information</p>
    //         <Input
    //           placeholder="Client Wallet Address"
    //           className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //           name="clientAddress"
    //         />
    //         <div className="mt-4">
    //           <p className="text-white text-sm my-4">Add Client Info</p>
    //           <div className="flex space-x-4">
    //             <Input
    //               type="text"
    //               placeholder="Client First Name"
    //               className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="clientFname"
    //             />
    //             <Input
    //               type="text"
    //               placeholder="Client Last Name"
    //               className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="clientLname"
    //             />
    //           </div>

    //           <div className="flex space-x-4 my-5">
    //             <Input
    //               type="email"
    //               placeholder="Email"
    //               className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="clientEmail"
    //             />
    //             <Input
    //               type="text"
    //               placeholder="Country"
    //               className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="clientCountry"
    //             />
    //           </div>
    //           <div className="flex space-x-4 my-5">
    //             <Input
    //               type="text"
    //               placeholder="City"
    //               className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="clientCity"
    //             />
    //             <Input
    //               type="text"
    //               placeholder="Postal Code"
    //               className="w-[500px] outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="clientPostalcode"
    //             />
    //           </div>
    //         </div>
    //       </div>
    //     </div>

    //     <div className="">
    //       <div className="grid grid-cols-12 justify-center text-center bg-green-500 py-3 rounded-t-md ">
    //         <div className="col-span-4 ">DESCRIPTION</div>
    //         <div className="col-span-1 ">QTY</div>
    //         <div className="col-span-2 ">UNIT PRICE</div>
    //         <div className="col-span-1 ">DISCOUNT</div>
    //         <div className="col-span-1 ">TAX(%)</div>
    //         <div className="col-span-3 ">AMOUNT</div>
    //       </div>
    //       <div className="border border-gray-700 p-3 rounded-b-md">
    //         {itemData.map((_, index) => (
    //           <div className="grid grid-cols-12 gap-3 my-2" key={index}>
    //             <Input
    //               type="text"
    //               placeholder="Enter Description"
    //               className="col-span-4 py-5 outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="description"
    //               onChange={(e) => handleItemData(e, index)}
    //             />
    //             <Input
    //               type="number"
    //               placeholder="0"
    //               className="col-span-1 py-5 outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="qty"
    //               onChange={(e) => handleItemData(e, index)}
    //             />
    //             <Input
    //               type="text"
    //               placeholder="0"
    //               className="col-span-2 py-5 outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="unitPrice"
    //               onChange={(e) => handleItemData(e, index)}
    //             />
    //             <Input
    //               type="text"
    //               placeholder="0"
    //               className="col-span-1 py-5 outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="discount"
    //               onChange={(e) => handleItemData(e, index)}
    //             />
    //             <Input
    //               type="text"
    //               placeholder="0"
    //               className="col-span-1 py-5 outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="tax"
    //               onChange={(e) => handleItemData(e, index)}
    //             />
    //             <Input
    //               type="text"
    //               placeholder="0.00"
    //               className="col-span-3 py-5 outline-none border-gray-600 focus:border-green-400 transition duration-500"
    //               name="amount"
    //               disabled
    //               value={
    //                 (parseFloat(itemData[index].qty) || 0) *
    //                   (parseFloat(itemData[index].unitPrice) || 0) -
    //                 (parseFloat(itemData[index].discount) || 0) +
    //                 (parseFloat(itemData[index].tax) || 0)
    //               }
    //               onChange={(e) => handleItemData(e, index)}
    //             />
    //           </div>
    //         ))}
    //       </div>
    //       <p className="text-right mr-20">Total : {totalAmountDue}</p>
    //       <div className="flex justify-between items-center">
    //         <Button
    //           className="my-2 bg-white text-black hover:bg-white"
    //           onClick={addItem}
    //           type="button"
    //         >
    //           {" "}
    //           <span className="text-xl">+</span> Add Item
    //         </Button>
    //         {loading ? (
    //           <Button
    //             className="mx-7 bg-green-500 hover:bg-green-700 transition duration-500"
    //             type="submit"
    //             disabled
    //           >
    //             {" "}
    //             <Loader2 className="animate-spin text-white w-10 h-10" />
    //             Create Invoice
    //           </Button>
    //         ) : (
    //           <Button
    //             className="mx-7 bg-green-500 hover:bg-green-700 transition duration-500"
    //             type="submit"
    //           >
    //             {" "}
    //             Create Invoice
    //           </Button>
    //         )}
    //       </div>
    //     </div>
    //   </form>
    // </div>

    <div className="font-Inter max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold mb-6 text-white">
        Create New Invoice Request
      </h2>

      {/* Invoice Header Section */}
      <div className="flex flex-wrap items-center gap-4 mb-8 bg-gray-50 p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-2">
          <Label className="text-md font-medium text-gray-700">Invoice #</Label>
          <Input
            value="1"
            className="w-24 bg-gray-100 border-gray-300 text-gray-700"
            disabled
          />
        </div>

        <div className="flex items-center space-x-2">
          <Label className="text-md font-medium text-gray-700">
            Issued Date
          </Label>
          <Button
            className={cn(
              "w-[200px] justify-start text-left font-normal bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
              !issueDate && "text-black"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(issueDate, "PPP")}
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Label className="text-md font-medium text-gray-700">Due Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[260px] justify-start text-left font-normal text-gray-700",
                  !dueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? (
                  format(dueDate, "PPP")
                ) : (
                  <span className="text-gray-700">Pick a due date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={(date) => {
                  if (date) {
                    setDueDate(date);
                    document.dispatchEvent(
                      new KeyboardEvent("keydown", { key: "Escape" })
                    );
                  }
                }}
                initialFocus
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* From and Client Information Sections */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* Your Information */}
          <div className="border border-gray-200 flex-1 p-6 rounded-lg shadow-sm bg-white">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              From (Your Information)
            </h3>
            <Input
              value={account?.address}
              className="w-full mb-4 bg-gray-50 border-gray-300 text-gray-500 "
              readOnly
              name="userAddress"
            />

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-700">
                    First Name
                  </Label>
                  <Input
                    type="text"
                    placeholder="Your First Name"
                    className="w-full mt-1 border-gray-300 text-black "
                    name="userFname"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-700">
                    Last Name
                  </Label>
                  <Input
                    type="text"
                    placeholder="Your Last Name"
                    className="w-full mt-1 border-gray-300 text-black"
                    name="userLname"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    type="email"
                    placeholder="Email"
                    className="w-full mt-1 border-gray-300 text-black"
                    name="userEmail"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-700">
                    Country
                  </Label>
                  <Input
                    type="text"
                    placeholder="Country"
                    className="w-full mt-1 border-gray-300 text-black"
                    name="userCountry"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-700">
                    City
                  </Label>
                  <Input
                    type="text"
                    placeholder="City"
                    Create
                    New
                    Invoice
                    Request
                    className="w-full mt-1 border-gray-300 text-black"
                    name="userCity"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-700">
                    Postal Code
                  </Label>
                  <Input
                    type="text"
                    placeholder="Postal Code"
                    className="w-full mt-1 border-gray-300 text-black"
                    name="userPostalcode"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="border border-gray-200 flex-1 p-6 rounded-lg shadow-sm bg-white">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Client Information
            </h3>
            <Input
              placeholder="Client Wallet Address"
              className="w-full mb-4 border-gray-300 text-black"
              name="clientAddress"
            />

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-700">
                    First Name
                  </Label>
                  <Input
                    type="text"
                    placeholder="Client First Name"
                    className="w-full mt-1 border-gray-300 text-black"
                    name="clientFname"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-700">
                    Last Name
                  </Label>
                  <Input
                    type="text"
                    placeholder="Client Last Name"
                    className="w-full mt-1 border-gray-300 text-black"
                    name="clientLname"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    type="email"
                    placeholder="Email"
                    className="w-full mt-1 border-gray-300 text-black"
                    name="clientEmail"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-700">
                    Country
                  </Label>
                  <Input
                    type="text"
                    placeholder="Country"
                    className="w-full mt-1 border-gray-300 text-black"
                    name="clientCountry"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-700">
                    City
                  </Label>
                  <Input
                    type="text"
                    placeholder="City"
                    className="w-full mt-1 border-gray-300 text-black"
                    name="clientCity"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-700">
                    Postal Code
                  </Label>
                  <Input
                    type="text"
                    placeholder="Postal Code"
                    className="w-full mt-1 border-gray-300 text-black"
                    name="clientPostalcode"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items Section */}
        <div className="mb-8">
          <div className="grid grid-cols-12 bg-green-500 text-white py-3 px-4 rounded-t-lg font-medium text-sm">
            <div className="col-span-4 md:col-span-4">DESCRIPTION</div>
            <div className="col-span-2 md:col-span-1">QTY</div>
            <div className="col-span-2">UNIT PRICE</div>
            <div className="col-span-2 md:col-span-1">DISCOUNT</div>
            <div className="col-span-2 md:col-span-1">TAX(%)</div>
            <div className="col-span-2">AMOUNT</div>
            {/* <div className="col-span-1">AMOUNT</div> */}
          </div>

          <div className="border border-gray-200 p-4 rounded-b-lg bg-white">
            {itemData.map((_, index) => (
              <div
                className="grid grid-cols-12 gap-2 mb-3 items-center relative"
                key={index}
              >
                {/* Item Fields */}
                <div className="col-span-4 md:col-span-4">
                  <Input
                    type="text"
                    placeholder="Enter Description"
                    className="w-full border-gray-300 text-black"
                    name="description"
                    onChange={(e) => handleItemData(e, index)}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Input
                    type="number"
                    placeholder="0"
                    className="w-full border-gray-300 text-black py-2"
                    name="qty"
                    onChange={(e) => handleItemData(e, index)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="text"
                    placeholder="0"
                    className="w-full border-gray-300 text-black py-2"
                    name="unitPrice"
                    onChange={(e) => handleItemData(e, index)}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Input
                    type="text"
                    placeholder="0"
                    className="w-full border-gray-300 text-black py-2"
                    name="discount"
                    onChange={(e) => handleItemData(e, index)}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Input
                    type="text"
                    placeholder="0"
                    className="w-full border-gray-300 text-black py-2"
                    name="tax"
                    onChange={(e) => handleItemData(e, index)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="text"
                    placeholder="0.00"
                    className="w-full bg-gray-50 border-gray-300 text-gray-700 py-2"
                    name="amount"
                    disabled
                    value={
                      (parseFloat(itemData[index].qty) || 0) *
                        (parseFloat(itemData[index].unitPrice) || 0) -
                      (parseFloat(itemData[index].discount) || 0) +
                      (parseFloat(itemData[index].tax) || 0)
                    }
                  />
                </div>

                {/* Delete Button (only shown for items after the first one) */}
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      // Create a function to handle item deletion
                      const newItems = [...itemData];
                      newItems.splice(index, 1);
                      // Update your state with the new items array
                      setItemData(newItems);
                    }}
                    className="absolute right-14 top-1/2 transform -translate-y-1/2 bg-green-500 text-white rounded-full p-1 hover:bg-green-600 transition-colors"
                    aria-label="Delete item"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4">
            <Button
              className="bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 px-6 py-2 flex items-center gap-2"
              onClick={addItem}
              type="button"
            >
              <PlusIcon className="h-5 w-5" />
              Add Item
            </Button>

            <div className="bg-gray-50 p-4 rounded-lg w-full md:w-1/3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-700">Total:</span>
                <span className="font-bold text-lg text-black">
                  {totalAmountDue} ETH
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 mt-6">
          {loading ? (
            <Button
              className="bg-green-500 hover:bg-green-700 px-8 py-2 text-white flex items-center gap-2"
              type="submit"
              disabled
            >
              <Loader2 className="animate-spin h-5 w-5" />
              Creating Invoice...
            </Button>
          ) : (
            <Button
              className="bg-green-600 hover:bg-green-700 px-8 py-2 text-white"
              type="submit"
            >
              Create Invoice
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export default CreateInvoice;
