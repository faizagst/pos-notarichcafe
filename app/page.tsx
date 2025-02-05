import Link from 'next/link'
import React from 'react'

const Home = () => {
  return (
    <div className="flex items-center justify-center min-h-screen
    flex-col">
      <h2 className="text-3x1 mb-4 flex-col">
        Notarich Cafe
      </h2>
      <Link href="/dashboard">View Dashboard</Link>
    </div>
  )
}

export default Home