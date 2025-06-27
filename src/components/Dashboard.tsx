"use client"
import React from 'react';
import Header from '@/components/Header';
import FactoryFloor from '@/components/FactoryFloor';
import WarehouseDisplay from '@/components/WarehouseDisplay';
import ControlPanel from '@/components/ControlPanel';

export default function Dashboard() {
    return (
        <div className="bg-background min-h-screen font-body">
            <Header />
            <main className="container mx-auto p-4 md:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                    <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                        <FactoryFloor />
                        <WarehouseDisplay />
                    </div>
                    <div className="lg:col-span-1">
                        <ControlPanel />
                    </div>
                </div>
            </main>
        </div>
    );
}
