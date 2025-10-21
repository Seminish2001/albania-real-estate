'use client';

import { useState } from 'react';
import { Search, Home, Shield, Users } from 'lucide-react';

export default function Hero() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black/10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMTUgMTVoMzB2MzBIMTV6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-10"></div>
      </div>

      <div className="relative container-custom section-padding py-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
            <Shield className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Albania's Most Trusted Real Estate Platform</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Find Your Perfect
            <span className="block text-primary-200">Property in Albania</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-primary-100 mb-12 max-w-2xl mx-auto leading-relaxed">
            Discover verified properties for sale and rent across Albania. 
            Trusted by thousands of buyers, sellers, and agents.
          </p>

          {/* Search Bar */}
          <div className="bg-white rounded-2xl p-2 shadow-2xl max-w-2xl mx-auto mb-16">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center px-4">
                <Search className="h-5 w-5 text-gray-400 mr-3" />
                <input
                  type="text"
                  placeholder="Search by city, neighborhood, or property type..."
                  className="w-full py-4 text-gray-900 placeholder-gray-500 focus:outline-none text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="btn-primary px-8 py-4 text-lg font-semibold rounded-xl whitespace-nowrap">
                Search
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="flex justify-center items-center w-12 h-12 bg-white/20 rounded-lg mb-3 mx-auto">
                <Home className="h-6 w-6" />
              </div>
              <div className="text-2xl font-bold">5,000+</div>
              <div className="text-primary-200">Properties Listed</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center items-center w-12 h-12 bg-white/20 rounded-lg mb-3 mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <div className="text-2xl font-bold">200+</div>
              <div className="text-primary-200">Verified Agents</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center items-center w-12 h-12 bg-white/20 rounded-lg mb-3 mx-auto">
                <Shield className="h-6 w-6" />
              </div>
              <div className="text-2xl font-bold">98%</div>
              <div className="text-primary-200">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave Decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none" 
          className="w-full h-12 text-gray-50 fill-current"
        >
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" />
          <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" />
          <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" />
        </svg>
      </div>
    </section>
  );
}
