
import React from 'react';
import InterfaceRouter from '@/components/interfaces/InterfaceRouter';

export default function Layout({ children, currentPageName }) {
  return (
    <InterfaceRouter currentPageName={currentPageName}>
      {children}
    </InterfaceRouter>
  );
}
