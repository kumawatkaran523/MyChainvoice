import React, { useState } from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { BrowserProvider, Contract, ethers, JsonRpcProvider } from 'ethers'
import { useAccount, useWalletClient } from 'wagmi'
import { ChainvoiceABI } from '../contractsABI/ChainvoiceABI';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Label } from './ui/label'

function CreateInvoice() {
  const { data: walletClient } = useWalletClient();
  const { isConnected } = useAccount();
  const [receiverAddress, setReceiverAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const account = useAccount();
  const [dueDate, setDueDate] = useState();
  const [issueDate, setIssueDate] = useState(new Date());

  const createInvoiceRequest = async () => {
    if (!isConnected || !walletClient) {
      alert('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      const provider = new BrowserProvider(walletClient);
      // const provider = new JsonRpcProvider(import.meta.env.VITE_BLOCKCHAIN_URI);
      const signer = await provider.getSigner();
      const contract = new Contract(
        import.meta.env.VITE_CONTRACT_ADDRESS,
        ChainvoiceABI,
        signer
      );

      console.log(receiverAddress);
      setReceiverAddress('');
      setAmount('');

      const res = await contract.createInvoice(ethers.parseUnits(amount, 18), receiverAddress);
      console.log('Transaction details:', {
        from: res.from,
        to: res.to,
        receiverAddress: receiverAddress,
        contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS
      })
    } catch (error) {
      console.error('Invoice creation error:', error);
      alert('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  }
  const [itemCount, setItemCount] = useState(1);
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // user detail
    const userAddress=formData.get("userAddress");
    const userFname=formData.get("userFname");
    const userLname=formData.get("userLname");
    const userEmail=formData.get("userEmail");
    const userCountry=formData.get("userCountry");
    const userCity=formData.get("userCity");
    const userPostalcode=formData.get("userPostalcode");

    console.log({
      userAddress,
      userFname,
      userLname,
      userEmail,
      userCountry,
      userCity,
      userPostalcode
    });
    // Get arrays of all values for each field
    const descriptions = formData.getAll("description");
    const qtys = formData.getAll("qty");
    const unitPrices = formData.getAll("unitPrice");
    const discounts = formData.getAll("discount");
    const taxes = formData.getAll("tax");
    const amounts = formData.getAll("amount");
  
    // Combine into array of item objects
    const items = descriptions.map((description, index) => ({
      description,
      qty: qtys[index],
      unitPrice: unitPrices[index],
      discount: discounts[index],
      tax: taxes[index],
      amount: amounts[index]
    }));
  
    console.log(items); // Now contains all items
    // Proceed with invoice creation...
  };
  
  return (
    <div className='font-Inter'>
      <h2 className="text-xl font-bold mb-7">Create New Invoice Request</h2>
      <div className="flex items-center space-x-2">
        <Label className='text-lg'>Invoice # </Label>
        <Input value='1' className='w-48' />
        <p> Issued Date </p>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[260px] justify-start text-left font-normal",
                !issueDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon />
              {format(issueDate, "PPP")}
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

        <p> Due Date </p>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[260px] justify-start text-left font-normal",
                !dueDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon />
              {dueDate ? format(dueDate, "PPP") : <span>Pick a due date</span>}
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
      <form  onSubmit={handleSubmit}>
      <div className='flex space-x-2'>

        <div className='border max-w-[550px] p-5 my-3 rounded-md'>
          <p className='my-2'>From</p>
          <Input value={account?.address} className='w-[500px]' name="userAddress"/>
          <div className='mt-4'>
            <p className='text-gray-500 text-sm my-4'>Add Your Info</p>
            <div className='flex space-x-4'>
              <Input type='text' placeholder='Your First Name' className='w-[500px]' name="userFname"/>
              <Input type='text' placeholder='Your Last Name' className='w-[500px]' name="userLname"/>
            </div>

            <div className='flex space-x-4 my-5'>
              <Input type='email' placeholder='Email' className='w-[500px]' name="userEmail"/>
              <Input type='text' placeholder='Country' className='w-[500px]' name="userCountry"/>
            </div>
            <div className='flex space-x-4 my-5'>
              <Input type='text' placeholder='City' className='w-[500px]' name="userCity"/>
              <Input type='text' placeholder='Postal Code' className='w-[500px]' name="userPostalcode"/>
            </div>
          </div>
        </div>

        <div className='border max-w-[550px] p-5 my-3 rounded-md'>
          <p className='my-2'>Client Information</p>
          <Input placeholder='Client Wallet Address' className='w-[500px]' name="clientAddress" />
          <div className='mt-4'>
            <p className='text-gray-500 text-sm my-4'>Add Client Info</p>
            <div className='flex space-x-4'>
              <Input type='text' placeholder='Client First Name' className='w-[500px]' name="clientFname"/>
              <Input type='text' placeholder='Client Last Name' className='w-[500px]' name="clientLname"/>
            </div>

            <div className='flex space-x-4 my-5'>
              <Input type='email' placeholder='Email' className='w-[500px]' name="clientEmail"/>
              <Input type='text' placeholder='Country' className='w-[500px]' name="clientCountry"/>
            </div>
            <div className='flex space-x-4 my-5'>
              <Input type='text' placeholder='City' className='w-[500px]' name="clientCity"/>
              <Input type='text' placeholder='Postal Code' className='w-[500px]' name="clientPostalcode"/>
            </div>
          </div>
        </div>
      </div>

      <div className=''>
        <div className='grid grid-cols-12 justify-center text-center bg-green-500 py-3 rounded-t-md '>
          <div className='col-span-4 '>DESCRIPTION</div>
          <div className='col-span-1 '>QTY</div>
          <div className='col-span-2 '>UNIT PRICE</div>
          <div className='col-span-1 '>DISCOUNT</div>
          <div className='col-span-1 '>TAX(%)</div>
          <div className='col-span-3 '>AMOUNT</div>
        </div>
          <div className="border p-3 rounded-b-md" >
            {
              Array(itemCount)
                .fill(null)
                .map((_, index) => (
                  <div className="grid grid-cols-12 gap-3 my-2" key={index}>
                    <Input type="text" placeholder="Enter Description" className="col-span-4 py-5" name="description"/>
                    <Input type="number" placeholder="0" className="col-span-1 py-5" name="qty"/>
                    <Input type="text" placeholder="0" className="col-span-2 py-5" name="unitPrice"/>
                    <Input type="text" placeholder="0" className="col-span-1 py-5" name="discount"/>
                    <Input type="text" placeholder="0" className="col-span-1 py-5" name="tax"/>
                    <Input type="text" placeholder="0.00" className="col-span-3 py-5" name="amount"/>
                  </div>
                ))
            }
          </div>
        <div className='flex justify-between items-center'>
          <Button className='my-2' onClick={() => {
            setItemCount(itemCount + 1);
          }}  type="button"> <span className='text-xl'>+</span> Add Item</Button>
          <Button className='mx-7' type="submit">Create Invoice</Button>
        </div>
      </div>
          </form>
    </div>
  )
}

export default CreateInvoice


{/* <h2 className="text-lg font-bold mb-7">Create New Invoice Request</h2>
      <Button>
            Created At :  
          <CalendarIcon />
            {format(new Date(),'PPP')}
          </Button>
      <div className='grid mx-10'>
        <Input
          type="text"
          placeholder='Sender address'
          value={`From : ${account.address}`}
          className='w-1/2 my-2'
          disabled
        />
        <Input
          type="text"
          placeholder='Full Name'
          // value={receiverAddress}
          // onChange={(e) => setReceiverAddress(e.target.value)}
          className='w-1/2 my-2'
        />
        <div className='flex gap-2 items-center'>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[260px] justify-start text-left font-normal",
                  !dueDate && "text-muted-foreground"
                )}
              >
                Due Date : 
                <CalendarIcon />
                {dueDate ? format(dueDate, "PPP") : <span>Pick a due date</span>}
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
        <Input
          type="text"
          placeholder='Receiver address'
          value={receiverAddress}
          onChange={(e) => setReceiverAddress(e.target.value)}
          className='w-1/2 my-2'
        />
        <Input
          type="number"
          placeholder='Amount (ETH)'
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className='w-1/2 my-2'
        />
        <Button
          className="w-1/2 my-2"
          onClick={createInvoiceRequest}
          disabled={loading || !isConnected}
        >
          {loading ? 'Creating...' : 'Create Invoice Request'}
        </Button>
      </div> */}