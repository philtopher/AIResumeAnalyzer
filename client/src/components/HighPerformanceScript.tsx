import { useLocation } from 'wouter';

export function HighPerformanceScript() {
  const [location] = useLocation();
  
  // Don't render the script on contact, terms, or privacy pages
  if (
    location === '/contact' ||
    location === '/terms-of-service' ||
    location === '/privacy-policy'
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
