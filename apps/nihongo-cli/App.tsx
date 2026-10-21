import React from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
// Apollo Client v4 chuyển ApolloProvider (và mọi hook React) sang '@apollo/client/react'
import {ApolloProvider} from '@apollo/client/react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {gqlClient} from './src/api/graphqlClient';
import {useStartupSync} from './src/hooks/useOfflineVocab';
import RootNavigator from './src/navigation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      networkMode: 'offlineFirst',
    },
  },
});

function AppInner() {
  useStartupSync(); // sync vocab + flush SRS queue khi có mạng
  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <ApolloProvider client={gqlClient}>
          <QueryClientProvider client={queryClient}>
            <AppInner />
          </QueryClientProvider>
        </ApolloProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
