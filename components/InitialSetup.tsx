
import React, { useState } from 'react';

interface InitialSetupProps {
  onCreateBusiness: (name: string) => void;
}

const InitialSetup: React.FC<InitialSetupProps> = ({ onCreateBusiness }) => {
  const [businessName, setBusinessName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (businessName.trim()) {
      onCreateBusiness(businessName.trim());
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg">
        <div>
          <h2 className="text-3xl font-bold text-center text-gray-900">Selamat Datang!</h2>
          <p className="mt-2 text-center text-gray-600">
            Mari mulai dengan membuat usaha pertama Anda.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="business-name" className="sr-only">Nama Usaha</label>
              <input
                id="business-name"
                name="business-name"
                type="text"
                required
                className="relative block w-full px-3 py-3 text-lg bg-white text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10"
                placeholder="Contoh: Jasa Desain Grafis"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="relative flex justify-center w-full px-4 py-3 text-lg font-medium text-white border border-transparent rounded-md group bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Mulai Kelola Usaha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InitialSetup;