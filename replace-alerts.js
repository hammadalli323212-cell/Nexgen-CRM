import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, 'src', 'pages');
const componentsDir = path.join(__dirname, 'src', 'components', 'common');

const processFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Simple heuristic: if it contains alert( and doesn't import toast, add import
  if (content.includes('alert(') && !content.includes("import toast from 'react-hot-toast'")) {
    content = "import toast from 'react-hot-toast';\n" + content;
  }

  // Replace alert("... successfully") with toast.success
  content = content.replace(/alert\(([`"'].*?(success|saved|updated|converted).*?[`"'])\)/gi, 'toast.success($1)');
  
  // Replace alert("Error..." or "Failed...") with toast.error
  content = content.replace(/alert\(([`"'].*?(Error|Failed|Select an order|No email|Action Type).*?[`"'])\)/gi, 'toast.error($1)');
  
  // Replace any remaining alerts with toast.error (usually fallbacks or warnings)
  content = content.replace(/alert\(/g, 'toast.error(');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${path.basename(filePath)}`);
  }
};

const walkSync = (dir) => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkSync(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
};

walkSync(pagesDir);
walkSync(componentsDir);

// Also fix LeadDetails window.location.origin
const leadDetailsPath = path.join(pagesDir, 'LeadDetails.jsx');
if (fs.existsSync(leadDetailsPath)) {
  let ld = fs.readFileSync(leadDetailsPath, 'utf8');
  ld = ld.replace(/window\.location\.origin/g, '(import.meta.env.VITE_APP_URL || window.location.origin)');
  fs.writeFileSync(leadDetailsPath, ld);
  console.log('Fixed window.location.origin in LeadDetails.jsx');
}
