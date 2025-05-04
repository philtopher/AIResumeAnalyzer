import { useLocation } from 'wouter';
import { useUser } from '../hooks/use-user';

export function HighPerformanceScript() {
  const [location] = useLocation();
  const { user } = useUser();
  
  // Check if the user is an admin or super admin
  const isAdmin = user?.role === 'sub_admin' || user?.role === 'super_admin';
  
  // Don't render the script on contact, terms, privacy pages or any admin pages
  if (
    location === '/contact' ||
    location === '/terms-of-service' ||
    location === '/privacy-policy' ||
    location.startsWith('/admin') ||
    location === '/super-admin' ||
    location === '/metrics' ||
    (isAdmin && [
      '/dashboard',
      '/privacy-dashboard',
      '/analysis',
      '/interviewer-analysis'
    ].includes(location))
  ) {
    return null;
  }

  return (
    <>
      <script type="text/javascript">
        {`
        atOptions = {
          'key' : 'b24f37150d6f9422a334f8813271e23b',
          'format' : 'iframe',
          'height' : 50,
          'width' : 320,
          'params' : {}
        };
        `}
      </script>
      <script 
        type="text/javascript" 
        src="//www.highperformanceformat.com/b24f37150d6f9422a334f8813271e23b/invoke.js"
      />
    </>
  );
}
