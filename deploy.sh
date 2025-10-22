#!/bin/bash

echo "🚀 Starting Immo Albania Deployment to Render..."

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo "❌ render.yaml not found. Please make sure you're in the project root."
    exit 1
fi

echo "📦 Preparing for deployment..."

# Build frontend
echo "🔨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "✅ Build completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Create a Render account at https://render.com"
echo "2. Connect your GitHub repository"
echo "3. Render will automatically detect render.yaml and deploy"
echo ""
echo "🌐 Your sites will be available at:"
echo "   Frontend: https://immo-albania-frontend.onrender.com"
echo "   Backend:  https://immo-albania-backend.onrender.com"
echo ""
echo "⚙️ Remember to set up these environment variables in Render:"
echo "   - CLOUDINARY_CLOUD_NAME"
echo "   - CLOUDINARY_API_KEY"
echo "   - CLOUDINARY_API_SECRET"
echo "   - GOOGLE_MAPS_API_KEY"
echo "   - EMAIL_USER"
echo "   - EMAIL_PASS"
echo "   - STRIPE_SECRET_KEY"
echo ""
echo "🎉 Happy deploying!"
