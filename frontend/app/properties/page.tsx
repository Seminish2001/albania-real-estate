'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import PropertyCard from '../../components/properties/PropertyCard';
import PropertySearch from '../../components/properties/PropertySearch';
import { Property, SearchFilters, PaginatedResponse } from '../../types';
import api from '../../lib/api';
import { Loader, AlertCircle } from 'lucide-react';

export default function PropertiesPage() {
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0
  });
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const searchParamsString = searchParams.toString();
  const initialFilters: SearchFilters = useMemo(() => ({
    type: (searchParams.get('type') as 'sale' | 'rent') || undefined,
    city: searchParams.get('city') || undefined,
    category: (searchParams.get('category') as 'residential' | 'commercial' | 'land') || undefined,
    search: searchParams.get('q') || undefined
  }), [searchParamsString]);

  const [filters, setFilters] = useState<SearchFilters>(initialFilters);

  useEffect(() => {
    let changed = false;
    setFilters((prev) => {
      const prevString = JSON.stringify(prev);
      const nextString = JSON.stringify(initialFilters);
      if (prevString === nextString) {
        return prev;
      }
      changed = true;
      return initialFilters;
    });
    if (changed) {
      setPage(1);
    }
  }, [initialFilters]);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        setError('');

        const params = new URLSearchParams({
          page: page.toString(),
          limit: '12'
        });

        Object.entries(filters).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') {
            return;
          }

          if (Array.isArray(value)) {
            if (value.length > 0) {
              const paramKey = key === 'search' ? 'q' : key;
              params.set(paramKey, value.join(','));
            }
            return;
          }

          const paramKey = key === 'search' ? 'q' : key;
          params.set(paramKey, String(value));
        });

        const response = await api.get(`/properties?${params.toString()}`);
        const data: PaginatedResponse<Property> = response.data.data;

        setProperties((prev) => (page === 1 ? data.data : [...prev, ...data.data]));
        setPagination({
          total: data.total,
          totalPages: data.totalPages
        });
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load properties');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [filters, page]);

  const handleSearch = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleFavorite = async (propertyId: string) => {
    try {
      const response = await api.post(`/properties/${propertyId}/favorite`);
      const isFavorited: boolean = response.data.data?.isFavorited ?? false;
      setFavoriteIds((prev) => {
        const updated = new Set(prev);
        if (isFavorited) {
          updated.add(propertyId);
        } else {
          updated.delete(propertyId);
        }
        return updated;
      });
    } catch (favError) {
      console.error('Failed to toggle favorite:', favError);
    }
  };

  const loadMore = () => {
    if (page < pagination.totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      <Header />

      <main className="container-custom section-padding py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Find Your Perfect Property
          </h1>
          <p className="text-lg text-gray-600">
            Discover {pagination.total}+ verified properties across Albania
          </p>
        </div>

        {/* Search & Filters */}
        <div className="mb-8">
          <PropertySearch
            onSearch={handleSearch}
            initialFilters={filters}
          />
        </div>

        {/* Results */}
        <div className="mb-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {loading && properties.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="h-8 w-8 text-primary-600 animate-spin" />
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <AlertCircle className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No properties found
              </h3>
              <p className="text-gray-600">
                Try adjusting your search filters to find more properties.
              </p>
            </div>
          ) : (
            <>
              {/* Results Summary */}
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-600">
                  Showing {properties.length} of {pagination.total} properties
                </p>
                <div className="text-sm text-gray-500">
                  Page {page} of {pagination.totalPages}
                </div>
              </div>

              {/* Properties Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onFavorite={handleFavorite}
                    isFavorited={favoriteIds.has(property.id)}
                  />
                ))}
              </div>

              {/* Load More */}
              {page < pagination.totalPages && (
                <div className="text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="btn-outline px-8 py-3 disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load More Properties'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
