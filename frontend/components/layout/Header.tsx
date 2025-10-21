'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, X, Home, User, LogOut, Plus } from 'lucide-react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container-custom section-padding">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Home className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Immo Albania</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/properties" className="text-gray-700 hover:text-primary-600 transition-colors">
              Properties
            </Link>
            <Link href="/agents" className="text-gray-700 hover:text-primary-600 transition-colors">
              Agents
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-primary-600 transition-colors">
              About
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-primary-600 transition-colors">
              Contact
            </Link>
          </nav>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                {user.role === 'agent' && (
                  <Link 
                    href="/dashboard/properties/new" 
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Property</span>
                  </Link>
                )}
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-gray-700 hover:text-primary-600">
                    <User className="h-5 w-5" />
                    <span>{user.name}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link 
                      href="/dashboard" 
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-t-lg"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-b-lg flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login" className="text-gray-700 hover:text-primary-600 transition-colors">
                  Login
                </Link>
                <Link href="/register" className="btn-primary">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-4">
              <Link href="/properties" className="text-gray-700 hover:text-primary-600">
                Properties
              </Link>
              <Link href="/agents" className="text-gray-700 hover:text-primary-600">
                Agents
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-primary-600">
                About
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-primary-600">
                Contact
              </Link>
              
              {user ? (
                <>
                  <Link href="/dashboard" className="text-gray-700 hover:text-primary-600">
                    Dashboard
                  </Link>
                  {user.role === 'agent' && (
                    <Link href="/dashboard/properties/new" className="text-gray-700 hover:text-primary-600">
                      Add Property
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="text-left text-gray-700 hover:text-primary-600 flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <div className="flex flex-col space-y-2 pt-2">
                  <Link href="/login" className="text-gray-700 hover:text-primary-600">
                    Login
                  </Link>
                  <Link href="/register" className="btn-primary text-center">
                    Sign Up
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
