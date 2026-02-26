/**
 * Canonical path for each page (must match src/routes.jsx ROUTES).
 * Used so utils does not import routes (avoids circular dependency).
 */
const PAGE_PATHS: Record<string, string> = {
  Home: '/home',
  Journal: '/journal',
  Progress: '/progress',
  Export: '/export',
  ExercisesSetup: '/exercises-setup',
  Tracking: '/tracking',
  Recipes: '/recipes',
  UserRegistration: '/user-registration',
  CompleteProfile: '/complete-profile',
  ExerciseLibrary: '/exercise-library',
  Contract: '/contract',
  BoosterEvents: '/booster-events',
  Maintenance: '/maintenance',
  Marketing: '/marketing',
  PrivacyPolicy: '/privacy-policy',
  TermsOfService: '/terms-of-service',
  ExerciseDBTester: '/exercise-db-tester',
  DeleteRequest: '/delete-request',
  AdminDashboard: '/admin',
  LoginScreen: '/home', // login redirects to home
};

/**
 * Returns the canonical URL path for a page name (for Links and navigate).
 * Each app tab has a single route; this maps page name -> path.
 */
export function createPageUrl(pageName: string): string {
  if (!pageName || typeof pageName !== 'string') return '/home';
  const normalized = pageName.trim();
  return PAGE_PATHS[normalized] ?? '/' + normalized.toLowerCase().replace(/ /g, '-');
}
