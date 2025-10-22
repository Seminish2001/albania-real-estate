'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PropertyCard from '../properties/PropertyCard';
import { Property } from '../../types';
import api from '../../lib/api';
import { Loader, ArrowRight } from 'lucide-react';

export default function FeaturedProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProperties = async () => {
      try {
        const response = await api.get('/properties/featured');
        setProperties(response.data.data.properties);
      } catch (error) {
        console.error('Failed to fetch featured properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProperties();
  }, []);

  if (loading) {
    return (
      <section className="section-padding py-16 bg-white">
        <div className="container-custom">
          <div className="flex justify-center">
            <Loader className="h-8 w-8 text-primary-600 animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (properties.length === 0) return null;

  return (
    <section className="section-padding py-16 bg-white">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Featured Properties
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Hand-picked selection of premium properties with the best locations and amenities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/properties"
            className="btn-primary inline-flex items-center space-x-2"
          >
            <span>View All Properties</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
