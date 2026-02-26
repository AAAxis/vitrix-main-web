import Layout from './Layout';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { ROUTES, getPageNameFromPath, LEGACY_REDIRECTS, LegacyAdminRedirect, AdmindashboardRedirect, LegacyRedirectTo } from '@/routes';

function PagesContent() {
  const location = useLocation();
  const currentPageName = getPageNameFromPath(location.pathname);

  return (
    <Layout currentPageName={currentPageName}>
      <Routes>
        {ROUTES.map(({ path, element }) => (
          <Route key={path || 'root'} path={path} element={element} />
        ))}
        {/* Old /AdminDashboard (capital A) with tab – redirect to /admin with same tab */}
        <Route path="/AdminDashboard/:tab/:subTab" element={<LegacyAdminRedirect />} />
        <Route path="/AdminDashboard/:tab" element={<LegacyAdminRedirect />} />
        {/* Old /admindashboard (lowercase) – exclude: redirect to /admin only, path not preserved */}
        <Route path="/admindashboard/*" element={<AdmindashboardRedirect />} />
        {LEGACY_REDIRECTS.map(([from, to]) => (
          <Route key={from} path={from} element={<LegacyRedirectTo to={to} />} />
        ))}
      </Routes>
    </Layout>
  );
}

export default function Pages() {
  return (
    <Router>
      <PagesContent />
    </Router>
  );
}
