export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'agent' | 'admin';
  avatar?: string;
  phone?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  type: 'sale' | 'rent';
  category: 'residential' | 'commercial' | 'land';
  price: number;
  currency: 'ALL' | 'EUR';
  location: {
    city: string;
    municipality: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  specifications: {
    bedrooms?: number;
    bathrooms?: number;
    area: number;
    floor?: number;
    totalFloors?: number;
    yearBuilt?: number;
  };
  features: string[];
  images: string[];
  status: 'active' | 'sold' | 'rented' | 'inactive';
  agentId: string;
  agentName?: string;
  agentAvatar?: string;
  agentAgency?: string;
  agentRating?: number;
  isVerified: boolean;
  views: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  userId: string;
  user?: User;
  agency?: string;
  licenseNumber?: string;
  experience: number;
  specialization: string[];
  rating: number;
  reviewCount: number;
  propertiesListed: number;
  isPremium: boolean;
  subscriptionEnds?: string;
}

export interface Chat {
  id: string;
  propertyId?: string;
  property?: Property;
  participants: string[];
  lastMessage?: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  read: boolean;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SearchFilters {
  type?: 'sale' | 'rent';
  category?: 'residential' | 'commercial' | 'land';
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minArea?: number;
  maxArea?: number;
  features?: string[];
}
