import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import localforage from 'localforage'

import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { DialogProvider } from './context/DialogContext'

// Importamos el test de diagnóstico (opcional)
import { runExhaustiveConnectionTest } from './utils/connectionDiagnostic'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7, // 1 week
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

const asyncStoragePersister = createAsyncStoragePersister({
  storage: localforage,
})

// El test de diagnóstico manual se invoca con F9
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F9') {
      console.log('🚀 Lanzando test de diagnóstico (F9 detectado)...');
      runExhaustiveConnectionTest();
    }
  });
}

import { ClientAuthProvider } from './context/ClientAuthContext'

createRoot(document.getElementById('root')!).render(
  <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
    <BrowserRouter>
      <AuthProvider>
        <ClientAuthProvider>
          <DialogProvider>
            <App />
          </DialogProvider>
        </ClientAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </PersistQueryClientProvider>
)