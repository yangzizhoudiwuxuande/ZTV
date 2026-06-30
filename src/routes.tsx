import HomePage from './pages/HomePage';
import VideoPage from './pages/VideoPage';
import UploadPage from './pages/UploadPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import type { ReactNode } from 'react';

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  {
    name: 'Home',
    path: '/',
    element: <HomePage />
  },
  {
    name: 'Video',
    path: '/video/:id',
    element: <VideoPage />
  },
  {
    name: 'Upload',
    path: '/upload',
    element: <UploadPage />
  },
  {
    name: 'Login',
    path: '/login',
    element: <LoginPage />
  },
  {
    name: 'Admin',
    path: '/admin',
    element: <AdminPage />
  }
];

export default routes;
v
