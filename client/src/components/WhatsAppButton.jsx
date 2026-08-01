import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import './WhatsAppButton.css';

export default function WhatsAppButton() {
  const [number, setNumber] = useState('919923267780');

  useEffect(() => {
    api.get('/settings').then((d) => {
      if (d.settings?.whatsapp_number) setNumber(d.settings.whatsapp_number.replace(/\D/g, ''));
    }).catch(() => {});
  }, []);

  const message = encodeURIComponent('Hello Dhaage Designer! I would like to know more about your premium menswear collection.');
  const href = `https://wa.me/${number}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="wa-float"
      aria-label="Chat on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      <svg viewBox="0 0 32 32" width="30" height="30" fill="#fff">
        <path d="M16.004 3C8.828 3 3 8.828 3 16.004c0 2.293.6 4.533 1.737 6.508L3 29l6.657-1.704A12.94 12.94 0 0 0 16.004 29C23.18 29 29 23.172 29 16.004 29 8.828 23.18 3 16.004 3zm0 23.605a10.6 10.6 0 0 1-5.423-1.485l-.389-.23-3.952 1.012 1.044-3.85-.255-.398A10.59 10.59 0 0 1 5.395 16c0-5.85 4.76-10.61 10.61-10.61 5.848 0 10.607 4.76 10.607 10.61 0 5.848-4.76 10.605-10.608 10.605zm5.82-7.933c-.318-.16-1.884-.93-2.176-1.036-.292-.107-.505-.16-.718.16-.213.32-.826 1.036-1.012 1.249-.186.213-.372.24-.69.08-.318-.16-1.344-.495-2.56-1.58-.946-.846-1.585-1.89-1.771-2.21-.186-.32-.02-.492.14-.652.143-.143.318-.373.478-.56.16-.186.213-.32.32-.532.106-.213.053-.4-.027-.56-.08-.16-.718-1.73-.984-2.37-.26-.62-.524-.536-.718-.546l-.61-.012c-.213 0-.558.08-.85.4-.293.32-1.117 1.092-1.117 2.663 0 1.571 1.144 3.089 1.304 3.303.16.213 2.253 3.44 5.459 4.823.763.33 1.358.527 1.823.674.766.243 1.463.209 2.014.127.614-.092 1.884-.77 2.15-1.514.265-.744.265-1.381.186-1.514-.08-.133-.292-.213-.61-.373z"/>
      </svg>
      <span className="wa-tooltip">Chat with us</span>
    </a>
  );
}

