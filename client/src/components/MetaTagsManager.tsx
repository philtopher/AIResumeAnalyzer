import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function MetaTagsManager() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Check if current path should be excluded
    const isExcludedPath = 
      location.startsWith('/admin') || 
      location.startsWith('/super-admin') ||
      location === '/admin' ||
      location === '/contact' ||
      location === '/privacy-policy' ||
      location === '/terms-of-service';
    
    // Find existing monetag meta tag
    let monetagMeta = document.querySelector('meta[name="monetag"]');
    
    if (!isExcludedPath) {
      // Add monetag meta tag if it doesn't exist
      if (!monetagMeta) {
        monetagMeta = document.createElement('meta');
        monetagMeta.setAttribute('name', 'monetag');
        monetagMeta.setAttribute('content', '683e00ec16089dff8076d190c8be7093');
        document.head.appendChild(monetagMeta);
      }
    } else {
      // Remove monetag meta tag if it exists and we're on an excluded page
      if (monetagMeta) {
        monetagMeta.remove();
      }
    }
  }, [location]);
  
  // This component doesn't render anything visible
  return null;
}
