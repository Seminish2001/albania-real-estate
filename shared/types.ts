export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'agent' | 'admin';
  avatar?: string;
  phone?: string;
  isVerified: boolean;
  createdAt: Date;
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
  isVerified: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent {
  id: string;
  userId: string;
  agency?: string;
  licenseNumber?: string;
  experience: number;
  specialization: string[];
  rating: number;
  reviewCount: number;
  propertiesListed: number;
  isPremium: boolean;
  subscriptionEnds?: Date;
}

export interface Chat {
  id: string;
  propertyId?: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt: Date;
  createdAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  read: boolean;
  createdAt: Date;
}
