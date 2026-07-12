const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(__dirname, '..', 'src');

function makeShaderInteractive(dir) {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.html')) {
            let content = fs.readFileSync(path.join(dir, file), 'utf8');
            
            // We need to replace the standard shader mouse/render logic:
            // Find: let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
            // Down to: requestAnimationFrame(render);
            
            const regex = /let mouse = \{ x: canvas\.width \/ 2, y: canvas\.height \/ 2 \};\s*window\.addEventListener\('mousemove'[\s\S]*?requestAnimationFrame\(render\);\s*\}/g;
            
            const replacement = `let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    let lastMouseX = -1;
    let lastMouseY = -1;
    let virtualTime = 0;
    let targetTime = 0;

    window.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        const nx = (event.clientX - rect.left) / rect.width;
        const ny = 1.0 - (event.clientY - rect.top) / rect.height;
        mouse.x = nx * canvas.width;
        mouse.y = ny * canvas.height;
        
        if (lastMouseX !== -1) {
            const dx = event.clientX - lastMouseX;
            const dy = event.clientY - lastMouseY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            targetTime += dist * 0.002; // Speed multiplier for mouse movement
        }
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
      }
    });

    function render(t) {
      if (typeof ResizeObserver === 'undefined') syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      
      // Smoothly catch up to mouse-driven time, plus a VERY slow idle animation
      targetTime += 0.0005; // Idle speed
      virtualTime += (targetTime - virtualTime) * 0.05; // Smoothing factor
      
      if (uTime) gl.uniform1f(uTime, virtualTime);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    }`;

            content = content.replace(regex, replacement);
            fs.writeFileSync(path.join(dir, file), content);
            console.log(`Updated shader interactivity in ${file}`);
        }
    });
}

makeShaderInteractive(rootDir);
makeShaderInteractive(srcDir);
