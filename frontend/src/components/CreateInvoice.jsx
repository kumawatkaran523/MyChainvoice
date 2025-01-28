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

function CreateInvoice() {
  const { data: walletClient } = useWalletClient();
  const { isConnected } = useAccount();
  const [receiverAddress, setReceiverAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const account = useAccount();
  const [dueDate, setDueDate] = useState();

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


  return (
    <div className='font-Inter'>
      <h2 className="text-lg font-bold mb-7">Create New Invoice Request</h2>
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
      </div>
    </div>
  )
}

export default CreateInvoice