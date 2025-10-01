import React, { useState } from 'react';
import type { Business } from '../types';
import { PlusIcon, TrashIcon, PencilIcon } from './Icons';

interface DashboardProps {
  businesses: Business[];
  onSelectBusiness: (id: string) => void;
  onAddBusiness: (name: string) => void;
  onDeleteBusiness: (id: string) => void;
  onRenameBusiness: (id: string, newName: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ businesses, onSelectBusiness, onAddBusiness, onDeleteBusiness, onRenameBusiness }) => {
  const [newBusinessName, setNewBusinessName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [renamingBusiness, setRenamingBusiness] = useState<Business | null>(null);
  const [editedName, setEditedName] = useState('');

  const handleAddBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBusinessName.trim()) {
      onAddBusiness(newBusinessName.trim());
      setNewBusinessName('');
      setIsAdding(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, businessId: string) => {
    e.stopPropagation(); // Prevent card click event
    if (window.confirm('Apakah Anda yakin ingin menghapus usaha ini beserta semua datanya?')) {
        onDeleteBusiness(businessId);
    }
  };

  const handleRenameClick = (e: React.MouseEvent, business: Business) => {
    e.stopPropagation();
    setRenamingBusiness(business);
    setEditedName(business.name);
  };
  
  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renamingBusiness && editedName.trim()) {
        onRenameBusiness(renamingBusiness.id, editedName.trim());
        setRenamingBusiness(null);
        setEditedName('');
    }
  };


  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between pb-8">
            <h1 className="text-4xl font-bold tracking-tight text-primary-900">Dasbor Usaha Anda</h1>
            {!isAdding && (
                 <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-colors rounded-lg shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                 >
                    <PlusIcon className="w-5 h-5"/>
                    <span>Usaha Baru</span>
                </button>
            )}
        </header>

        {isAdding && (
          <div className="mb-8">
            <form onSubmit={handleAddBusiness} className="p-6 bg-white rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-gray-800">Tambah Usaha Baru</h2>
                <div className="mt-4 sm:flex sm:items-center sm:gap-4">
                    <input
                        type="text"
                        value={newBusinessName}
                        onChange={(e) => setNewBusinessName(e.target.value)}
                        placeholder="Masukkan nama usaha baru"
                        className="w-full px-4 py-2 bg-white text-gray-900 placeholder-gray-500 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                    />
                    <div className="flex gap-2 mt-4 sm:mt-0">
                        <button type="submit" className="w-full sm:w-auto px-4 py-2 font-semibold text-white rounded-lg bg-primary-600 hover:bg-primary-700">Simpan</button>
                        <button type="button" onClick={() => setIsAdding(false)} className="w-full sm:w-auto px-4 py-2 font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">Batal</button>
                    </div>
                </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {businesses.map((business) => (
            <div
              key={business.id}
              onClick={() => onSelectBusiness(business.id)}
              className="relative p-6 transition-all duration-300 transform bg-white border border-transparent rounded-xl shadow-md cursor-pointer group hover:shadow-xl hover:-translate-y-1 hover:border-primary-500"
            >
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => handleRenameClick(e, business)}
                    className="p-1.5 text-gray-400 transition-colors rounded-full hover:bg-blue-100 hover:text-blue-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Ubah nama usaha"
                >
                    <PencilIcon className="w-5 h-5" />
                </button>
                <button 
                  onClick={(e) => handleDeleteClick(e, business.id)}
                  className="p-1.5 text-gray-400 transition-colors rounded-full hover:bg-red-100 hover:text-red-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label="Hapus usaha"
                >
                  <TrashIcon />
                </button>
              </div>
              <h3 className="text-xl font-bold text-primary-800 truncate pr-16">{business.name}</h3>
              <p className="mt-2 text-gray-500">{business.jobs.length} pekerjaan tercatat</p>
            </div>
          ))}
        </div>
      </div>
      {renamingBusiness && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">Ubah Nama Usaha</h2>
            <form onSubmit={handleRenameSubmit} className="mt-4 space-y-4">
              <input 
                type="text" 
                value={editedName} 
                onChange={e => setEditedName(e.target.value)} 
                required 
                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500" 
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setRenamingBusiness(null)} className="px-4 py-2 font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">Batal</button>
                <button type="submit" className="px-4 py-2 font-semibold text-white rounded-lg bg-primary-600 hover:bg-primary-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;