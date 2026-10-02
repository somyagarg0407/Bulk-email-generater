import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import RecipientBuilder from './pages/RecipientBuilder.jsx';
import SavedLists from './pages/SavedLists.jsx';
import SavedListDetail from './pages/SavedListDetail.jsx';
import Settings from './pages/Settings.jsx';
import AdminHome from './pages/admin/AdminHome.jsx';
import Batches from './pages/admin/Batches.jsx';
import Branches from './pages/admin/Branches.jsx';
import RollRules from './pages/admin/RollRules.jsx';
import Users from './pages/admin/Users.jsx';
import AuditLogs from './pages/admin/AuditLogs.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/recipients" element={<RecipientBuilder />} />
          <Route path="/saved-lists" element={<SavedLists />} />
          <Route path="/saved-lists/:id" element={<SavedListDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route element={<ProtectedRoute roles={['SUPER_ADMIN', 'CLUB_ADMIN']} />}>
            <Route path="/admin/users" element={<Users />} />
          </Route>
          <Route element={<ProtectedRoute roles={['SUPER_ADMIN']} />}>
            <Route path="/admin" element={<AdminHome />} />
            <Route path="/admin/batches" element={<Batches />} />
            <Route path="/admin/branches" element={<Branches />} />
            <Route path="/admin/roll-rules" element={<RollRules />} />
            <Route path="/admin/audit-logs" element={<AuditLogs />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
