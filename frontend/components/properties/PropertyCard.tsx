import Link from 'next/link';
import Image from 'next/image';
import { Property } from '../../types';
import { Heart, MapPin, Bed, Bath, Square } from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  onFavorite?: (propertyId: string) => void;
  isFavorited?: boolean;
}

export default function PropertyCard({ property, onFavorite, isFavorited = false }: PropertyCardProps) {
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('sq-AL', {
      style: 'currency',
      currency: currency === 'EUR' ? 'EUR' : 'ALL',
      maximumFractionDigits: 0
    }).format(price);
  };

  const getTypeLabel = (type: string) => {
    return type === 'sale' ? 'For Sale' : 'For Rent';
  };

  const primaryImage = property.images?.[0] || '/images/placeholder-property.jpg';

  return (
    <div className="card group hover:shadow-lg transition-all duration-300">
      <div className="relative">
        <Link href={`/properties/${property.id}`}>
          <div className="aspect-[4/3] relative overflow-hidden rounded-t-xl">
            <Image
              src={primaryImage}
              alt={property.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              priority={false}
            />
            <div className="absolute top-3 left-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                property.type === 'sale'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {getTypeLabel(property.type)}
              </span>
            </div>
            {property.featured && (
              <div className="absolute top-3 right-3">
                <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                  Featured
                </span>
              </div>
            )}
          </div>
        </Link>

        {onFavorite && (
          <button
            onClick={() => onFavorite(property.id)}
            className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full p-2 transition-colors"
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={`h-4 w-4 ${
                isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'
              }`}
            />
          </button>
        )}
      </div>

      <div className="p-4">
        <Link href={`/properties/${property.id}`}>
          <h3 className="font-semibold text-gray-900 hover:text-primary-600 transition-colors line-clamp-2 mb-2">
            {property.title}
          </h3>
        </Link>

        <div className="flex items-center text-gray-600 text-sm mb-3">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="line-clamp-1">
            {property.location?.city}, {property.location?.municipality}
          </span>
        </div>

        <div className="flex items-center justify-between text-gray-600 text-sm mb-3">
          <div className="flex items-center space-x-4">
            {property.specifications?.bedrooms !== undefined && (
              <div className="flex items-center">
                <Bed className="h-4 w-4 mr-1" />
                <span>{property.specifications.bedrooms}</span>
              </div>
            )}
            {property.specifications?.bathrooms !== undefined && (
              <div className="flex items-center">
                <Bath className="h-4 w-4 mr-1" />
                <span>{property.specifications.bathrooms}</span>
              </div>
            )}
            {property.specifications?.area !== undefined && (
              <div className="flex items-center">
                <Square className="h-4 w-4 mr-1" />
                <span>{property.specifications.area}m²</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-lg font-bold text-primary-600">
            {formatPrice(property.price, property.currency)}
          </div>
          {property.agentName && (
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium mr-2">
                {property.agentName.charAt(0)}
              </div>
              {property.agentName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
