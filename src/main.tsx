import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthGate} from './AuthGate';
import 'leaflet/dist/leaflet.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>,
);
