import React from 'react'

function Footer() {
    return (
        <>
            <footer className=" text-center py-2 pt-[40px] bg-[#161920] text-white">
                <div className="container mx-auto">
                    <p className='text-xl font-bold'>Project by</p>
                    <div className='flex justify-center items-center flex-col'>
                        <img src="logo-animated.gif" alt="" width={50} className='mb-2'/>
                        <img src="horizontal-nexus.png" alt="" />
                    </div>
                    <p className="text-sm mt-3">
                        &copy; {new Date().getFullYear()} Chainvoice. All rights reserved.
                    </p>
                </div>
            </footer>
        </>
    )
}

export default Footer