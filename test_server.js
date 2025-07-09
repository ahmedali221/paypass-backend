const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend server is running!', timestamp: new Date().toISOString() });
});

// Test packages route
app.get('/api/packages', (req, res) => {
  res.json([
    {
      _id: '1',
      name: 'Basic Package',
      basePrice: 50,
      originalPrice: 75,
      features: ['Exterior wash', 'Interior cleaning'],
      popular: false,
      washes: 1,
      savings: 25,
      duration: 30
    },
    {
      _id: '2',
      name: 'Premium Package',
      basePrice: 100,
      originalPrice: 150,
      features: ['Exterior wash', 'Interior cleaning', 'Waxing', 'Tire shine'],
      popular: true,
      washes: 2,
      savings: 50,
      duration: 30
    }
  ]);
});

// Test washing places route
app.get('/api/washing-places', (req, res) => {
  res.json([
    {
      _id: '1',
      name: 'Car Wash Station 1',
      address: '123 Main St, Riyadh',
      phone: '+966501234567',
      hours: '8:00 AM - 8:00 PM',
      email: 'info@carwash1.com',
      city: 'Riyadh',
      rating: 4.5,
      customers: 150
    },
    {
      _id: '2',
      name: 'Premium Car Wash',
      address: '456 King Fahd Rd, Riyadh',
      phone: '+966507654321',
      hours: '7:00 AM - 9:00 PM',
      email: 'info@premiumwash.com',
      city: 'Riyadh',
      rating: 4.8,
      customers: 200
    }
  ]);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Test URL: http://localhost:${PORT}/api/test`);
  console.log(`Packages URL: http://localhost:${PORT}/api/packages`);
  console.log(`Washing places URL: http://localhost:${PORT}/api/washing-places`);
}); 