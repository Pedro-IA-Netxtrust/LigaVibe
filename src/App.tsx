/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import Dashboard from './pages/Dashboard';
import Players from './pages/Players';
import Categories from './pages/Categories';
import Registrations from './pages/Registrations';
import Fixture from './pages/Fixture';
import Standings from './pages/Standings';
import Schedule from './pages/Schedule';

function pageFromPath(pathname: string): string {
  const seg = pathname.replace(/^\//, '').split('/')[0];
  if (!seg || seg === 'dashboard') return 'dashboard';
  return seg;
}

function AppRoutes() {
  const location = useLocation();
  const activePage = pageFromPath(location.pathname);

  return (
    <AppShell activePage={activePage}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jugadores" element={<Players />} />
        <Route path="/categorias" element={<Categories />} />
        <Route path="/inscripciones" element={<Registrations />} />
        <Route path="/fixture" element={<Fixture />} />
        <Route path="/programacion" element={<Schedule />} />
        <Route path="/posiciones" element={<Standings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return <AppRoutes />;
}
