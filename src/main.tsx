import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css'
import { HomePage } from '@/pages/HomePage'
import { CampaignsPage } from "./pages/CampaignsPage";
import { CampaignDetailPage } from "./pages/CampaignDetailPage";
import { ZakatPage } from "./pages/ZakatPage";
import { AboutPage } from "./pages/AboutPage";
import { DonationSuccessPage } from "./pages/DonationSuccessPage";
import { TeamPage } from './pages/TeamPage';
import { ContactPage } from './pages/ContactPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/kampanye",
    element: <CampaignsPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/kampanye/:id",
    element: <CampaignDetailPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/zakat",
    element: <ZakatPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/tentang-kami",
    element: <AboutPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/donasi-berhasil/:campaignId",
    element: <DonationSuccessPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/tim",
    element: <TeamPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/kontak",
    element: <ContactPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/syarat-ketentuan",
    element: <TermsPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/kebijakan-privasi",
    element: <PrivacyPage />,
    errorElement: <RouteErrorBoundary />,
  },
]);
// Do not touch this code
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
)