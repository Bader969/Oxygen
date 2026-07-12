const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(__dirname, '..', 'src');

const indexContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const shaderStartIdx = indexContent.indexOf('<!-- STITCH_SHADER_START');
const shaderEndMarker = '<!-- STITCH_SHADER_END:ANIMATION_4 -->';
const shaderEndIdx = indexContent.indexOf(shaderEndMarker, shaderStartIdx) + shaderEndMarker.length;

if (shaderStartIdx === -1 || shaderEndIdx === -1) {
    console.error('Could not find shader block in index.html');
    process.exit(1);
}

const shaderBlock = indexContent.substring(shaderStartIdx, shaderEndIdx);

function injectShader(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            const filePath = path.join(dir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            if (!content.includes('STITCH_SHADER_START')) {
                const foucScriptIdx = content.indexOf('</script>', content.indexOf('sidebarState'));
                if (foucScriptIdx !== -1) {
                    const insertPos = foucScriptIdx + '</script>'.length;
                    content = content.substring(0, insertPos) + '\n' + shaderBlock + '\n' + content.substring(insertPos);
                    fs.writeFileSync(filePath, content);
                    console.log(`Injected shader into ${file}`);
                } else {
                    const bodyIdx = content.indexOf('<body');
                    const bodyCloseIdx = content.indexOf('>', bodyIdx) + 1;
                    content = content.substring(0, bodyCloseIdx) + '\n' + shaderBlock + '\n' + content.substring(bodyCloseIdx);
                    fs.writeFileSync(filePath, content);
                    console.log(`Injected shader into ${file} (after body)`);
                }
            }
        }
    });
}

injectShader(rootDir);
injectShader(srcDir);
