'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSite } from '@/lib/site-context';
import { ApiError } from '@/lib/api';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'KRW', name: 'Korean Won', symbol: '₩' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
];

export default function OnboardingStep1() {
  const router = useRouter();
  const { createSite, loading } = useSite();
  
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    currency: 'USD',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Site name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Site name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Site name must be at least 2 characters';
    }

    // Domain validation
    if (!formData.domain.trim()) {
      newErrors.domain = 'Domain is required';
    } else {
      const domain = formData.domain.toLowerCase().trim()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '');
      
      const domainPattern = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
      if (!domainPattern.test(domain)) {
        newErrors.domain = 'Invalid domain format (e.g., example.com)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) {
      return;
    }

    try {
      await createSite(formData);
      // Navigate to step 2 (GA4 connection)
      router.push('/onboarding/step2');
    } catch (error) {
      if (error instanceof ApiError) {
        setApiError(error.message);
      } else if (error instanceof Error) {
        setApiError(error.message);
      } else {
        setApiError('Failed to create site');
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    setApiError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Setup Your Site</h1>
          <p className="text-sm text-gray-500 mt-1">Step 1 of 3</p>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-2">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: '33%' }} />
          </div>
        </div>
      </div>

      {/* Form */}
      <main className="flex-1 px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Site Information
              </h2>
              <p className="text-sm text-gray-600">
                Enter your website details to get started with Pulse.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Site Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Site Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    errors.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                  placeholder="My Awesome Blog"
                  disabled={loading}
                />
                {errors.name && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <span className="material-icons-round text-base">error</span>
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Domain */}
              <div>
                <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Domain
                </label>
                <input
                  type="text"
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => handleInputChange('domain', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    errors.domain
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                  placeholder="example.com"
                  disabled={loading}
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Enter without https:// or www
                </p>
                {errors.domain && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <span className="material-icons-round text-base">error</span>
                    {errors.domain}
                  </p>
                )}
              </div>

              {/* Currency */}
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Currency
                </label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 bg-white transition-colors"
                  disabled={loading}
                >
                  {CURRENCIES.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.name} ({curr.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* API Error */}
              {apiError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="material-icons-round text-red-600 text-xl">error</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">Error</p>
                      <p className="text-sm text-red-700 mt-0.5">{apiError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Continue
                    <span className="material-icons-round text-xl">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need help? Check our{' '}
              <a href="#" className="text-blue-600 hover:underline">
                setup guide
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
