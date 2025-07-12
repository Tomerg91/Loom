// Mock database schema for development
// In a real application, this would define actual database tables

export const users = {
  id: 'id',
  email: 'email',
  firstName: 'firstName',
  lastName: 'lastName',
  role: 'role',
  status: 'status',
  avatarUrl: 'avatarUrl',
  phone: 'phone',
  bio: 'bio',
  location: 'location',
  website: 'website',
  specialties: 'specialties',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lastLoginAt: 'lastLoginAt',
};

export const sessions = {
  id: 'id',
  userId: 'userId',
  coachId: 'coachId',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

export const ratings = {
  id: 'id',
  sessionId: 'sessionId',
  rating: 'rating',
  createdAt: 'createdAt',
};

export const payments = {
  id: 'id',
  sessionId: 'sessionId',
  amount: 'amount',
  status: 'status',
  createdAt: 'createdAt',
};