
import React from 'react';
import firebase from 'firebase/compat/app';
import { auth } from '../firebaseConfig';

interface LoginProps {
    onGuestLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onGuestLogin }) => {

  const signInWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .catch(error => {
            console.error("Error during sign in:", error);
            alert(error.message);
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-sm p-8 space-y-8 text-center bg-white rounded-2xl shadow-lg">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Selamat Datang</h2>
          <p className="mt-2 text-gray-600">
            Masuk untuk mulai mengelola usaha Anda.
          </p>
        </div>
        <div className="space-y-4">
            <button
              onClick={signInWithGoogle}
              className="relative flex items-center justify-center w-full px-4 py-3 text-lg font-medium text-gray-700 bg-white border border-gray-300 rounded-md group hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg className="w-6 h-6 mr-2" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.53-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
              Masuk dengan Google
            </button>
            <button
              onClick={onGuestLogin}
              className="relative flex items-center justify-center w-full px-4 py-3 text-lg font-medium text-white bg-primary-600 border border-transparent rounded-md group hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Masuk sebagai Tamu
            </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
