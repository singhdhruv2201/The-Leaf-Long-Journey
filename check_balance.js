const fs = require('fs');
const s = fs.readFileSync('main.js', 'utf8');
let braces=0, parens=0, brackets=0;
for (let i=0;i<s.length;i++){
  const c = s[i];
  if (c==='{') braces++;
  if (c==='}') braces--;
  if (c==='(') parens++;
  if (c===')') parens--;
  if (c==='[') brackets++;
  if (c===']') brackets--;
}
console.log('balance: braces',braces,'parens',parens,'brackets',brackets);
// print context near end
const lines = s.split(/\n/);
for (let i=Math.max(0, lines.length-40); i<lines.length; i++){
  console.log((i+1).toString().padStart(4,' ')+': '+lines[i]);
}
