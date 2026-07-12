import { defineConfig } from 'vite';
import { resolve } from 'path';

// Multi-page app: every HTML file is its own entry point
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main:      resolve(__dirname, 'index.html'),
        login:     resolve(__dirname, 'src/login.html'),
        dashboard: resolve(__dirname, 'src/dashboard.html'),
        customers: resolve(__dirname, 'src/customers.html'),
        devices:   resolve(__dirname, 'src/devices.html'),
        kanban:    resolve(__dirname, 'src/kanban.html'),
        newTicket: resolve(__dirname, 'src/new-ticket.html'),
        profile:   resolve(__dirname, 'src/profile.html'),
        qrScanner: resolve(__dirname, 'src/qr-scanner.html'),
        settings:  resolve(__dirname, 'src/settings.html'),
      },
    },
  },
});
