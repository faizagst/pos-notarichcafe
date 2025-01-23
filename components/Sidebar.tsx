'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Updated import
import { Home, FileText, Box, Book, Coffee, CreditCard, Truck, Users } from 'lucide-react';

const Sidebar = () => {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState('');

  const menuItems = [
    { name: 'Dashboard', link: '/dashboard', icon: <Home className="mr-3" /> },
    { name: 'Report', link: '/reports', icon: <FileText className="mr-3" /> },
    { name: 'Inventory', link: '/inventory', icon: <Box className="mr-3" /> },
    { name: 'Library', link: '/library', icon: <Book className="mr-3" /> },
    { name: 'Ingredients', link: '/ingredients', icon: <Coffee className="mr-3" /> },
    { name: 'Payment', link: '/payment', icon: <CreditCard className="mr-3" /> },
    { name: 'Suppliers', link: '/suppliers', icon: <Truck className="mr-3" /> },
    { name: 'Employee', link: '/employee', icon: <Users className="mr-3" /> }
  ];

  const handleClick = (name, link) => {
    setActiveItem(name);
    router.push(link);
  };

  return (
    <div className='w-64 min-h-screen bg-white text-black'>
      {/* Top Part */}
      <div className="flex flex-col">
        {/* Logo */}
        <div className="bg-slate-800 flex items-center py-6 px-5">
          <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded-full mr-4" />
          <span className='font-semibold text-white'>Notarich Café</span>
        </div>
        {/* Links */}
        <nav>
          <ul>
            {menuItems.map((item, index) => (
              <li
                key={index}
                className={`group p-4 ${activeItem === item.name ? 'bg-orange-500' : 'hover:bg-orange-500 focus-within:bg-orange-500'}`}
                onClick={() => handleClick(item.name, item.link)}
              >
                <a
                  className="block w-full h-full flex items-center cursor-pointer"
                >
                  {item.icon} {item.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;