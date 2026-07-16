const https = require('https'); 
https.get('https://nexgenautotransport-crm.vercel.app/leads/65', (res) => { 
  let data = ''; 
  res.on('data', chunk => data += chunk); 
  res.on('end', () => { 
    const match = data.match(/<script type="module" crossorigin src="(\/assets\/index-[^\"]+\.js)"><\/script>/); 
    if (match) { 
      const jsUrl = 'https://nexgenautotransport-crm.vercel.app' + match[1]; 
      https.get(jsUrl, (jsRes) => { 
        let jsData = ''; 
        jsRes.on('data', chunk => jsData += chunk); 
        jsRes.on('end', () => { 
          const hasWidth80 = jsData.includes('width:"80px"'); 
          console.log('Has width 80px?', hasWidth80);
          const hasHideArrows = jsData.includes('-webkit-inner-spin-button');
          console.log('Has hide arrows CSS?', hasHideArrows);
        }); 
      }); 
    } 
  }); 
});
