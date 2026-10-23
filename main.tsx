import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Daylight from './app/daylight-v2';
createRoot(document.getElementById('root')!).render(<StrictMode><Daylight /></StrictMode>);
