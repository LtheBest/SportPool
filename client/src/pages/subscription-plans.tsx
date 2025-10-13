// TeamMove - Page des plans d'abonnements (moderne)
import React from 'react';
import SubscriptionManager from '@/components/subscription/SubscriptionManager';

export default function SubscriptionPlansPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <SubscriptionManager />
      </div>
    </div>
  );
}