const parseLocation = (raw) => {
  if (!raw) return { name: '', phone: '', address: '', city: '', state: '', zip: '' };
  
  const parts = raw.split('|').map(p => p.trim());
  let addressStr = parts.pop() || '';
  let phone = parts.length > 0 ? parts.pop() : '';
  let name = parts.length > 0 ? parts.pop() : '';
  
  const cityStateZip = addressStr.split(',');
  let city = cityStateZip[0]?.trim() || '';
  let stateZip = cityStateZip[1]?.trim() || '';
  
  const stateZipParts = stateZip.split(' ').filter(Boolean);
  let state = stateZipParts[0] || '';
  let zip = stateZipParts.slice(1).join(' ') || '';
  
  return { name, phone, address: addressStr, city, state, zip };
};

console.log(parseLocation("Viji Eason | 9724000471 | Sugar Land, TX 77479"));
console.log(parseLocation("Mitesh Hasnani | +1 (702) 888-4174 | Fort Worth, TX 76040"));
console.log(parseLocation("Houston, TX 77041"));
