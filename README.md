# FinisPro Admin Dashboard

Enterprise-grade construction management admin dashboard built with React, TypeScript, and Vite.

## 🏗️ Architecture

This project follows a **feature-based architecture** that separates concerns cleanly and makes backend integration trivial.

```
src/
├── app/                    # App initialization
├── features/               # Feature modules (projects, companies, etc.)
├── shared/                 # Shared components, hooks, types
├── services/               # API service layer
├── config/                 # Configuration
└── store/                  # Client-side state (UI only)
```

## 🚀 Local Setup and Connection

This dashboard connects to the NestJS API in the sibling `finis-backend`
folder. The default local addresses are:

- Dashboard: `http://localhost:5173`
- Backend REST and Socket.IO: .env

### Requirements

- Node.js 20 or 22
- pnpm
- The backend and its PostgreSQL database running for real data

### Install and configure

```bash
cd ~/Desktop/project/finis/finis-dashboard
pnpm install
cp .env.example .env
```

Use this local `.env` configuration:

```dotenv
VITE_API_BASE_URL=.env
VITE_APP_URL=http://localhost:5173
VITE_ENV=development
VITE_USE_MOCK_API=false
VITE_GOOGLE_MAPS_API_KEY=
VITE_APP_VERSION=1.0.0
VITE_FEATURE_GEOFENCING=true
VITE_FEATURE_CHAT=true
VITE_FEATURE_REPORTS=true
VITE_FEATURE_PAYROLL=true
```

`VITE_API_BASE_URL` is used for both HTTP requests and Socket.IO connections.
Do not add a trailing slash.

### Run development server

Start the backend first, then run:

```bash
pnpm exec vite --host 0.0.0.0
```

Open `http://localhost:5173`. Using `--host 0.0.0.0` also lets a phone on the
same network open `http://YOUR_COMPUTER_LAN_IP:5173`.

If Vite selects another port because `5173` is busy, update both
`VITE_APP_URL` here and `FRONTEND_URL` in `finis-backend/.env`.

### Build and preview

```bash
pnpm build
pnpm exec vite preview --host 0.0.0.0
```

### Verify the connection

Open the browser developer tools and perform a login. API requests should go
to .env, not port `5173`. A network error usually means the
backend is stopped or `VITE_API_BASE_URL` is wrong. An HTTP `401`/`403` means
the backend was reached but authentication or permissions rejected the
request.

---

## 📁 Project Structure

### Features (`src/features/`)

Each feature is a self-contained module with:
- `components/` - Feature-specific UI components
- `hooks/` - Data fetching and business logic hooks
- `pages/` - Route pages
- `types/` - Feature-specific types
- `index.ts` - Public API

**Available Features:**
- `dashboard` - Main dashboard
- `projects` - Project management
- `companies` - Company management
- `workforce` - Worker management
- `time-tracking` - Attendance and schedules
- `payroll` - Payroll processing
- `expenses` - Expense management
- `reports` - Reporting
- `admin-management` - Admin and manager management
- `geofencing` - Location-based tracking
- `chat` - Team communication
- `tenant-management` - Multi-tenant SaaS management

### Shared (`src/shared/`)

Reusable components and utilities used across features:
- `components/ui/` - Base UI primitives (Button, Input, etc.)
- `components/layout/` - Layout components (Sidebar, Header)
- `hooks/` - Shared custom hooks
- `types/` - Shared TypeScript types
- `utils/` - Utility functions

### Services (`src/services/`)

API service layer that abstracts backend communication:
- `api/` - Real API client and endpoints
- `mock/` - Mock API for development
- `index.ts` - Service exports and switching logic

---

## 🔌 Backend Integration

Set `VITE_USE_MOCK_API=false` and point `VITE_API_BASE_URL` to the backend.
Most active feature hooks already call the shared real API client in
`src/services/api/client.ts`. Some older/demo services still fall back to
`MockApiService`, so verify the individual feature before assuming it is fully
connected.

Authentication tokens are stored in browser storage and sent as
`Authorization: Bearer <token>`. Chat, notifications, workforce, and
geofencing use Socket.IO namespaces on the same backend origin.

See [`docs/BACKEND_INTEGRATION.md`](./docs/BACKEND_INTEGRATION.md) for endpoint
details.

---

## 🛠️ Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Radix UI** - Accessible components
- **Recharts** - Charts and visualizations
- **React Router** - Routing
- **Lucide React** - Icons

---

## 🎯 Key Features

✅ **Enterprise Architecture** - Feature-based structure for scalability  
✅ **100% TypeScript** - Full type safety, no `any` types  
✅ **Backend-Ready** - Plug-and-play API integration  
✅ **State Management** - Separation of server and client state  
✅ **Performance** - Code splitting and lazy loading  
✅ **SEO-Friendly** - Semantic HTML and meta management  
✅ **Developer Experience** - Clear patterns and documentation

---

## 📝 Development Guide

### Adding a New Feature

1. **Create feature folder structure:**
```bash
mkdir -p src/features/my-feature/{components,hooks,pages,types}
```

2. **Create custom hooks:**
```typescript
// src/features/my-feature/hooks/useMyFeature.ts
import { useQuery } from '@/shared/hooks';
import { myService } from '@/services';

export function useMyFeature() {
  const query = useQuery('my-feature', () => myService.getData());
  return {
    data: query.data,
    isLoading: query.isLoading,
  };
}
```

3. **Create page component:**
```typescript
// src/features/my-feature/pages/MyFeaturePage.tsx
import { useMyFeature } from '../hooks';

export function MyFeaturePage() {
  const { data, isLoading } = useMyFeature();
  // ... render UI
}
```

4. **Add route:**
```typescript
// src/app/router.tsx
import { MyFeaturePage } from '@/features/my-feature/pages/MyFeaturePage';

// Add to routes
<Route path="/my-feature" element={<MyFeaturePage />} />
```

### Adding a New API Endpoint

See [`docs/BACKEND_INTEGRATION.md`](./docs/BACKEND_INTEGRATION.md#example-adding-a-new-endpoint)

---

## 🧪 Code Quality

### Linting

```bash
pnpm lint
```

### Type Checking

```bash
pnpm exec tsc --noEmit
```

---

## 📚 Documentation

- [Backend Integration Guide](./docs/BACKEND_INTEGRATION.md) - For connecting real APIs
- [Implementation Plan](../.gemini/antigravity/brain/*/implementation_plan.md) - Refactoring details
- [Task Breakdown](../.gemini/antigravity/brain/*/task.md) - Progress tracking

---

## 🤝 Contributing

1. Follow the existing architecture patterns
2. Keep components small and focused
3. Use custom hooks for data fetching
4. Never hardcode API data in components
5. Update types when adding features

---

## 📄 License

Proprietary - FinisPro Admin Dashboard

---

## 🆘 Support

For questions or issues, see the documentation or contact the development team.
