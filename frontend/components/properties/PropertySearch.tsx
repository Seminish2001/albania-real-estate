'use client';

import { useEffect, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { SearchFilters } from '../../types';

interface PropertySearchProps {
  onSearch: (filters: SearchFilters) => void;
  initialFilters?: SearchFilters;
}

const cities = [
  'Tirana', 'Durrës', 'Vlorë', 'Shkodër', 'Elbasan', 'Fier',
  'Korçë', 'Berat', 'Lushnjë', 'Kavajë', 'Gjirokastër'
];

const features = [
  'Parking', 'Garden', 'Balcony', 'Elevator', 'Furnished',
  'Air Conditioning', 'Heating', 'Internet', 'Pet Friendly', 'Swimming Pool'
];

export default function PropertySearch({ onSearch, initialFilters = {} }: PropertySearchProps) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onSearch(newFilters);
  };

  const handleFeatureToggle = (feature: string) => {
    const currentFeatures = filters.features || [];
    const newFeatures = currentFeatures.includes(feature)
      ? currentFeatures.filter((f) => f !== feature)
      : [...currentFeatures, feature];

    handleFilterChange('features', newFeatures);
  };

  const clearFilters = () => {
    const clearedFilters: SearchFilters = {};
    setFilters(clearedFilters);
    onSearch(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0)
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Quick Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={filters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
            className="input-primary"
          >
            <option value="">All Types</option>
            <option value="sale">For Sale</option>
            <option value="rent">For Rent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
            className="input-primary"
          >
            <option value="">All Categories</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="land">Land</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <select
            value={filters.city || ''}
            onChange={(e) => handleFilterChange('city', e.target.value || undefined)}
            className="input-primary"
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full btn-outline flex items-center justify-center"
            type="button"
          >
            <Filter className="h-4 w-4 mr-2" />
            Advanced
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t border-gray-200 pt-6 space-y-6">
          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Price Range
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  placeholder="Min Price"
                  value={filters.minPrice ?? ''}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                  className="input-primary"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Max Price"
                  value={filters.maxPrice ?? ''}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                  className="input-primary"
                />
              </div>
            </div>
          </div>

          {/* Bedrooms & Area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bedrooms
              </label>
              <select
                value={filters.minBedrooms ?? ''}
                onChange={(e) => handleFilterChange('minBedrooms', e.target.value ? Number(e.target.value) : undefined)}
                className="input-primary"
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Area (m²)
              </label>
              <input
                type="number"
                placeholder="Min area"
                value={filters.minArea ?? ''}
                onChange={(e) => handleFilterChange('minArea', e.target.value ? Number(e.target.value) : undefined)}
                className="input-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Area (m²)
              </label>
              <input
                type="number"
                placeholder="Max area"
                value={filters.maxArea ?? ''}
                onChange={(e) => handleFilterChange('maxArea', e.target.value ? Number(e.target.value) : undefined)}
                className="input-primary"
              />
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Features
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {features.map((feature) => (
                <button
                  key={feature}
                  type="button"
                  onClick={() => handleFeatureToggle(feature)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    filters.features?.includes(feature)
                      ? 'bg-primary-100 border-primary-300 text-primary-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {feature}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {filters.type && (
                <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                  Type: {filters.type}
                </span>
              )}
              {filters.city && (
                <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                  City: {filters.city}
                </span>
              )}
              {filters.search && (
                <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                  Search: {filters.search}
                </span>
              )}
              {filters.minPrice !== undefined && (
                <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                  Min: {filters.minPrice}
                </span>
              )}
              {filters.maxPrice !== undefined && (
                <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                  Max: {filters.maxPrice}
                </span>
              )}
              {filters.features && filters.features.length > 0 && (
                <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                  {filters.features.length} features
                </span>
              )}
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
              type="button"
            >
              <X className="h-4 w-4 mr-1" />
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
