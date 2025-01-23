import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import React from 'react'

const Layout = ({children}) => {
  return (
    <div className='flex'>
      <Sidebar/>
      <main className='w-full bg-slate-100
      min-h-screen'>
      <Header/>
      {children}</main>
    </div>
  )
}

export default Layout