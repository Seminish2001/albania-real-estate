import Link from 'next/link';

export default function SearchSection() {
  return (
    <section className="section-padding py-16 bg-white">
      <div className="container-custom">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Smart Property Search</h2>
          <p className="text-lg text-gray-600">
            Filter thousands of listings by location, price range, property type, and more. Save your favorite searches and get instant alerts.
          </p>
        </div>

        <div className="card p-6 md:p-8">
          <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input type="text" placeholder="City or neighborhood" className="input-primary" />
            </div>
            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select className="input-primary">
                <option value="">Any</option>
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
              </select>
            </div>
            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Price</label>
              <input type="number" placeholder="ALL" className="input-primary" />
            </div>
            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Price</label>
              <input type="number" placeholder="ALL" className="input-primary" />
            </div>
            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
              <select className="input-primary">
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </div>
            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
              <select className="input-primary">
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
              </select>
            </div>
            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">Property Category</label>
              <select className="input-primary">
                <option value="">All</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="land">Land</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full">
                Search Properties
              </button>
            </div>
          </form>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
            <span>Need guidance? Explore curated collections for every lifestyle.</span>
            <Link href="/properties" className="text-primary-600 hover:text-primary-700 font-medium mt-2 sm:mt-0">
              Browse all properties →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
