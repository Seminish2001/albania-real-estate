'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Mail } from 'lucide-react';
import api from '../../../lib/api';

export default function VerifyEmail() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const sent = searchParams.get('sent');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      void verifyEmail(token);
    } else if (!sent) {
      setStatus('error');
      setMessage('Verification token is missing.');
    } else {
      setStatus('success');
    }
  }, [token, sent]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await api.get(`/auth/verify-email?token=${verificationToken}`);
      setStatus('success');
      setMessage(response.data.message);
    } catch (error: any) {
      setStatus('error');
      setMessage(error?.response?.data?.error || 'Verification failed');
    }
  };

  const resendVerification = async () => {
    window.location.href = '/login?message=Please check your email for verification link';
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <Mail className="mx-auto h-16 w-16 text-primary-600" />
            <h2 className="mt-6 text-3xl font-bold text-gray-900">Check Your Email</h2>
            <p className="mt-4 text-lg text-gray-600">
              We've sent a verification link to your email address.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Please click the link in the email to verify your account and start using Immo Albania.
            </p>
            <div className="mt-8 space-y-4">
              <button
                onClick={resendVerification}
                className="text-primary-600 hover:text-primary-500 font-medium"
              >
                Didn't receive the email? Click here to resend
              </button>
              <br />
              <Link
                href="/login"
                className="btn-primary inline-block"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
              <h2 className="mt-6 text-3xl font-bold text-gray-900">Verifying Email</h2>
              <p className="mt-4 text-gray-600">Please wait while we verify your email address...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
              <h2 className="mt-6 text-3xl font-bold text-gray-900">Email Verified!</h2>
              <p className="mt-4 text-lg text-gray-600">{message}</p>
              <div className="mt-8">
                <Link
                  href="/login"
                  className="btn-primary"
                >
                  Continue to Login
                </Link>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="mx-auto h-16 w-16 text-red-600" />
              <h2 className="mt-6 text-3xl font-bold text-gray-900">Verification Failed</h2>
              <p className="mt-4 text-lg text-gray-600">{message}</p>
              <div className="mt-8 space-y-4">
                <button
                  onClick={resendVerification}
                  className="text-primary-600 hover:text-primary-500 font-medium block"
                >
                  Request new verification email
                </button>
                <Link
                  href="/login"
                  className="btn-primary inline-block"
                >
                  Go to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
