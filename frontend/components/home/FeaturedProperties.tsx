import Image from 'next/image';
import Link from 'next/link';
import { MapPin, BedDouble, Bath, Maximize2, Star } from 'lucide-react';

const featuredProperties = [
  {
    id: '1',
    title: 'Modern Apartment in Tirana City Center',
    location: 'Tirana, Albania',
    price: '€220,000',
    bedrooms: 2,
    bathrooms: 2,
    area: '120 m²',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: '2',
    title: 'Luxury Villa in Sarandë Coastal Hills',
    location: 'Sarandë, Albania',
    price: '€750,000',
    bedrooms: 5,
    bathrooms: 4,
    area: '380 m²',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1613977256644-1ecc70409f93?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: '3',
    title: 'Commercial Space in Durrës Port Area',
    location: 'Durrës, Albania',
    price: '€3,500 / month',
    bedrooms: 0,
    bathrooms: 2,
    area: '420 m²',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
  },
];

export default function FeaturedProperties() {
  return (
    <section className="section-padding py-16 bg-gray-50">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <span className="inline-block px-4 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-3">Featured Listings</span>
            <h2 className="text-3xl font-bold text-gray-900">Handpicked Homes & Investments</h2>
            <p className="text-gray-600 mt-2 max-w-2xl">
              Explore properties vetted by our expert team. Every listing is verified and ready for viewing.
            </p>
          </div>
          <Link href="/properties" className="btn-outline whitespace-nowrap self-start md:self-auto">
            View All Properties
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {featuredProperties.map((property) => (
            <div key={property.id} className="card overflow-hidden group">
              <div className="relative h-56">
                <Image
                  src={property.image}
                  alt={property.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute top-4 left-4 bg-white/90 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                  {property.price}
                </div>
                <div className="absolute top-4 right-4 flex items-center bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                  <Star className="h-4 w-4 mr-1 text-yellow-300" />
                  {property.rating}
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{property.title}</h3>
                  <div className="flex items-center text-gray-500 text-sm">
                    <MapPin className="h-4 w-4 mr-1" />
                    {property.location}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <BedDouble className="h-4 w-4 mr-2 text-primary-600" />
                    <span>{property.bedrooms} Beds</span>
                  </div>
                  <div className="flex items-center">
                    <Bath className="h-4 w-4 mr-2 text-primary-600" />
                    <span>{property.bathrooms} Baths</span>
                  </div>
                  <div className="flex items-center">
                    <Maximize2 className="h-4 w-4 mr-2 text-primary-600" />
                    <span>{property.area}</span>
                  </div>
                </div>

                <Link href={`/properties/${property.id}`} className="btn-secondary block text-center">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
