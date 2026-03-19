import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export function useRefreshOnFocus(refetch: () => void | Promise<unknown>) {
  const firstMount = useRef(true);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') {
        if (firstMount.current) {
          firstMount.current = false;
          return;
        }

        void refetch();
      }
    });

    return () => subscription.remove();
  }, [refetch]);
}
