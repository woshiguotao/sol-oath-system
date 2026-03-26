'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Activity, CheckCircle, XCircle, ChevronRight, PlusCircle, LayoutList } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const WalletMultiButton = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

export interface PledgeRecord {
    id: string;
    goal: string;
    amount: string;
    status: 'active' | 'success' | 'failed';
    timestamp: number;
    txHash?: string;
}

export default function DashboardList() {
    const { publicKey } = useWallet();
    const [mounted, setMounted] = useState(false);
    const [pledges, setPledges] = useState<PledgeRecord[]>([]);

    useEffect(() => {
        setMounted(true);
        // Load pledges from mock database
        const stored = localStorage.getItem('cyber_pledges');
        if (stored) {
            setPledges(JSON.parse(stored));
        } else {
            // Seed mock data for hackathon visual
            const mockData: PledgeRecord[] = [
                { id: 'mock-1', goal: "连续一周每天读书两小时", amount: "1.5", status: "failed", timestamp: Date.now() - 86400000 },
                { id: 'mock-2', goal: "完全戒烟一个月", amount: "5.0", status: "active", timestamp: Date.now() - 3600000 },
                { id: 'mock-3', goal: "完成星光秀黑客松代码", amount: "2.5", status: "success", timestamp: Date.now() - 7200000 }
            ];
            setPledges(mockData);
            localStorage.setItem('cyber_pledges', JSON.stringify(mockData));
        }
    }, []);

    const activeCount = pledges.filter(p => p.status === 'active').length;
    const burnedTotal = pledges.filter(p => p.status === 'failed').reduce((acc, curr) => acc + Number(curr.amount), 0);

    return (
        <main className="relative min-h-screen pb-20 overflow-x-hidden font-sans bg-neutral-950">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-[60vw] h-[60vw] bg-red-900/10 rounded-full blur-[150px] pointer-events-none"></div>

            <nav className="relative z-10 w-full flex justify-between items-center py-5 px-8 border-b border-red-900/30 bg-neutral-950/80 backdrop-blur-xl">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
                    <h1 className="text-2xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">
                        赛博判官
                    </h1>
                </Link>
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-2 text-neutral-300 font-bold hover:text-red-400 transition-colors uppercase tracking-widest text-sm">
                        <PlusCircle className="w-5 h-5" /> 建立新誓言
                    </Link>
                    <WalletMultiButton className="!bg-red-600 hover:!bg-red-700 !rounded-none !font-bold uppercase !tracking-wide transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]" />
                </div>
            </nav>

            <div className="relative z-10 max-w-5xl mx-auto mt-12 px-4">
                
                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                     <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl backdrop-blur">
                        <h4 className="text-neutral-500 text-xs font-black uppercase tracking-widest mb-2">等待验证执行的任务数</h4>
                        <div className="text-4xl font-black text-white">{activeCount}</div>
                    </div>
                    <div className="bg-red-950/20 border border-red-900/30 p-6 rounded-xl backdrop-blur">
                        <h4 className="text-red-500/80 text-xs font-black uppercase tracking-widest mb-2">已被 AI 焚毁的残酷罚金</h4>
                        <div className="text-4xl font-black text-red-500">{burnedTotal.toFixed(1)} <span className="text-lg">SOL</span></div>
                    </div>
                     <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl backdrop-blur opacity-50 flex flex-col justify-center items-center">
                        <LayoutList className="w-8 h-8 text-neutral-600 mb-2" />
                        <span className="text-xs font-black uppercase tracking-widest text-neutral-500">赛博契约图鉴大厅</span>
                    </div>
                </div>

                <h3 className="text-xl font-black uppercase tracking-widest text-neutral-100 flex items-center gap-3 mb-8">
                    <Activity className="text-red-500" />
                    链上锁仓誓言记录
                </h3>

                {/* List Body */}
                <div className="space-y-4">
                    <AnimatePresence>
                        {pledges.map((pledge, index) => (
                            <motion.div 
                                key={pledge.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`relative overflow-hidden border rounded-xl p-6 transition-all group ${
                                    pledge.status === 'active' ? 'bg-neutral-900 border-neutral-700 hover:border-red-500/60' :
                                    pledge.status === 'failed' ? 'bg-red-950/10 border-red-900/50 opacity-80' : 
                                    'bg-emerald-950/10 border-emerald-900/50 opacity-80'
                                }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-3">
                                            {pledge.status === 'active' && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
                                            {pledge.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                                            {pledge.status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                                                {new Date(pledge.timestamp).toLocaleDateString()}
                                            </span>
                                            <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                                                pledge.status === 'active' ? 'border-red-500/50 text-red-400 bg-red-500/10' :
                                                pledge.status === 'failed' ? 'border-red-900 text-red-600 bg-red-950' : 
                                                'border-emerald-900 text-emerald-600 bg-emerald-950'
                                            }`}>
                                                {pledge.status === 'active' ? '进行中，等待 AI 断案' : pledge.status === 'failed' ? '目标失败·资金已销毁' : '复核通过·原路退款'}
                                            </span>
                                        </div>
                                        <h4 className={`text-xl font-bold ${pledge.status !== 'active' ? 'line-through text-neutral-500' : 'text-neutral-100'}`}>
                                            "{pledge.goal}"
                                        </h4>
                                        {pledge.txHash && (
                                            <a href={`https://explorer.solana.com/tx/${pledge.txHash}?cluster=devnet`} target="_blank" rel="noreferrer" className="text-xs font-mono text-neutral-500 hover:text-red-400 break-all transition-colors inline-block mt-1">
                                                链上凭证 Hash: {pledge.txHash.slice(0, 16)}...{pledge.txHash.slice(-8)}
                                            </a>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-8 border-t md:border-t-0 border-neutral-800 pt-4 md:pt-0">
                                        <div className="text-right flex flex-col items-end">
                                            <span className="text-xs font-bold uppercase tracking-widest text-neutral-600 mb-1">冻结押金</span>
                                            <div className={`font-mono font-black text-2xl ${
                                                pledge.status === 'active' ? 'text-orange-400' : 
                                                pledge.status === 'failed' ? 'text-red-700' : 'text-emerald-700'
                                            }`}>
                                                {pledge.amount} <span className="text-sm">SOL</span>
                                            </div>
                                        </div>

                                        {pledge.status === 'active' ? (
                                            <Link href={`/verify?id=${pledge.id}`} className="bg-red-600/10 border border-red-500 text-red-400 hover:bg-red-600 hover:text-white px-6 py-3 rounded-lg font-black uppercase tracking-widest text-sm transition-all flex items-center gap-2">
                                                进入取证室 <ChevronRight className="w-4 h-4" />
                                            </Link>
                                        ) : (
                                            <button disabled className="bg-neutral-900/50 border border-neutral-800 text-neutral-600 px-6 py-3 rounded-lg font-black uppercase tracking-widest text-sm cursor-not-allowed">
                                                合约已盖棺
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                
                {pledges.length === 0 && (
                    <div className="text-center py-20 border border-neutral-800 border-dashed rounded-2xl bg-neutral-900/20">
                        <p className="text-neutral-500 font-black tracking-widest uppercase mb-4">大厅空空如也，还不敢开启首次挑战吗？</p>
                        <Link href="/" className="inline-block bg-neutral-800 hover:bg-neutral-700 text-white font-bold tracking-widest uppercase px-8 py-3 rounded text-sm transition-colors">
                            创建我的死手契约
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}
