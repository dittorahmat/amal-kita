import { useEffect, useLayoutEffect } from 'react';

// useLayoutEffect causes warnings during server-side rendering
// This hook uses useLayoutEffect during client-side rendering and useEffect during server-side rendering
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' && typeof window.document !== 'undefined'
    ? useLayoutEffect
    : useEffect;