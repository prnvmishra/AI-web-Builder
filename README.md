# AI Web Builder

A powerful AI-powered web application builder that allows users to create, customize, and deploy websites using artificial intelligence. Built with React, Node.js, Firebase, and OpenAI integration.

## Features

- **AI-Powered Website Generation**: Create websites using natural language prompts
- **Real-time Preview**: See your changes instantly with live preview
- **Project Management**: Save, edit, and manage multiple projects
- **Community Gallery**: Browse and share projects with the community
- **User Authentication**: Secure login with Firebase Authentication
- **Credit System**: Manage credits for AI generation
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Modern Tech Stack**: React, Node.js, Express, Firebase, OpenAI

## Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Firebase Auth** - Authentication
- **Axios** - HTTP client
- **React Router** - Navigation
- **Sonner** - Toast notifications

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **Firebase Admin** - Backend authentication
- **OpenAI/OpenRouter** - AI integration
- **Prisma** - Database ORM
- **Stripe** - Payment processing
- **CORS** - Cross-origin resource sharing

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Firebase project setup
- OpenAI/OpenRouter API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/prnvmishra/AI-web-Builder.git
   cd AI-web-Builder
   ```

2. **Install dependencies**
   ```bash
   # Install client dependencies
   cd client
   npm install

   # Install server dependencies
   cd ../server
   npm install
   ```

3. **Environment Setup**

   **Client Environment** (`client/.env.local`):
   ```bash
   VITE_BASEURL=http://localhost:3000
   VITE_PROD_BASEURL=https://your-server-url.vercel.app
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

   **Server Environment** (`server/.env.local`):
   ```bash
   NODE_ENV=development
   PORT=3000
   TRUSTED_ORIGINS=http://localhost:5173
   AI_API_KEY=your_openrouter_api_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   FIREBASE_SERVICE_ACCOUNT_KEY=your_firebase_service_account_key
   BETTER_AUTH_URL=http://localhost:5173
   DATABASE_URL=your_database_connection_string
   ```

4. **Start the development servers**

   **Start the backend server**:
   ```bash
   cd server
   npm run server
   ```

   **Start the frontend** (in a new terminal):
   ```bash
   cd client
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## Environment Variables

### Required Environment Variables

#### Client Variables
- `VITE_BASEURL`: Backend URL for development
- `VITE_PROD_BASEURL`: Backend URL for production
- `VITE_FIREBASE_*`: Firebase configuration keys

#### Server Variables
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port
- `TRUSTED_ORIGINS`: Allowed CORS origins
- `AI_API_KEY`: OpenRouter API key for AI generation
- `STRIPE_SECRET_KEY`: Stripe secret for payments
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Firebase service account JSON
- `DATABASE_URL`: PostgreSQL connection string

### Setup Instructions

1. **Firebase Setup**:
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication (Email/Password)
   - Get your Firebase configuration from Project Settings
   - Download service account key from Service Accounts tab

2. **OpenRouter Setup**:
   - Sign up at https://openrouter.ai
   - Get your API key from the dashboard
   - Add it to `AI_API_KEY`

3. **Stripe Setup** (optional):
   - Create a Stripe account
   - Get API keys from Stripe Dashboard
   - Add webhook secret for payment processing

## Deployment

### Vercel Deployment

#### Deploy Client
1. Connect your GitHub repository to Vercel
2. Set Root Directory to `client`
3. Add client environment variables
4. Deploy

#### Deploy Server
1. Create new Vercel project
2. Set Root Directory to `server`
3. Add server environment variables
4. Deploy

### Important: Update CORS Origins

After deployment, update your server's `TRUSTED_ORIGINS` to include your Vercel URLs:
```bash
TRUSTED_ORIGINS=https://your-client-url.vercel.app,https://your-other-urls.vercel.app
```

## API Endpoints

### Authentication
- `POST /api/user/profile` - Get user profile
- `GET /api/user/credits` - Get user credits

### Projects
- `GET /api/user/projects` - Get user projects
- `GET /api/user/project/:id` - Get specific project
- `POST /api/project/save` - Save project
- `POST /api/project/revision` - Generate AI revision
- `DELETE /api/project/:id` - Delete project
- `GET /api/project/published` - Get published projects
- `GET /api/project/preview/:id` - Get project preview

### Payments
- `POST /api/user/purchase-credits` - Purchase credits

## Project Structure

```
AI-web-Builder/
client/
  src/
    components/     # Reusable UI components
    configs/       # Axios and other configurations
    lib/           # Firebase and utilities
    pages/         # Page components
    types/         # TypeScript type definitions
server/
  src/
    configs/       # OpenAI and other configurations
    routes/        # API route handlers
    utils/         # Helper functions
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you have any questions or need support, please:

1. Check the [Issues](https://github.com/prnvmishra/AI-web-Builder/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

## Troubleshooting

### Common Issues

1. **Network Errors**: 
   - Check if backend server is running
   - Verify environment variables
   - Ensure CORS origins are correctly set

2. **Authentication Issues**:
   - Verify Firebase configuration
   - Check service account key format
   - Ensure environment variables are correctly set

3. **AI Generation Not Working**:
   - Verify OpenRouter API key
   - Check credit balance
   - Ensure proper internet connection

### Getting Help

For additional help:
- Check the console for error messages
- Review the environment variable setup
- Ensure all required services are properly configured

---

Built with React, Node.js, and AI technology. Happy building!
