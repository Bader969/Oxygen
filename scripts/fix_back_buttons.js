const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

fs.readdirSync(srcDir).forEach(file => {
    if (file.endsWith('.html')) {
        let content = fs.readFileSync(path.join(srcDir, file), 'utf8');
        // If the arrow_back is inside a button, change the button to an anchor tag
        content = content.replace(
            /<button([^>]*)>\s*<span([^>]*)>arrow_back<\/span>\s*<\/button>/g,
            '<a href="/index.html" $1><span $2>arrow_back</span></a>'
        );
        fs.writeFileSync(path.join(srcDir, file), content);
    }
});
console.log('Fixed back buttons');
