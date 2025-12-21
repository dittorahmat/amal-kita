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

// Import pages directly to avoid SSR issues with useLayoutEffect
import { HomePage } from '@/pages/HomePage'
import { CampaignsPage } from "@/pages/CampaignsPage";
import { CampaignDetailPage } from "@/pages/CampaignDetailPage";
import { ZakatPage } from "@/pages/ZakatPage";
import { AboutPage } from "@/pages/AboutPage";
import { DonationSuccessPage } from "@/pages/DonationSuccessPage";
import { TeamPage } from '@/pages/TeamPage';
import { ContactPage } from '@/pages/ContactPage';
import { TermsPage } from '@/pages/TermsPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { DonationConfirmationPage } from '@/pages/DonationConfirmationPage';
import { EventListPage } from '@/pages/EventListPage';
import { EventDetailPage } from '@/pages/EventDetailPage';
import { EventRegistrationSuccessPage } from '@/pages/EventRegistrationSuccessPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { CampaignCreationPage } from '@/pages/admin/CampaignCreationPage';
import { EventCreationPage } from '@/pages/admin/EventCreationPage';
import { EventParticipantsPage } from '@/pages/admin/EventParticipantsPage';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
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
    path: "/konfirmasi-donasi/:campaignId",
    element: <DonationConfirmationPage />,
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
  {
    path: "/event",
    element: <EventListPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/event/:id",
    element: <EventDetailPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/event/:eventId/success",
    element: <EventRegistrationSuccessPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/admin/login",
    element: <AdminLoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/admin",
    element: <AdminDashboardPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/admin/campaigns/create",
    element: <CampaignCreationPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/admin/events/create",
    element: <EventCreationPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/admin/events/:eventId/participants",
    element: <EventParticipantsPage />,
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