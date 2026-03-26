'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, UploadCloud, Skull, Fingerprint, LayoutList, CheckCircle } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const WalletMultiButton = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

function VerifyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pledgeId = searchParams.get('id');

    const { connected } = useWallet();
    const [file, setFile] = useState<File | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verdict, setVerdict] = useState<'pending' | 'success' | 'failed' | null>(null);
    const [x402Status, setX402Status] = useState<'idle' | 'required' | 'paying' | 'paid'>('idle');

    const [mounted, setMounted] = useState(false);
    const [pledgeData, setPledgeData] = useState<{ goal: string, amount: string } | null>(null);

    useEffect(() => { 
        setMounted(true); 
        if (pledgeId) {
            const stored = JSON.parse(localStorage.getItem('cyber_pledges') || '[]');
            const found = stored.find((p: any) => p.id === pledgeId);
            if (found) {
                setPledgeData({ goal: found.goal, amount: found.amount });
                if (found.status !== 'active') {
                    setVerdict(found.status); // 如果已经有了状态就直接展示结果，跳过取证
                }
            }
        }
    }, [pledgeId]);

    const requestVerification = async () => {
        if (!file) return alert("您必须上传照片作为打卡证据！");
        setX402Status('required');
    };

    const handleX402Payment = async () => {
        setX402Status('paying');
        try {
            await new Promise((r) => setTimeout(r, 2500));
            setX402Status('paid');
            
            setIsVerifying(true);
            await new Promise((r) => setTimeout(r, 3500));
            
            // 为了黑客松视觉冲击的 Demo 效果，强制设为 failed 以触发燃烧
            const finalVerdict = 'failed';
            setVerdict(finalVerdict);

            // 更新 DB (LocalStorage)
            if (pledgeId) {
                const stored = JSON.parse(localStorage.getItem('cyber_pledges') || '[]');
                const updated = stored.map((p: any) => p.id === pledgeId ? { ...p, status: finalVerdict } : p);
                localStorage.setItem('cyber_pledges', JSON.stringify(updated));
            }
        } catch (e) {
            console.error(e);
            setX402Status('required');
        } finally {
            setIsVerifying(false);
        }
    };

    if (mounted && !pledgeData && !pledgeId) {
        return <div className="min-h-screen flex items-center justify-center text-white bg-neutral-950 font-black uppercase tracking-widest">参数缺失，无法定位誓言。</div>;
    }

    return (
        <main className="relative min-h-screen pb-20 overflow-hidden font-sans bg-neutral-950">
            <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
                <Image src="/cyber_judge.png" alt="Cyberpunk Background" fill className="object-cover mix-blend-luminosity" priority />
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/40 via-neutral-950/80 to-neutral-950"></div>
            </div>

            <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-red-600/10 rounded-full blur-[140px] pointer-events-none"></div>

            {/* Navigation Header */}
            <nav className="relative z-10 w-full flex justify-between items-center py-5 px-8 border-b border-red-900/30 bg-neutral-950/80 backdrop-blur-xl">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
                    <h1 className="text-2xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">
                        赛博法庭引擎
                    </h1>
                </Link>
                <div className="flex items-center gap-6">
                    <Link href="/list" className="flex items-center gap-2 text-neutral-300 font-bold hover:text-red-400 transition-colors uppercase tracking-widest text-sm">
                        <LayoutList className="w-5 h-5" /> 我的誓言大厅
                    </Link>
                    <WalletMultiButton className="!bg-red-600 hover:!bg-red-700 !rounded-none !font-bold uppercase !tracking-wide transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]" />
                </div>
            </nav>

            <div className="relative z-10 max-w-4xl mx-auto mt-16 px-4">
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-b from-red-600 to-orange-600 opacity-20 blur-xl rounded-2xl"></div>
                    <div className="relative border border-red-900/50 bg-neutral-950/90 backdrop-blur-2xl p-8 lg:p-12 rounded-2xl shadow-[0_0_60px_rgba(220,38,38,0.15)]">
                        <div className="space-y-8">
                            
                            <div className="space-y-4 border-b border-neutral-800 pb-8 text-center">
                                <h3 className="text-4xl font-black uppercase tracking-tight flex items-center justify-center gap-3 text-neutral-100">
                                    <Skull className="w-10 h-10 text-red-500" />
                                    阶段二：取证与不可逆裁决
                                </h3>
                                <p className="text-lg text-neutral-400 font-medium leading-relaxed">
                                    该誓言档案内的 <span className="text-orange-400 font-bold font-mono">{pledgeData?.amount} SOL</span> 筹码智能合约已被锁定。<br/>您必须证明达成了以下宏伟目标：<br/>
                                    <span className="text-red-400 font-bold text-xl block mt-4 p-4 bg-red-950/30 rounded-xl border border-red-900/50">"{pledgeData?.goal || '识别中...'}"</span>
                                </p>
                            </div>

                            {verdict !== 'success' && verdict !== 'failed' ? (
                                <div className="space-y-6 max-w-2xl mx-auto">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-neutral-500 text-center">向智能体网络呈交您的直接视觉照片记录</h3>
                                    <div className="border-2 border-dashed border-neutral-800 hover:border-red-500/50 rounded-xl p-10 text-center transition-all cursor-pointer bg-neutral-900/40 group">
                                        <input type="file" className="hidden" id="proof-upload" onChange={(e) => setFile(e.target.files?.[0] || null)} accept="image/*" />
                                        <label htmlFor="proof-upload" className="cursor-pointer flex flex-col items-center gap-5">
                                            <UploadCloud className="w-12 h-12 text-neutral-600 group-hover:text-red-400 transition-colors" />
                                            <span className="text-base text-neutral-300 font-medium">
                                                {file ? file.name : "点击或拖拽上传未修饰的现场证明文件"}
                                            </span>
                                        </label>
                                    </div>
                                    <button 
                                        onClick={requestVerification}
                                        disabled={!file || isVerifying || (mounted && !connected) || (x402Status === 'paid')}
                                        className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-black uppercase tracking-widest py-5 rounded-xl transition-all text-base disabled:opacity-40"
                                    >
                                        {isVerifying ? "大模型判官节点正在交叉解析高精度维度..." : x402Status === 'paid' ? "x402 结算授权完毕，正在传导至终端法庭..." : "唤醒多模态 AI 执行绝对制裁扫描"}
                                    </button>
                                </div>
                            ) : null}
                            
                            {/* x402 M2M Payment Required Alert Layer */}
                            <AnimatePresence>
                                {x402Status === 'required' || x402Status === 'paying' ? (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-orange-950/50 border border-orange-500/50 rounded-xl p-8 mt-4 relative overflow-hidden max-w-2xl mx-auto shadow-inner">
                                        <motion.div animate={{ top: ["-10%", "110%"] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="absolute left-0 right-0 h-[2px] bg-orange-500/50 z-0 pointer-events-none"></motion.div>
                                        <div className="relative z-10 flex flex-col items-center gap-4">
                                            <Fingerprint className="w-10 h-10 text-orange-400 animate-pulse" />
                                            <h4 className="text-orange-400 font-black uppercase tracking-widest text-lg text-center leading-tight">
                                                HTTP 402 Payment Required<br/>(AI Agent M2M 网关拦截)
                                            </h4>
                                            <p className="text-sm text-orange-200/80 text-center max-w-[350px]">
                                                开始触发 Web3 取证逻辑。根据 x402 协议，召唤全知大模型 Agent 进行高额视觉运算矩阵投射，需向该节点支付极细微代币以补偿算力磨损。
                                            </p>
                                            <button onClick={handleX402Payment} disabled={x402Status === 'paying'} className="mt-4 bg-orange-600 hover:bg-orange-500 text-white w-full py-4 rounded-lg uppercase font-bold tracking-widest text-sm transition-colors">
                                                {x402Status === 'paying' ? '底层协议正在构造 x402 授权微交易报文...' : '立刻支付 0.001 SOL 打通算力验证门禁'}
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : null}
                            </AnimatePresence>

                            {/* Verdict Results Layer */}
                            <AnimatePresence>
                                {verdict === 'failed' && (
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 rounded-xl text-center font-black tracking-widest uppercase border-2 bg-red-950/60 border-red-500 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)] max-w-2xl mx-auto mt-8 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[url('/cyber_hatch.png')] opacity-10 mix-blend-overlay"></div>
                                        <div className="relative z-10 flex flex-col items-center gap-3">
                                            <Skull className="w-12 h-12 animate-bounce" />
                                            <span className="text-lg">✖ 绝对裁决：毫无干劲的劣质谎言！</span>
                                            <span className="text-sm font-medium mt-2 text-red-200/80">超高优惩戒指令已被系统底层广播至 Solana 节点网络！<br/>您此番立誓所锁定的所有数字资产已被智能合约粉碎殆尽！</span>
                                            <Link href="/list" className="mt-4 inline-block px-6 py-2 border border-red-500/50 hover:bg-red-500/20 rounded font-bold text-xs tracking-widest text-red-400">返回大厅查看尸骸</Link>
                                        </div>
                                    </motion.div>
                                )}
                                {verdict === 'success' && (
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 rounded-xl text-center font-black tracking-widest uppercase border-2 bg-emerald-950/60 border-emerald-500 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] max-w-2xl mx-auto mt-8 relative overflow-hidden">
                                        <div className="relative z-10 flex flex-col items-center gap-3">
                                            <CheckCircle className="w-12 h-12 animate-pulse" />
                                            <span className="text-lg">✔ 验证通过：不可思议的突破！</span>
                                            <span className="text-sm font-medium mt-2 text-emerald-200/80">系统解除限制，锁定的资金已安全平稳返回至原账户。</span>
                                            <Link href="/list" className="mt-4 inline-block px-6 py-2 border border-emerald-500/50 hover:bg-emerald-500/20 rounded font-bold text-xs tracking-widest text-emerald-400">返回誓言大厅</Link>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                        </div>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}

export default function Verify() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-neutral-950 text-red-500 flex items-center justify-center font-black tracking-widest uppercase text-xl animate-pulse">Initializing Cyber Protocol Database Link...</div>}>
            <VerifyContent />
        </Suspense>
    );
}
