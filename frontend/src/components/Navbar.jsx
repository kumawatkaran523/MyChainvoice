import { ConnectButton } from '@rainbow-me/rainbowkit';
import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';

function Navbar() {
  const {address}=useAccount();
  const navigate=useNavigate()
  useEffect(()=>{
    if(!address) navigate('/')
  },[address]);

  return (
    <>
    <div className='flex justify-between items-center shadow-2xl px-44'>
        <div className=' text-4xl font-bold my-5 text-green-500'>Cha<span className=' border-gray-500 border-[2px] rounded-sm border-dashed text-white'>in</span>voice</div>
        <div className='py-7 hidden md:block'>
          <ul className='flex gap-10 items-center text-white'>
            <li className='hover:text-green-500 hover:font-bold transition duration-500'>
              <Link to='home'>Home</Link>
            </li>
            <li className='hover:text-green-500 hover:font-bold transition duration-500'>
              <Link to='feature'>Feature</Link>
            </li>
            <li className='hover:text-green-500 hover:font-bold transition duration-500'>
              <Link to='working'>How It Works</Link>
            </li>
            <li className='hover:text-green-500 hover:font-bold transition duration-500'>
              <Link to='treasure'>Treasure</Link>
            </li>
            <li className='hover:text-green-500 hover:font-bold transition duration-500'>
              <Link to='about'>About Us</Link>
            </li>
            {
              address && <ConnectButton accountStatus="address" chainStatus="none"/>
            }
          </ul>
        </div>
    </div>
    {/* <div className='border-[0.5px] p-0 border-slate-400'></div> */}

    </>
  )
}

export default Navbar;