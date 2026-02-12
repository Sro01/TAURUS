import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/home/HomePage';
import InstantReservationPage from './pages/instant-reservation/InstantReservationPage';
import PreReservationPage from './pages/pre-reservation/PreReservationPage';
import TeamDetailPage from './pages/team/TeamDetailPage';
import AdminPage from './pages/admin/AdminPage';
import NotFoundPage from './pages/not-found/NotFoundPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/instant-reservation" element={<InstantReservationPage />} />
        <Route path="/pre-reservation" element={<PreReservationPage />} />
        <Route path="/teams/:id" element={<TeamDetailPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
