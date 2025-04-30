import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

export function AdSenseScript() {
  const [location] = useLocation();
  const [shouldRender, setShouldRender] = useState(false);
  
  useEffect(() => {
    // Check if current path is not an admin path
    const isAdminPath = location.startsWith('/admin') || 
                       location.startsWith('/super-admin') || 
                       location === '/admin';
    
    setShouldRender(!isAdminPath);
    
    // If we're not on an admin page, add the AdSense script
    if (!isAdminPath) {
      try {
        // This will trigger the AdSense code to run/refresh
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense error:', e);
      }
    }
  }, [location]);
  
  // Only render the ad slot when not on admin pages
  if (!shouldRender) return null;
  
  return (
    <div className="ad-container my-4">
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client="ca-pub-9077491758567451"
           data-ad-slot="auto"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  );
}