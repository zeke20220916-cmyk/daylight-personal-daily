import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Daylight from './app/daylight';
import './app/globals.css';

createRoot(document.getElementById('root')!).render(<StrictMode><Daylight /></StrictMode>);
