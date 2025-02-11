# EtsyBoost - Etsy Seller Optimization Tool

A Next.js web application designed to help Etsy sellers optimize their product marketing workflow with intelligent visual branding tools and a refined ad-supported model.

## Features

- React.js frontend with Next.js framework
- Robust error handling for service connections
- Optimized ad placement with non-invasive design
- Enhanced ad analytics and usage tracking
- Multi-watermark protection system
- SEO optimization with react-helmet
- Social media preview generator
- One-click social media post generator
- AI-powered branding consistency tools
- Responsive design for seller productivity

## Prerequisites

- Node.js v20+ (LTS recommended)
- PostgreSQL database
- Git

## Local Development Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd etsyboost
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with:
```env
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>
SESSION_SECRET=your_session_secret
PORT=3000
```

4. Set up the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
├── client/               # Frontend React application
│   ├── public/          # Static assets
│   └── src/             # Source files
│       ├── components/  # React components
│       ├── hooks/       # Custom React hooks
│       ├── lib/         # Utility functions
│       └── pages/       # Page components
├── server/              # Backend Express application
│   ├── services/        # Business logic
│   └── routes/          # API routes
└── shared/              # Shared types and utilities
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Run TypeScript checks
- `npm run db:push` - Update database schema

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
