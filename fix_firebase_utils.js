const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'firebaseUtils.ts');
let code = fs.readFileSync(filePath, 'utf8');

// Replace all alerts with throw new Error
code = code.replace(/alert\((['"`])(.*?)\1\);/g, 'throw new Error($1$2$1);');

// Remove the confirm block in deleteWarehouseAndContents
code = code.replace(/const confirmation = confirm\([\s\S]*?\);\s*if \(!confirmation\) {\s*return false;\s*}/, '');

// Remove the confirm block in deleteGroup
code = code.replace(/if \(!confirm\("האם אתה בטוח שברצונך למחוק את הקבוצה[\s\S]*?"\)\) {\s*return false;\s*}/, '');

fs.writeFileSync(filePath, code);
console.log('Successfully removed native alerts and confirms from firebaseUtils.ts');
