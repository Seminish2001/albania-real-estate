import Image from 'next/image';
import Link from 'next/link';

const cities = [
  {
    name: 'Tirana',
    listings: 1800,
    description: 'Vibrant capital city with modern developments and historic charm.',
    image: 'https://images.unsplash.com/photo-1505764722399-00c953dfe6c3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Vlora',
    listings: 950,
    description: 'Coastal paradise with stunning beaches and investment opportunities.',
    image: 'https://images.unsplash.com/photo-1523906630133-f6934a1ab1e6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Shkodër',
    listings: 420,
    description: 'Northern cultural hub surrounded by mountains and lakes.',
    image: 'https://images.unsplash.com/photo-1533000971552-6a962ff0b9ef?auto=format&fit=crop&w=1200&q=80',
  },
];

export default function CitiesSection() {
  return (
    <section className="section-padding py-16 bg-white">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <span className="inline-block px-4 py-1 rounded-full bg-secondary-100 text-secondary-700 text-sm font-medium mb-3">
              Popular Areas
            </span>
            <h2 className="text-3xl font-bold text-gray-900">Explore Top Cities</h2>
            <p className="text-gray-600 mt-2 max-w-2xl">
              Discover neighborhoods that match your lifestyle. From bustling urban centers to serene coastal escapes.
            </p>
          </div>
          <Link href="/cities" className="btn-outline whitespace-nowrap self-start md:self-auto">
            View All Cities
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {cities.map((city) => (
            <div key={city.name} className="card overflow-hidden group">
              <div className="relative h-56">
                <Image
                  src={city.image}
                  alt={city.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="text-xl font-semibold">{city.name}</h3>
                  <p className="text-sm text-white/80">{city.description}</p>
                  <div className="mt-3 text-sm font-medium">{city.listings.toLocaleString('en-US')} listings</div>
                </div>
              </div>
              <div className="p-6">
                <Link href={`/properties?city=${city.name}`} className="btn-primary w-full text-center">
                  View Listings
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
